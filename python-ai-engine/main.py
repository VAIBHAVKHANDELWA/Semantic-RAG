import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from queue_worker import start_worker_thread, worker_instance

# Configure SLF4J / Standard Python Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("python-ai-engine.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan Manager: Starts RabbitMQ queue worker thread on startup,
    and shuts it down gracefully on server shutdown.
    """
    logger.info("Starting Python AI Engine Microservice...")
    logger.info("Launching RabbitMQ queue worker in background thread...")
    worker = start_worker_thread()
    
    yield
    
    logger.info("Shutting down Python AI Engine Microservice...")
    worker.stop()
    logger.info("Shutdown complete.")

app = FastAPI(
    title="Semantic RAG Middleware - Python AI Engine",
    description="Local AI microservice for MinIO document retrieval, LangChain chunking, SentenceTransformer embeddings, and PgVector collision search.",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/health")
def health_check():
    """
    Public health check endpoint.
    """
    return {
        "status": "healthy",
        "service": "python-ai-engine",
        "model": "all-MiniLM-L6-v2",
        "vector_dimensions": 384
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
