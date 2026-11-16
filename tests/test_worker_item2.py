"""
Unit & Integration Tests for ITEM 2 (Python Worker T0.5):
1. Text extraction with Apache Tika for uploaded documents with latency tracking.
2. Redis-based deduplication using content hash (duplicates are skipped and recorded).
3. Quarantine for empty and corrupt files with reasons ('EMPTY_FILE', 'CORRUPT_FILE').
4. Dead-letter queue (DLQ) retry cap enforcement and status updates.
5. Telemetry endpoint exposing processed, duplicates, quarantined, dlq, and extraction latency.
"""
import sys
import os
import unittest
import uuid
import requests
import time

# Add python-ai-engine to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python-ai-engine")))

from services.storage_service import storage_service
from services.db_service import db_service
from queue_worker import RabbitMQWorker

AI_ENGINE_URL = "http://localhost:8000"


class TestWorkerItem2(unittest.TestCase):

    def test_01_tika_extraction_and_latency(self):
        """Verify Apache Tika extracts document content from MinIO and measures extraction latency."""
        test_key = f"test/item2_tika_{uuid.uuid4().hex[:6]}.txt"
        test_content = b"Enterprise Compliance Policy: All employees must complete annual data security training."

        # Upload to MinIO bucket
        storage_service.s3_client.put_object(
            Bucket="semantic-rag-uploads",
            Key=test_key,
            Body=test_content
        )

        extracted_text, latency_ms = storage_service.download_and_extract(test_key)
        self.assertIn("Enterprise Compliance Policy", extracted_text)
        self.assertGreater(latency_ms, 0.0)

        # Cleanup MinIO
        storage_service.s3_client.delete_object(Bucket="semantic-rag-uploads", Key=test_key)

    def test_02_redis_deduplication(self):
        """Verify Redis deduplication skips duplicate chunks and increments dedup metrics counter."""
        tenant_id = f"TEST_TENANT_{uuid.uuid4().hex[:4].upper()}"
        chunk_hash = f"hash-{uuid.uuid4().hex}"

        # First check: chunk is new
        is_first_unique = db_service.check_dedup(tenant_id, chunk_hash)
        self.assertTrue(is_first_unique, "First chunk insertion must return True (unique)")

        initial_pruned = int(db_service.redis_client.get("metrics:dedup_pruned:total") or 0)

        # Second check: duplicate chunk
        is_second_unique = db_service.check_dedup(tenant_id, chunk_hash)
        self.assertFalse(is_second_unique, "Duplicate chunk must return False (deduplicated)")

        # Verify Redis counter incremented
        updated_pruned = int(db_service.redis_client.get("metrics:dedup_pruned:total") or 0)
        self.assertGreaterEqual(updated_pruned, initial_pruned + 1)

    def test_03_quarantine_empty_file(self):
        """Verify 0-byte or unextractable empty file is quarantined with EMPTY_FILE verdict."""
        job_id = f"job-empty-{uuid.uuid4().hex[:8]}"
        tenant_id = "HR"
        doc_name = "empty_contract.pdf"
        reason = "Document contained 0 bytes of extractable text."

        initial_quarantined = int(db_service.redis_client.get("metrics:quarantined_total") or 0)

        conflict_id = db_service.quarantine_corrupt_or_empty_document(
            job_id=job_id,
            tenant_id=tenant_id,
            doc_name=doc_name,
            reason=reason,
            verdict_type="EMPTY_FILE"
        )
        self.assertTrue(conflict_id.startswith("conf-err-"))

        # Verify record in database
        with db_service.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT verdict_type, status, contradiction_explanation FROM quarantine_queue WHERE id = %s;", (conflict_id,))
                row = cur.fetchone()
                self.assertIsNotNone(row)
                self.assertEqual(row[0], "EMPTY_FILE")
                self.assertEqual(row[1], "PENDING")
                self.assertEqual(row[2], reason)

        # Verify Redis quarantined counter incremented
        updated_quarantined = int(db_service.redis_client.get("metrics:quarantined_total") or 0)
        self.assertGreaterEqual(updated_quarantined, initial_quarantined + 1)

    def test_04_quarantine_corrupt_file(self):
        """Verify corrupt/malformed file is quarantined with CORRUPT_FILE verdict and not dropped."""
        job_id = f"job-corrupt-{uuid.uuid4().hex[:8]}"
        tenant_id = "LEGAL"
        doc_name = "malformed_dump.bin"
        reason = "Failed extraction / corrupt file: Corrupt PDF header format error."

        conflict_id = db_service.quarantine_corrupt_or_empty_document(
            job_id=job_id,
            tenant_id=tenant_id,
            doc_name=doc_name,
            reason=reason,
            verdict_type="CORRUPT_FILE"
        )

        with db_service.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT verdict_type, status FROM quarantine_queue WHERE id = %s;", (conflict_id,))
                row = cur.fetchone()
                self.assertIsNotNone(row)
                self.assertEqual(row[0], "CORRUPT_FILE")
                self.assertEqual(row[1], "PENDING")

    def test_05_dlq_retry_logic(self):
        """Verify jobs exceeding retry threshold (MAX_RETRIES=3) move to DLQ with FAILED_DLQ status."""
        job_id = f"job-dlq-{uuid.uuid4().hex[:8]}"
        tenant_id = "HR"

        initial_dlq = int(db_service.redis_client.get("metrics:dlq_total") or 0)

        # Mock incoming message channel & properties
        class DummyChannel:
            def __init__(self):
                self.nacked = False
                self.requeue = None

            def basic_nack(self, delivery_tag, requeue):
                self.nacked = True
                self.requeue = requeue

        class DummyMethod:
            delivery_tag = 101

        class DummyProperties:
            # 3 x-death entries simulating 3 previous failed attempts
            headers = {'x-death': [{'count': 1}, {'count': 1}, {'count': 1}]}

        worker = RabbitMQWorker()
        channel = DummyChannel()
        method = DummyMethod()
        properties = DummyProperties()
        body = f'{{"jobId": "{job_id}", "tenantId": "{tenant_id}", "objectKey": "invalid/path.pdf"}}'.encode('utf-8')

        # First insert job into ingestion_jobs table
        with db_service.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO ingestion_jobs (id, tenant_id, object_key, file_name, status) VALUES (%s, %s, %s, %s, %s);",
                    (job_id, tenant_id, "invalid/path.pdf", "invalid_path.pdf", "QUEUED")
                )
                conn.commit()

        # Run process message
        worker._process_message(channel, method, properties, body)

        # Verify message was nacked with requeue=False (moved to DLQ)
        self.assertTrue(channel.nacked)
        self.assertFalse(channel.requeue)

        # Verify Redis DLQ metric
        updated_dlq = int(db_service.redis_client.get("metrics:dlq_total") or 0)
        self.assertGreaterEqual(updated_dlq, initial_dlq + 1)

        # Verify DB status is FAILED_DLQ
        with db_service.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT status, error FROM ingestion_jobs WHERE id = %s;", (job_id,))
                row = cur.fetchone()
                self.assertIsNotNone(row)
                self.assertEqual(row[0], "FAILED_DLQ")
                self.assertIn("Exceeded 3 attempts", row[1])

    def test_06_telemetry_endpoint(self):
        """Verify GET /api/v1/telemetry exposes processed, duplicates, quarantined, dlq, and extraction latency."""
        res = requests.get(f"{AI_ENGINE_URL}/api/v1/telemetry")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data.get("status"), "healthy")
        self.assertIn("processed", data)
        self.assertIn("duplicates", data)
        self.assertIn("quarantined", data)
        self.assertIn("dlq", data)
        self.assertIn("extractionLatency", data)
        self.assertIn("lastMs", data["extractionLatency"])
        self.assertIn("avgMs", data["extractionLatency"])
        self.assertIn("sampleCount", data["extractionLatency"])


if __name__ == "__main__":
    unittest.main()
