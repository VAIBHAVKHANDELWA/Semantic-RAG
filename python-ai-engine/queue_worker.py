import json
import logging
import time
import threading
import pika
from config import settings
from services.storage_service import storage_service
from services.ai_service import ai_service
from services.db_service import db_service

logger = logging.getLogger("python-ai-engine.worker")


class RabbitMQWorker:
    def __init__(self):
        self.url = settings.RABBITMQ_URL
        self.queue_name = settings.RABBITMQ_QUEUE
        self.telemetry_queue = "telemetry-queue"
        self.dlx_name = "raw-document-dlx"
        self.dlq_name = "raw-document-dlq"
        self.should_stop = False
        self.connection = None
        self.channel = None

    def publish_telemetry(self, status: str, tenant_id: str, job_id: str, progress_percentage: int, message: str):
        """Emits telemetry events into telemetry-queue matching Java TelemetryEvent shape."""
        if not self.channel or not self.channel.is_open:
            return
        try:
            msg = json.dumps({
                "jobId": job_id,
                "tenantId": tenant_id if tenant_id else "GLOBAL",
                "status": status,
                "progressPercentage": progress_percentage,
                "message": message,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S")
            })
            self.channel.basic_publish(
                exchange="",
                routing_key=self.telemetry_queue,
                body=msg,
                properties=pika.BasicProperties(delivery_mode=2)
            )
        except Exception as e:
            logger.warning(f"Failed to publish telemetry event [{status}]: {e}")

    def start_listening(self):
        """
        Connects to RabbitMQ with proper DLX / DLQ bindings and consumer QoS backpressure.
        """
        while not self.should_stop:
            try:
                logger.info(f"Connecting to RabbitMQ broker at [{self.url}]...")
                parameters = pika.URLParameters(self.url)
                self.connection = pika.BlockingConnection(parameters)
                self.channel = self.connection.channel()

                # 1. Dead Letter Exchange & Queue
                self.channel.exchange_declare(exchange=self.dlx_name, exchange_type="direct", durable=True)
                self.channel.queue_declare(queue=self.dlq_name, durable=True)
                self.channel.queue_bind(queue=self.dlq_name, exchange=self.dlx_name, routing_key=self.dlq_name)

                # 2. Main Ingestion Queue with DLX arguments
                self.channel.queue_declare(
                    queue=self.queue_name,
                    durable=True,
                    arguments={
                        "x-dead-letter-exchange": self.dlx_name,
                        "x-dead-letter-routing-key": self.dlq_name
                    }
                )

                # 3. Telemetry Queue
                self.channel.queue_declare(queue=self.telemetry_queue, durable=True)

                # BACKPRESSURE LIMIT: Pre-fetch maximum 5 messages concurrently
                self.channel.basic_qos(prefetch_count=5)

                self.channel.basic_consume(
                    queue=self.queue_name,
                    on_message_callback=self._process_message
                )

                logger.info(f"RabbitMQ Worker listening on [{self.queue_name}] with DLX [{self.dlx_name}] (QoS: 5)")
                self.channel.start_consuming()

            except pika.exceptions.AMQPConnectionError as e:
                if self.should_stop:
                    break
                logger.warning(f"RabbitMQ connection lost/failed ({str(e)}). Retrying connection in 5 seconds...")
                time.sleep(5)
            except Exception as e:
                if self.should_stop:
                    break
                logger.error(f"Unexpected error in RabbitMQ worker loop: {str(e)}", exc_info=True)
                time.sleep(5)

    def _process_message(self, ch, method, properties, body):
        """
        Processes an incoming ingestion payload from Java Gateway.
        Payload format: { "jobId": "...", "tenantId": "...", "objectKey": "..." }
        """
        delivery_tag = method.delivery_tag

        # Check death count for retry cap (DLQ after configurable max retries, default 3)
        death_count = 0
        if properties and properties.headers and 'x-death' in properties.headers:
            death_count = len(properties.headers['x-death'])

        max_retries = getattr(settings, "MAX_RETRIES", 3)
        if death_count >= max_retries:
            logger.error(f"Job exceeded {max_retries} retry attempts (x-death={death_count}). Moving to DLQ: {body}")
            if db_service.redis_client:
                try:
                    db_service.redis_client.incr("metrics:dlq_total")
                except Exception:
                    pass
            try:
                raw_payload = json.loads(body.decode("utf-8"))
                if isinstance(raw_payload, str):
                    raw_payload = json.loads(raw_payload)
                j_id = raw_payload.get("jobId")
                t_id = raw_payload.get("tenantId", "GLOBAL")
                if j_id:
                    db_service.update_job_counters(
                        job_id=j_id, chunk_total=0, chunks_committed=0, chunks_quarantined=0,
                        status="FAILED_DLQ", error=f"Exceeded {max_retries} attempts (x-death={death_count})"
                    )
                    self.publish_telemetry("DLQ", t_id, j_id, 100, f"Dead-lettered after {death_count} attempts")
            except Exception:
                pass
            ch.basic_nack(delivery_tag=delivery_tag, requeue=False)
            return

        job_id = None
        tenant_id = None
        try:
            raw_decoded = body.decode("utf-8")
            payload = json.loads(raw_decoded)
            if isinstance(payload, str):
                payload = json.loads(payload)
            job_id = payload.get("jobId", f"job-{int(time.time())}")
            tenant_id = payload.get("tenantId")
            object_key = payload.get("objectKey")

            if not tenant_id or tenant_id.upper() in ("GLOBAL", "ALL"):
                logger.error(f"Rejecting payload without valid tenantId: {payload}")
                ch.basic_nack(delivery_tag=delivery_tag, requeue=False)
                return

            if not object_key:
                logger.error(f"Invalid message payload: missing 'objectKey'. Payload: {payload}")
                ch.basic_nack(delivery_tag=delivery_tag, requeue=False)
                return

            doc_name = object_key.split("/")[-1]
            logger.info(f"Received Ingestion Job [{job_id}] for Tenant [{tenant_id}] - Key: [{object_key}]")

            # Telemetry: Ingestion started
            self.publish_telemetry("PROCESSING", tenant_id, job_id, 10, f"Extracting text from {object_key}")

            # Step 1: Download & Extract Document Content via Apache Tika with Latency Tracking
            try:
                raw_text, latency_ms = storage_service.download_and_extract(object_key)
            except Exception as extract_err:
                logger.error(f"Failed extraction or corrupt file [{object_key}]: {extract_err}")
                conflict_id = db_service.quarantine_corrupt_or_empty_document(
                    job_id=job_id,
                    tenant_id=tenant_id,
                    doc_name=doc_name,
                    reason=f"Failed extraction / corrupt file: {str(extract_err)[:500]}",
                    verdict_type="CORRUPT_FILE"
                )
                self.publish_telemetry("QUARANTINED", tenant_id, job_id, 100,
                    f"Corrupt or unreadable document quarantined ({conflict_id})"
                )
                ch.basic_ack(delivery_tag=delivery_tag)
                return

            # Record extraction latency in Redis metrics
            if db_service.redis_client:
                try:
                    db_service.redis_client.set("metrics:last_extraction_latency_ms", round(latency_ms, 2))
                    db_service.redis_client.lpush("metrics:extraction_latencies", round(latency_ms, 2))
                    db_service.redis_client.ltrim("metrics:extraction_latencies", 0, 99)
                except Exception:
                    pass

            if not raw_text or not raw_text.strip():
                logger.warning(f"File [{object_key}] contained no extractable text. Quarantining as EMPTY_FILE.")
                conflict_id = db_service.quarantine_corrupt_or_empty_document(
                    job_id=job_id,
                    tenant_id=tenant_id,
                    doc_name=doc_name,
                    reason="Document contained 0 bytes of extractable text.",
                    verdict_type="EMPTY_FILE"
                )
                self.publish_telemetry("QUARANTINED", tenant_id, job_id, 100,
                    f"Empty document quarantined ({conflict_id})"
                )
                ch.basic_ack(delivery_tag=delivery_tag)
                return

            # Step 2: Semantic Chunking
            chunks = ai_service.chunk_text(raw_text)
            chunk_total = len(chunks)

            self.publish_telemetry("PROCESSING", tenant_id, job_id, 30, f"Generated {chunk_total} chunks, computing embeddings...")

            # Step 3: Vector Embeddings
            embeddings = ai_service.generate_embeddings(chunks)

            # Step 4: PgVector Collision Search & Routing
            quarantine_count = 0
            committed_count = 0

            for idx, (chunk_text, embedding_vec) in enumerate(zip(chunks, embeddings)):
                result = db_service.search_and_route_chunk(
                    job_id=job_id,
                    tenant_id=tenant_id,
                    doc_name=doc_name,
                    chunk_text=chunk_text,
                    embedding=embedding_vec,
                    chunk_index=idx
                )
                if result.get("status") == "QUARANTINED":
                    quarantine_count += 1
                    self.publish_telemetry("CONFLICT_DETECTED", tenant_id, job_id, 50 + int((idx+1)/chunk_total * 40),
                        f"Conflict detected for chunk {idx+1}/{chunk_total} with {result.get('verdict')} (similarity: {result.get('similarity'):.2f})"
                    )
                elif result.get("status") in ("COMMITTED", "ALREADY_COMMITTED"):
                    committed_count += 1

            # Update job status and counters in PostgreSQL
            db_service.update_job_counters(
                job_id=job_id,
                chunk_total=chunk_total,
                chunks_committed=committed_count,
                chunks_quarantined=quarantine_count,
                status="COMPLETED"
            )

            self.publish_telemetry("COMPLETED", tenant_id, job_id, 100,
                f"Job completed: {chunk_total} chunks processed ({committed_count} committed, {quarantine_count} quarantined)"
            )

            logger.info(
                f"Successfully completed Job [{job_id}]: {chunk_total} chunks "
                f"({committed_count} Committed, {quarantine_count} Quarantined)."
            )

            # Record processed metrics in Redis and invalidate query cache if new chunks committed
            if db_service.redis_client:
                try:
                    db_service.redis_client.incr("metrics:processed_total")
                    db_service.redis_client.incr(f"metrics:processed:{tenant_id}")
                    if committed_count > 0:
                        db_service.invalidate_tenant_query_cache(tenant_id)
                except Exception:
                    pass

            # Acknowledge ONLY after database operations and state persistence commit
            ch.basic_ack(delivery_tag=delivery_tag)

        except Exception as e:
            logger.error(f"Error processing RabbitMQ message: {str(e)}", exc_info=True)
            if job_id:
                try:
                    db_service.update_job_counters(job_id, chunk_total=0, chunks_committed=0, chunks_quarantined=0, status="FAILED", error=str(e)[:1000])
                except Exception:
                    pass
            # Requeue on failure so message can retry up to retry cap (3) then dead-letter
            ch.basic_nack(delivery_tag=delivery_tag, requeue=True)

    def stop(self):
        """Gracefully stops consuming and closes RabbitMQ channel and connection."""
        logger.info("Stopping RabbitMQ Worker gracefully...")
        self.should_stop = True
        if self.channel and self.channel.is_open:
            try:
                self.channel.stop_consuming()
            except Exception:
                pass
        if self.connection and self.connection.is_open:
            try:
                self.connection.close()
            except Exception:
                pass
        logger.info("RabbitMQ Worker stopped successfully.")


worker_instance = RabbitMQWorker()


def start_worker_thread():
    thread = threading.Thread(target=worker_instance.start_listening, daemon=True)
    thread.start()
    return worker_instance
