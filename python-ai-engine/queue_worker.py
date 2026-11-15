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

    def publish_telemetry(self, event_type: str, tenant_id: str, payload: dict):
        """Emits telemetry events into telemetry-queue consumed by Java SSE streamer."""
        if not self.channel or not self.channel.is_open:
            return
        try:
            msg = json.dumps({
                "eventType": event_type,
                "tenantId": tenant_id,
                "timestamp": int(time.time() * 1000),
                "data": payload
            })
            self.channel.basic_publish(
                exchange="",
                routing_key=self.telemetry_queue,
                body=msg,
                properties=pika.BasicProperties(delivery_mode=2)
            )
        except Exception as e:
            logger.warning(f"Failed to publish telemetry event [{event_type}]: {e}")

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

        # Check death count for retry cap (DLQ after 3 failed attempts)
        death_count = 0
        if properties and properties.headers and 'x-death' in properties.headers:
            death_count = len(properties.headers['x-death'])

        if death_count >= 3:
            logger.error(f"Job exceeded 3 retry attempts (x-death={death_count}). Sending directly to DLQ: {body}")
            ch.basic_nack(delivery_tag=delivery_tag, requeue=False)
            return

        job_id = None
        tenant_id = None
        try:
            payload = json.loads(body.decode("utf-8"))
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

            logger.info(f"Received Ingestion Job [{job_id}] for Tenant [{tenant_id}] - Key: [{object_key}]")

            # Telemetry: Ingestion started
            self.publish_telemetry("PROCESSING", tenant_id, {
                "jobId": job_id, "objectKey": object_key, "status": "EXTRACTING"
            })

            # Step 1: Download & Extract Document Content via Apache Tika
            raw_text = storage_service.download_and_extract_text(object_key)

            if not raw_text or not raw_text.strip():
                logger.warning(f"File [{object_key}] contained no extractable text. Marking job completed empty.")
                db_service.update_job_counters(job_id, chunk_total=0, chunks_committed=0, chunks_quarantined=0, status="COMPLETED")
                ch.basic_ack(delivery_tag=delivery_tag)
                return

            # Step 2: Semantic Chunking
            chunks = ai_service.chunk_text(raw_text)
            chunk_total = len(chunks)

            self.publish_telemetry("PROCESSING", tenant_id, {
                "jobId": job_id, "chunkTotal": chunk_total, "status": "EMBEDDING"
            })

            # Step 3: Vector Embeddings
            embeddings = ai_service.generate_embeddings(chunks)

            # Step 4: PgVector Collision Search & Routing
            doc_name = object_key.split("/")[-1]
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
                    self.publish_telemetry("CONFLICT_DETECTED", tenant_id, {
                        "jobId": job_id,
                        "conflictId": result.get("conflict_id"),
                        "similarity": result.get("similarity"),
                        "verdict": result.get("verdict"),
                        "docName": doc_name
                    })
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

            self.publish_telemetry("COMPLETED", tenant_id, {
                "jobId": job_id,
                "chunksTotal": chunk_total,
                "chunksCommitted": committed_count,
                "chunksQuarantined": quarantine_count
            })

            logger.info(
                f"Successfully completed Job [{job_id}]: {chunk_total} chunks "
                f"({committed_count} Committed, {quarantine_count} Quarantined)."
            )

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
