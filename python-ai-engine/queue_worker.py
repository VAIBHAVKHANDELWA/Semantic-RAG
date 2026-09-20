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
        self.should_stop = False
        self.connection = None
        self.channel = None

    def start_listening(self):
        """
        Connects to RabbitMQ and starts listening with prefetch backpressure control.
        """
        while not self.should_stop:
            try:
                logger.info(f"Connecting to RabbitMQ broker at [{self.url}]...")
                parameters = pika.URLParameters(self.url)
                self.connection = pika.BlockingConnection(parameters)
                self.channel = self.connection.channel()

                self.channel.queue_declare(queue=self.queue_name, durable=True)

                # BACKPRESSURE LIMIT: Pre-fetch maximum 5 messages concurrently
                self.channel.basic_qos(prefetch_count=5)

                self.channel.basic_consume(
                    queue=self.queue_name,
                    on_message_callback=self._process_message
                )

                logger.info(f"RabbitMQ Worker initialized with prefetch_count=5. Listening on queue [{self.queue_name}]...")
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
        try:
            payload = json.loads(body.decode("utf-8"))
            job_id = payload.get("jobId", f"job-{int(time.time())}")
            tenant_id = payload.get("tenantId", "GLOBAL")
            object_key = payload.get("objectKey")

            logger.info(f"Received RabbitMQ Job [{job_id}] for Tenant [{tenant_id}] - Key: [{object_key}]")

            if not object_key:
                logger.error(f"Invalid message payload: missing 'objectKey'. Payload: {payload}")
                ch.basic_ack(delivery_tag=delivery_tag)
                return

            # Step 1: Download File Content from MinIO S3 Storage
            raw_text = storage_service.download_file_as_text(object_key)

            if not raw_text or not raw_text.strip():
                logger.warning(f"File [{object_key}] contained no extractable text. Skipping pipeline processing.")
                ch.basic_ack(delivery_tag=delivery_tag)
                return

            # Step 2: Semantic Chunking via LangChain
            chunks = ai_service.chunk_text(raw_text)

            # Step 3: Vector Embeddings via Local SentenceTransformers (all-MiniLM-L6-v2)
            embeddings = ai_service.generate_embeddings(chunks)

            # Step 4: PgVector Collision Search & Routing
            doc_name = object_key.split("/")[-1]
            quarantine_count = 0
            committed_count = 0

            for chunk_text, embedding_vec in zip(chunks, embeddings):
                result = db_service.search_and_route_chunk(
                    job_id=job_id,
                    tenant_id=tenant_id,
                    doc_name=doc_name,
                    chunk_text=chunk_text,
                    embedding=embedding_vec
                )
                if result["status"] == "QUARANTINED":
                    quarantine_count += 1
                else:
                    committed_count += 1

            logger.info(
                f"Completed Job [{job_id}]: {len(chunks)} chunks processed "
                f"({committed_count} Committed to Vector DB, {quarantine_count} Quarantined Collisions)."
            )

            # Acknowledge message after successful pipeline execution
            ch.basic_ack(delivery_tag=delivery_tag)

        except Exception as e:
            logger.error(f"Error processing RabbitMQ message: {str(e)}", exc_info=True)
            # Acknowledge or requeue based on error strategy (ack to avoid infinite loop on bad payloads)
            ch.basic_ack(delivery_tag=delivery_tag)

    def stop(self):
        """
        Gracefully stops consuming and closes RabbitMQ channel and connection.
        """
        logger.info("Stopping RabbitMQ Worker gracefully...")
        self.should_stop = True
        if self.channel and self.channel.is_open:
            try:
                self.channel.stop_consuming()
            except Exception:
                pass
        if self.connection and self.connection.is_open:
            try:
                self.connection.close();
            except Exception:
                pass
        logger.info("RabbitMQ Worker stopped successfully.")

worker_instance = RabbitMQWorker()

def start_worker_thread():
    thread = threading.Thread(target=worker_instance.start_listening, daemon=True)
    thread.start()
    return worker_instance
