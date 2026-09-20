import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

class Settings:
    # RabbitMQ Config
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://admin:adminpassword@localhost:5672/")
    RABBITMQ_QUEUE: str = os.getenv("RABBITMQ_QUEUE", "raw-document-queue")

    # PostgreSQL Config
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://admin:adminpassword@localhost:5432/semantic_rag_db")

    # MinIO S3 Config
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    MINIO_BUCKET: str = os.getenv("MINIO_BUCKET", "semantic-rag-uploads")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")

    # AI Processing Parameters
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "500"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "50"))
    SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.85"))

settings = Settings()
