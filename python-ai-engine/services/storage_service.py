import logging
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from config import settings

logger = logging.getLogger("python-ai-engine.storage")

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
        logger.info(f"Initialized MinIO StorageService pointing to [{settings.MINIO_ENDPOINT}]")

    def download_file_as_text(self, object_key: str, bucket_name: str = None) -> str:
        """
        Downloads a document file from MinIO storage directly into memory as a UTF-8 string.
        """
        target_bucket = bucket_name or settings.MINIO_BUCKET
        logger.info(f"Retrieving object [{object_key}] from MinIO bucket [{target_bucket}]")

        try:
            response = self.s3_client.get_object(Bucket=target_bucket, Key=object_key)
            body_bytes = response["Body"].read()

            # Attempt UTF-8 decoding with fallback
            try:
                text_content = body_bytes.decode("utf-8")
            except UnicodeDecodeError:
                text_content = body_bytes.decode("latin-1", errors="ignore")

            logger.info(f"Successfully downloaded [{object_key}] ({len(body_bytes)} bytes, {len(text_content)} chars)")
            return text_content

        except (BotoCoreError, ClientError) as e:
            logger.error(f"MinIO S3 error retrieving object [{object_key}]: {str(e)}", exc_info=True)
            raise RuntimeError(f"StorageService failed to retrieve [{object_key}]: {str(e)}")

storage_service = StorageService()
