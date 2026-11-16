import logging
import os
import time
import requests
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from config import settings

logger = logging.getLogger("python-ai-engine.storage")

TIKA_URL = os.environ.get("TIKA_ENDPOINT", "http://localhost:9998")


class StorageService:
    def __init__(self):
        """
        Initializes Boto3 S3 Client configured specifically for local MinIO emulator.
        """
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=settings.MINIO_ENDPOINT,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            region_name=settings.AWS_REGION
        )
        self.last_extraction_latency_ms = 0.0
        logger.info(f"Initialized MinIO StorageService pointing to [{settings.MINIO_ENDPOINT}]")

    def download_and_extract(self, object_key: str, bucket_name: str = None) -> tuple[str, float]:
        """Downloads from MinIO then extracts text via Apache Tika REST API (supports PDF/DOCX/OCR)."""
        start = time.perf_counter()
        target_bucket = bucket_name or settings.MINIO_BUCKET
        logger.info(f"Retrieving [{object_key}] from MinIO bucket [{target_bucket}]")

        try:
            response = self.s3_client.get_object(Bucket=target_bucket, Key=object_key)
            file_bytes = response["Body"].read()
        except (BotoCoreError, ClientError) as e:
            logger.error(f"MinIO S3 error retrieving object [{object_key}]: {str(e)}", exc_info=True)
            raise RuntimeError(f"StorageService failed to retrieve [{object_key}]: {str(e)}")

        logger.info(f"Downloaded [{object_key}] ({len(file_bytes)} bytes). Sending to Tika for extraction.")

        text = ""
        try:
            tika_response = requests.put(
                f"{TIKA_URL}/tika",
                data=file_bytes,
                headers={"Accept": "text/plain", "Content-Type": "application/octet-stream"},
                timeout=120
            )
            if tika_response.status_code == 200:
                text = tika_response.text.strip()
                logger.info(f"Tika extracted {len(text)} chars from [{object_key}]")
            else:
                logger.warning(f"Tika returned HTTP {tika_response.status_code}, falling back to UTF-8 decode")
                text = file_bytes.decode("utf-8", errors="replace").strip()
        except Exception as e:
            logger.warning(f"Tika REST extraction unavailable ({e}), falling back to direct decode")
            try:
                text = file_bytes.decode("utf-8").strip()
            except UnicodeDecodeError:
                text = file_bytes.decode("latin-1", errors="ignore").strip()

        latency_ms = (time.perf_counter() - start) * 1000
        self.last_extraction_latency_ms = latency_ms
        return text, latency_ms

    def download_and_extract_text(self, object_key: str, bucket_name: str = None) -> str:
        """Downloads from MinIO then extracts text via Apache Tika REST API (supports PDF/DOCX/OCR)."""
        text, _ = self.download_and_extract(object_key, bucket_name)
        return text

    def download_file_as_text(self, object_key: str, bucket_name: str = None) -> str:
        """Backward-compat alias for download_and_extract_text."""
        return self.download_and_extract_text(object_key, bucket_name)


storage_service = StorageService()
