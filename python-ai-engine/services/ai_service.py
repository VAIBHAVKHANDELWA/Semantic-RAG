import logging
from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from config import settings

logger = logging.getLogger("python-ai-engine.ai")

class AIService:
    def __init__(self):
        """
        Initializes LangChain RecursiveCharacterTextSplitter and local SentenceTransformer model.
        Runs locally on CPU with zero cloud costs.
        """
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        logger.info(f"Loading local embedding model [{settings.EMBEDDING_MODEL_NAME}] on CPU...")
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        logger.info(f"Model [{settings.EMBEDDING_MODEL_NAME}] loaded successfully.")

    def chunk_text(self, raw_text: str) -> List[str]:
        """
        Splits raw text into semantic chunks using RecursiveCharacterTextSplitter.
        """
        if not raw_text or not raw_text.strip():
            logger.warning("Empty raw text received for chunking.")
            return []

        chunks = self.text_splitter.split_text(raw_text)
        logger.info(f"Chunked text into {len(chunks)} semantic blocks (size={settings.CHUNK_SIZE}, overlap={settings.CHUNK_OVERLAP})")
        return chunks

    def generate_embeddings(self, chunks: List[str]) -> List[List[float]]:
        """
        Converts text chunks into 384-dimensional normalized float vector embeddings using SentenceTransformers.
        """
        if not chunks:
            return []

        logger.info(f"Generating vector embeddings for {len(chunks)} text chunks...")
        embeddings = self.model.encode(chunks, normalize_embeddings=True, show_progress_bar=False)

        # Convert numpy arrays to standard Python float lists
        float_embeddings = [vector.tolist() for vector in embeddings]
        logger.info(f"Successfully generated {len(float_embeddings)} float vector embeddings (dim={len(float_embeddings[0])})")
        return float_embeddings

ai_service = AIService()
