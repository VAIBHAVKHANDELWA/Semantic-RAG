import logging
import random
import uuid
import psycopg2
from pgvector.psycopg2 import register_vector
from config import settings

logger = logging.getLogger("python-ai-engine.db")

MOCK_VERDICTS = [
    ("CONTRADICTORY", "Incoming policy chunk directly contradicts baseline terms regarding operational SLAs."),
    ("SUPERSIDING_POLICY", "Incoming document introduces a 2026 policy amendment that supersedes existing 2022 guidelines."),
    ("PARTIAL_UPDATE", "Partial semantic overlap detected in department guidelines. Human compliance review required.")
]

class DatabaseService:
    def __init__(self):
        """
        Initializes PostgreSQL connection and registers pgvector extension.
        """
        self.db_url = settings.DATABASE_URL
        self._init_db()

    def get_connection(self):
        conn = psycopg2.connect(self.db_url)
        register_vector(conn)
        return conn

    def _init_db(self):
        """
        Validates database connectivity. Schema and migrations are managed exclusively by Flyway.
        """
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1;")
                logger.info("PostgreSQL database connection verified. Schema managed by Flyway.")
        except Exception as e:
            logger.warning(f"Database connection check during init: {str(e)} (Will retry during runtime queries)")

    def search_and_route_chunk(
        self, 
        job_id: str, 
        tenant_id: str, 
        doc_name: str, 
        chunk_text: str, 
        embedding: list
    ) -> dict:
        """
        Executes PgVector Cosine Similarity (<=>) search with strict tenant isolation.
        Routes chunk to quarantine_queue if similarity > 85%, or vector_chunks if clean.
        """
        sanitized_tenant = (tenant_id or "GLOBAL").upper()
        chunk_id = f"chk-{uuid.uuid4().hex[:8]}"

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # Security Rule: Enforce tenant isolation in Cosine Distance search
                    query = """
                        SELECT id, chunk_text, 1 - (embedding <=> %s::vector) AS similarity
                        FROM vector_chunks
                        WHERE tenant_id = %s
                        ORDER BY embedding <=> %s::vector
                        LIMIT 1;
                    """
                    cur.execute(query, (embedding, sanitized_tenant, embedding))
                    row = cur.fetchone()

                    highest_similarity = 0.0
                    existing_id = None
                    existing_text = None

                    if row:
                        existing_id, existing_text, highest_similarity = row[0], row[1], float(row[2])

                    logger.info(f"PgVector search for Tenant [{sanitized_tenant}] chunk [{chunk_id}]: highest similarity = {highest_similarity:.4f}")

                    # LOGIC FORK: Collision Check Threshold (> 85%)
                    if highest_similarity >= settings.SIMILARITY_THRESHOLD:
                        verdict_type, explanation = random.choice(MOCK_VERDICTS)
                        conflict_id = f"conf-{uuid.uuid4().hex[:8]}"

                        logger.warning(
                            f"FLAGGED COLLISION ({highest_similarity*100:.1f}%) for Tenant [{sanitized_tenant}]. "
                            f"Routing incoming chunk [{chunk_id}] to Quarantine Queue with Verdict [{verdict_type}]."
                        )

                        cur.execute("""
                            INSERT INTO quarantine_queue (
                                id, job_id, tenant_id, similarity_score, verdict_type,
                                contradiction_explanation, existing_chunk_id, existing_chunk_text,
                                incoming_chunk_text, status
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'PENDING');
                        """, (
                            conflict_id, job_id, sanitized_tenant, highest_similarity, verdict_type,
                            explanation, existing_id, existing_text, chunk_text
                        ))
                        conn.commit()

                        return {
                            "status": "QUARANTINED",
                            "conflict_id": conflict_id,
                            "similarity": highest_similarity,
                            "verdict": verdict_type
                        }

                    else:
                        # CLEAN CHUNK: Commit to vector_chunks table
                        cur.execute("""
                            INSERT INTO vector_chunks (id, doc_name, tenant_id, chunk_text, embedding)
                            VALUES (%s, %s, %s, %s, %s);
                        """, (chunk_id, doc_name, sanitized_tenant, chunk_text, embedding))
                        conn.commit()

                        logger.info(f"Clean chunk [{chunk_id}] committed to Vector DB for Tenant [{sanitized_tenant}].")
                        return {
                            "status": "COMMITTED",
                            "chunk_id": chunk_id,
                            "similarity": highest_similarity
                        }

        except Exception as e:
            logger.error(f"Database operation failed for chunk [{chunk_id}]: {str(e)}", exc_info=True)
            raise RuntimeError(f"Database error during vector search and route: {str(e)}")

db_service = DatabaseService()
