import logging
import re
import time
from typing import List, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from config import settings

logger = logging.getLogger("python-ai-engine.ai")

class AIService:
    def __init__(self):
        """
        Initializes LangChain chunking strategies and local SentenceTransformer model.
        Runs locally on CPU with zero cloud costs.
        """
        # Strategy 1: Adaptive Semantic Chunking (MiniLM-L6-v2 384-dim)
        self.adaptive_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

        # Strategy 2: Fixed 512 Token Window with 64 Token Overlap (~2048 chars / ~256 chars)
        self.fixed_window_splitter = RecursiveCharacterTextSplitter(
            chunk_size=2048,
            chunk_overlap=256,
            separators=["\n\n", "\n", " "]
        )

        # Active strategy cached in memory
        self.active_strategy = "ADAPTIVE_SEMANTIC"
        self._strategy_last_checked = 0.0

        logger.info(f"Loading local embedding model [{settings.EMBEDDING_MODEL_NAME}] on CPU...")
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        logger.info(f"Model [{settings.EMBEDDING_MODEL_NAME}] loaded successfully.")

    def get_active_strategy(self) -> str:
        """
        Retrieves active chunking strategy from database / Redis with a 5-second TTL cache.
        """
        now = time.time()
        if now - self._strategy_last_checked < 5.0:
            return self.active_strategy

        try:
            from services.db_service import db_service
            # Check Redis first
            if db_service.redis_client:
                cached = db_service.redis_client.get("rag:workspace:chunking_strategy")
                if cached:
                    self.active_strategy = cached.decode("utf-8") if isinstance(cached, bytes) else str(cached)
                    self._strategy_last_checked = now
                    return self.active_strategy

            # Fallback to PostgreSQL workspace_config
            with db_service.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT chunking_strategy FROM workspace_config WHERE id = 'default' LIMIT 1;")
                    row = cur.fetchone()
                    if row and row[0]:
                        self.active_strategy = row[0]
            self._strategy_last_checked = now
        except Exception as e:
            logger.debug(f"Could not load chunking strategy from DB: {e}")

        return self.active_strategy

    def set_active_strategy(self, strategy: str):
        """
        Sets the active chunking strategy and syncs to Redis.
        """
        valid_strategies = {
            "ADAPTIVE_SEMANTIC",
            "FIXED_TOKEN_WINDOW",
            "LEGAL_CLAUSE_LAYOUT",
            "Adaptive Chunking + MiniLM Vector Pipeline",
            "Fixed 512 Token Window + Overlap",
            "Strict Legal Clause Segmentation"
        }
        # Normalize strategy name
        norm = strategy.upper()
        if "FIXED" in norm or "512" in norm:
            self.active_strategy = "FIXED_TOKEN_WINDOW"
        elif "LEGAL" in norm or "CLAUSE" in norm:
            self.active_strategy = "LEGAL_CLAUSE_LAYOUT"
        else:
            self.active_strategy = "ADAPTIVE_SEMANTIC"

        self._strategy_last_checked = time.time()
        logger.info(f"Switched active chunking strategy to: [{self.active_strategy}]")

        try:
            from services.db_service import db_service
            if db_service.redis_client:
                db_service.redis_client.set("rag:workspace:chunking_strategy", self.active_strategy)
        except Exception as e:
            logger.warning(f"Failed to cache chunking strategy in Redis: {e}")

    def _chunk_legal_clause_layout(self, raw_text: str) -> List[str]:
        """
        Strategy 3: Strict Legal & Policy Clause Layout Parsing.
        Detects structural policy boundaries (ARTICLE, SECTION, CLAUSE, numbered stipulations)
        and preserves intact clause units.
        """
        # Split on clause / section headers
        clause_pattern = re.compile(
            r'(?:\r?\n)+(?=(?:ARTICLE\s+[IVXLCDM\d]+|SECTION\s+[\d\.]+|CLAUSE\s+[\d\.]+|POLICY\s+[\w-]+|\d+\.\d+\.?|\d+\.)\s+)',
            re.IGNORECASE
        )
        raw_clauses = [c.strip() for c in clause_pattern.split(raw_text.strip()) if c.strip()]

        if not raw_clauses:
            return self.adaptive_splitter.split_text(raw_text)

        chunks = []
        buffer_header = ""

        for block in raw_clauses:
            # If a block is just a short header (< 60 chars), attach to next clause
            if len(block) < 60 and not any(p in block for p in [".", ";", ":\n"]):
                buffer_header = block + "\n"
                continue

            full_block = (buffer_header + block).strip()
            buffer_header = ""

            # If a single legal clause is excessively long (> 1500 chars), split by sentence boundaries
            if len(full_block) > 1500:
                sub_chunks = self.adaptive_splitter.split_text(full_block)
                chunks.extend(sub_chunks)
            else:
                chunks.append(full_block)

        if buffer_header.strip():
            if chunks:
                chunks[-1] += "\n" + buffer_header.strip()
            else:
                chunks.append(buffer_header.strip())

        return chunks

    def chunk_text(self, raw_text: str, strategy: Optional[str] = None) -> List[str]:
        """
        Splits raw text into semantic chunks based on the active or requested strategy.
        Supports:
          1. ADAPTIVE_SEMANTIC (Adaptive Semantic Chunking MiniLM-L6-v2 384-dim)
          2. FIXED_TOKEN_WINDOW (Fixed 512 Token Window with 64 Token Overlap)
          3. LEGAL_CLAUSE_LAYOUT (Strict Legal & Policy Clause Layout Parsing)
        """
        if not raw_text or not raw_text.strip():
            logger.warning("Empty raw text received for chunking.")
            return []

        active = strategy or self.get_active_strategy()
        norm = active.upper()

        if "FIXED" in norm or "512" in norm:
            chunks = self.fixed_window_splitter.split_text(raw_text)
            chosen_name = "Fixed 512 Token Window with 64 Token Overlap"
        elif "LEGAL" in norm or "CLAUSE" in norm:
            chunks = self._chunk_legal_clause_layout(raw_text)
            chosen_name = "Strict Legal & Policy Clause Layout Parsing"
        else:
            chunks = self.adaptive_splitter.split_text(raw_text)
            chosen_name = "Adaptive Semantic Chunking (MiniLM-L6-v2 384-dim)"

        logger.info(f"Chunked text using [{chosen_name}] into {len(chunks)} blocks.")
        return chunks

    def generate_embeddings(self, chunks: List[str]) -> List[List[float]]:
        """
        Converts text chunks into 384-dimensional normalized float vector embeddings using SentenceTransformers.
        """
        if not chunks:
            return []

        logger.info(f"Generating vector embeddings for {len(chunks)} text chunks...")
        embeddings = self.model.encode(chunks, normalize_embeddings=True, show_progress_bar=False)

        float_embeddings = [vector.tolist() for vector in embeddings]
        logger.info(f"Successfully generated {len(float_embeddings)} float vector embeddings (dim={len(float_embeddings[0])})")
        return float_embeddings

ai_service = AIService()
