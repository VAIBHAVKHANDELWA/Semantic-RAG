import hashlib
import logging
import os
import re
import uuid
import psycopg2
from pgvector.psycopg2 import register_vector
import redis
from config import settings
from services.conflict_service import conflict_service

logger = logging.getLogger("python-ai-engine.db")

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))


def is_boilerplate(text: str) -> bool:
    """Detects repeated template boilerplate, headers, footers, and disclaimers to prevent false collisions."""
    if not text:
        return True
    t = text.strip()
    if len(t) < 80:
        return True
    markers = [
        "enterprise governance policy manual",
        "classification: confidential",
        "strictly internal governance only",
        "sunset review",
        "end of policy manual",
        "aicpa soc 2 common criteria",
        "principle of continuous knowledge verification",
        "executive sponsor: enterprise executive governance",
        "principle of least privilege and segregation of duties"
    ]
    t_lower = t.lower()
    matches = sum(1 for m in markers if m in t_lower)
    return matches >= 2


def topics_align(doc_a: str, doc_b: str) -> bool:
    """Verifies two documents belong to the same policy domain or revision pair before flagging collisions."""
    if not doc_a or not doc_b:
        return True
    clean_a = re.sub(r'^[a-f0-9-]+_', '', doc_a.lower()).replace('.txt', '').replace('.pdf', '')
    clean_b = re.sub(r'^[a-f0-9-]+_', '', doc_b.lower()).replace('.txt', '').replace('.pdf', '')
    # Check matching policy/revision numbers, e.g., POL-001 and REV-001
    nums_a = re.findall(r'(?:pol|rev)-?(\d+)', clean_a)
    nums_b = re.findall(r'(?:pol|rev)-?(\d+)', clean_b)
    if nums_a and nums_b and set(nums_a) & set(nums_b):
        return True

    stopwords = {
        "hr", "fin", "finance", "leg", "legal", "eng", "engineering",
        "pol", "rev", "policy", "governance", "standard", "manual",
        "handbook", "and", "or", "of", "the", "for", "in", "v1", "v2", "v3"
    }
    toks_a = set(re.findall(r'[a-z0-9]+', clean_a)) - stopwords
    toks_b = set(re.findall(r'[a-z0-9]+', clean_b)) - stopwords
    return len(toks_a & toks_b) > 0


class DatabaseService:
    def __init__(self):
        """
        Initializes PostgreSQL connection, registers pgvector extension, and connects to Redis.
        """
        self.db_url = settings.DATABASE_URL
        self._init_db()
        self._init_redis()

    def _init_redis(self):
        try:
            self.redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=0,
                decode_responses=True,
                socket_connect_timeout=2
            )
            self.redis_client.ping()
            logger.info("Connected to Redis for deduplication and adjudication cache.")
        except Exception as e:
            logger.warning(f"Redis connection failed ({e}). Dedup fallback to in-memory set.")
            self.redis_client = None
            self._local_dedup = set()

    def invalidate_tenant_query_cache(self, tenant_id: str) -> int:
        """
        Invalidates all cached RAG query responses for a given tenant in Redis.
        Called automatically upon document ingestion or state changes.
        """
        if not self.redis_client:
            return 0
        try:
            pattern = f"rag:query:{tenant_id.strip().upper()}:*"
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cached query entries for Tenant [{tenant_id}].")
                return len(keys)
        except Exception as e:
            logger.warning(f"Query cache invalidation error: {e}")
        return 0

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

    def check_dedup(self, tenant_id: str, chunk_sha256: str) -> bool:
        """
        Atomic deduplication via Redis SET NX key 'dedup:{tenant}:{sha256(chunk)}'.
        Returns True if chunk is unique (first time seen), False if duplicate.
        """
        key = f"dedup:{tenant_id}:{chunk_sha256}"
        if self.redis_client:
            try:
                # setnx returns True if key was set (is new), False if key already exists
                is_new = self.redis_client.set(key, "1", nx=True)
                if not is_new:
                    self.redis_client.incr(f"metrics:dedup_pruned:{tenant_id}")
                    self.redis_client.incr("metrics:dedup_pruned:total")
                return bool(is_new)
            except Exception as e:
                logger.warning(f"Redis dedup error: {e}")
        
        # Local fallback if Redis unreachable
        if not hasattr(self, '_local_dedup'):
            self._local_dedup = set()
        if key in self._local_dedup:
            return False
        self._local_dedup.add(key)
        return True

    def search_and_route_chunk(
        self,
        job_id: str,
        tenant_id: str,
        doc_name: str,
        chunk_text: str,
        embedding: list,
        chunk_index: int = 0
    ) -> dict:
        """
        Executes pgvector Cosine Distance search with strict tenant isolation.
        F9 Self-Collision Fix: Excludes chunks from the current document (doc_name != %s).
        Returns top-5 matches and flags conflict if similarity >= threshold (default 0.85).
        """
        if not tenant_id or not tenant_id.strip() or tenant_id.upper() in ("GLOBAL", "ALL"):
            raise ValueError(f"Strict tenant isolation required. Invalid tenant_id: [{tenant_id}]")

        sanitized_tenant = tenant_id.strip().toUpperCase() if hasattr(tenant_id, 'toUpperCase') else tenant_id.strip().upper()
        chunk_sha256 = hashlib.sha256(chunk_text.encode('utf-8')).hexdigest()
        chunk_id = f"chk-{uuid.uuid4().hex[:8]}"

        # Step 1: Redis Deduplication Check
        if not self.check_dedup(sanitized_tenant, chunk_sha256):
            logger.info(f"Dedup pruned duplicate chunk [{chunk_sha256[:10]}] for tenant [{sanitized_tenant}].")
            return {
                "status": "DEDUP_PRUNED",
                "chunk_id": chunk_id,
                "similarity": 1.0,
                "message": "Duplicate chunk pruned before embedding/vector store."
            }

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # Idempotency check: don't re-insert if chunk already exists
                    cur.execute(
                        "SELECT id FROM vector_chunks WHERE content_sha256 = %s AND tenant_id = %s LIMIT 1;",
                        (chunk_sha256, sanitized_tenant)
                    )
                    existing_exact = cur.fetchone()
                    if existing_exact:
                        return {"status": "ALREADY_COMMITTED", "chunk_id": existing_exact[0], "similarity": 1.0}

                    # F9 Fix: Exclude current document chunks to prevent self-collision
                    # Also fetch top-5 (not top-1)
                    query = """
                        SELECT id, doc_name, chunk_text, 1 - (embedding <=> %s::vector) AS similarity
                        FROM vector_chunks
                        WHERE tenant_id = %s
                          AND status = 'ACTIVE'
                          AND doc_name != %s
                        ORDER BY embedding <=> %s::vector
                        LIMIT 5;
                    """
                    cur.execute(query, (embedding, sanitized_tenant, doc_name, embedding))
                    rows = cur.fetchall()

                    highest_similarity = 0.0
                    existing_id = None
                    existing_doc = None
                    existing_text = None

                    if rows:
                        top = rows[0]
                        existing_id, existing_doc, existing_text, highest_similarity = top[0], top[1], top[2], float(top[3])

                    logger.info(
                        f"PgVector search for Tenant [{sanitized_tenant}], chunk [{chunk_id}] (doc: {doc_name}): "
                        f"top similarity = {highest_similarity:.4f}"
                    )

                    # Ensure parent document row exists in documents table
                    doc_id = f"doc-{job_id}"
                    cur.execute("""
                        INSERT INTO documents (id, tenant_id, job_id, name, status)
                        VALUES (%s, %s, %s, %s, 'ACTIVE')
                        ON CONFLICT (id) DO NOTHING;
                    """, (doc_id, sanitized_tenant, job_id, doc_name))

                    # Skip collision check if either chunk is generic template boilerplate
                    is_chunk_bp = is_boilerplate(chunk_text)
                    is_existing_bp = is_boilerplate(existing_text) if existing_text else False
                    same_topic = topics_align(doc_name, existing_doc) if existing_doc else False

                    # Collision Check Threshold (> 85% by default) on non-boilerplate chunks with strict topic alignment
                    should_check_collision = (
                        not is_chunk_bp and not is_existing_bp
                        and same_topic
                        and highest_similarity >= settings.SIMILARITY_THRESHOLD 
                        and existing_text
                    )

                    adjudication = None
                    is_real_conflict = False
                    if should_check_collision:
                        adjudication = conflict_service.adjudicate_conflict(
                            incoming_text=chunk_text,
                            existing_text=existing_text,
                            tenant_id=sanitized_tenant
                        )
                        verdict_type = adjudication.get("verdict_type", "CLEAN_APPEND")
                        is_conflict = adjudication.get("conflict", False)
                        is_real_conflict = same_topic and is_conflict and verdict_type in ("CONTRADICTORY", "SUPERSEDING_POLICY", "PARTIAL_UPDATE")

                    if is_real_conflict and adjudication:
                        conflict_id = f"conf-{uuid.uuid4().hex[:8]}"
                        verdict_type = adjudication.get("verdict_type", "CONTRADICTORY")
                        confidence = adjudication.get("confidence", 0.85)
                        explanation = adjudication.get("explanation", "Semantic collision detected with active tenant baseline.")

                        logger.warning(
                            f"FLAGGED REAL COLLISION ({highest_similarity*100:.1f}%) in Tenant [{sanitized_tenant}]: "
                            f"Routing incoming chunk [{chunk_id}] to Quarantine Queue with Verdict [{verdict_type}]."
                        )

                        cur.execute("""
                            INSERT INTO quarantine_queue (
                                id, job_id, tenant_id, document_id, existing_document,
                                incoming_chunk_text, existing_chunk_id, existing_chunk_text,
                                similarity_score, verdict_type, verdict_confidence,
                                contradiction_explanation, status
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'PENDING');
                        """, (
                            conflict_id, job_id, sanitized_tenant, doc_id, existing_doc,
                            chunk_text, existing_id, existing_text,
                            highest_similarity, verdict_type, confidence,
                            explanation
                        ))

                        # Map verdict_type to valid provenance_edges relation ('SUPERSEDES', 'CONTRADICTS', 'PARTIAL_UPDATE_OF', 'DERIVED_FROM')
                        relation_map = {
                            "CONTRADICTORY": "CONTRADICTS",
                            "SUPERSEDING_POLICY": "SUPERSEDES",
                            "PARTIAL_UPDATE": "PARTIAL_UPDATE_OF",
                            "CLEAN_APPEND": "DERIVED_FROM"
                        }
                        edge_relation = relation_map.get(verdict_type, "CONTRADICTS")

                        # Insert initial provenance edge
                        pe_id = f"pe-{uuid.uuid4().hex[:8]}"
                        cur.execute("""
                            INSERT INTO provenance_edges (
                                id, tenant_id, from_chunk_id, to_chunk_id, relation, created_by_conflict_id
                            ) VALUES (%s, %s, %s, %s, %s, %s);
                        """, (pe_id, sanitized_tenant, existing_id, conflict_id, edge_relation, conflict_id))

                        conn.commit()

                        if self.redis_client:
                            try:
                                self.redis_client.incr("metrics:quarantined_total")
                                self.redis_client.incr(f"metrics:quarantined:{sanitized_tenant}")
                            except Exception:
                                pass

                        return {
                            "status": "QUARANTINED",
                            "conflict_id": conflict_id,
                            "similarity": highest_similarity,
                            "verdict": verdict_type,
                            "explanation": explanation
                        }

                    else:
                        # CLEAN CHUNK: Commit to vector_chunks table
                        cur.execute("""
                            INSERT INTO vector_chunks (
                                id, document_id, doc_name, tenant_id, chunk_index, chunk_text, embedding,
                                status, content_sha256
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'ACTIVE', %s);
                        """, (chunk_id, doc_id, doc_name, sanitized_tenant, chunk_index, chunk_text, embedding, chunk_sha256))

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

    def quarantine_corrupt_or_empty_document(
        self,
        job_id: str,
        tenant_id: str,
        doc_name: str,
        reason: str,
        verdict_type: str = "EXTRACTION_FAILED"
    ) -> str:
        """
        Quarantines failed extraction, empty, corrupt, or suspicious documents into quarantine_queue.
        Ensures the document is recorded with an explicit reason rather than silently dropped.
        """
        sanitized_tenant = tenant_id.strip().upper()
        conflict_id = f"conf-err-{uuid.uuid4().hex[:8]}"
        doc_id = f"doc-{job_id}"

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # 0. Ensure ingestion_jobs record exists
                    cur.execute("""
                        INSERT INTO ingestion_jobs (id, tenant_id, object_key, file_name, status)
                        VALUES (%s, %s, %s, %s, 'PROCESSING')
                        ON CONFLICT (id) DO NOTHING;
                    """, (job_id, sanitized_tenant, f"uploads/{doc_name}", doc_name))

                    # 1. Ensure document record exists
                    cur.execute("""
                        INSERT INTO documents (id, tenant_id, job_id, name, status)
                        VALUES (%s, %s, %s, %s, 'QUARANTINED')
                        ON CONFLICT (id) DO UPDATE SET status = 'QUARANTINED';
                    """, (doc_id, sanitized_tenant, job_id, doc_name))

                    # 2. Insert into quarantine_queue
                    placeholder_text = f"[FAILED_EXTRACTION: {doc_name}] - {reason}"
                    cur.execute("""
                        INSERT INTO quarantine_queue (
                            id, job_id, tenant_id, document_id, existing_document,
                            incoming_chunk_text, existing_chunk_id, existing_chunk_text,
                            similarity_score, verdict_type, verdict_confidence,
                            contradiction_explanation, status
                        ) VALUES (%s, %s, %s, %s, %s, %s, NULL, NULL, 0.0, %s, 1.0, %s, 'PENDING');
                    """, (
                        conflict_id, job_id, sanitized_tenant, doc_id, doc_name,
                        placeholder_text, verdict_type, reason
                    ))
                    conn.commit()

            # 3. Update job counters
            self.update_job_counters(
                job_id=job_id,
                chunk_total=0,
                chunks_committed=0,
                chunks_quarantined=1,
                status="QUARANTINED",
                error=reason
            )

            # 4. Telemetry metrics in Redis
            if self.redis_client:
                try:
                    self.redis_client.incr("metrics:quarantined_total")
                    self.redis_client.incr(f"metrics:quarantined:{sanitized_tenant}")
                except Exception:
                    pass

            logger.warning(
                f"Quarantined unreadable/corrupt document [{doc_name}] in Tenant [{sanitized_tenant}] "
                f"with reason: [{reason}]. Conflict ID: [{conflict_id}]"
            )
            return conflict_id

        except Exception as e:
            logger.error(f"Failed to record quarantine entry for [{doc_name}]: {e}", exc_info=True)
            raise RuntimeError(f"Database error during corrupt document quarantine: {e}")

    def update_job_counters(self, job_id: str, chunk_total: int, chunks_committed: int, chunks_quarantined: int, status: str = "COMPLETED", error: str = None):
        """Updates ingestion_jobs row metrics atomically upon batch completion."""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE ingestion_jobs
                        SET chunk_total = %s,
                            chunks_committed = %s,
                            chunks_quarantined = %s,
                            status = %s,
                            error = %s,
                            finished_at = CURRENT_TIMESTAMP
                        WHERE id = %s;
                    """, (chunk_total, chunks_committed, chunks_quarantined, status, error, job_id))
                    conn.commit()
        except Exception as e:
            logger.error(f"Failed to update ingestion_jobs counters for [{job_id}]: {e}")


db_service = DatabaseService()
