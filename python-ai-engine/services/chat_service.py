import hashlib
import json
import logging
import os
import re
import time
from typing import Dict, Any, List, Optional
from services.ai_service import ai_service
from services.db_service import db_service

logger = logging.getLogger("python-ai-engine.chat")


def clean_doc_title(raw_name: str) -> str:
    """Removes random UUID or hash prefixes and file extensions for clean display."""
    if not raw_name:
        return "Enterprise Policy Standard"
    clean = re.sub(r'^[a-f0-9-]+_', '', raw_name)
    clean = re.sub(r'^[a-f0-9]{8}-', '', clean)
    clean = re.sub(r'^doc-job-[a-f0-9]+', 'Policy Amendment', clean)
    clean = clean.replace('.txt', '').replace('.pdf', '')
    clean = clean.replace('_', ' ')
    return clean.strip()


def extract_policy_family(doc_name: str) -> str:
    """Extracts common policy identifier family, e.g. 'POL-001' or 'REV-001' -> '001'."""
    clean = clean_doc_title(doc_name).lower()
    match = re.search(r'(?:pol|rev)-?(\d+)', clean)
    if match:
        return f"FAMILY-{match.group(1)}"
    tokens = [w for w in re.findall(r'[a-z0-9]+', clean) if len(w) > 3 and w not in ('policy', 'manual', 'standard', 'governance', 'charter')]
    return tokens[0] if tokens else clean[:12]


def format_table_answer(question: str, text: str) -> Optional[str]:
    """
    If the policy chunk contains a pipe-delimited table, parses rows and columns.
    If the question matches a specific row or decision, formats a clean, human-readable answer.
    """
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    table_lines = [l for l in lines if '|' in l and not re.match(r'^[-\s|:=_]+$', l)]
    if len(table_lines) < 2:
        return None

    raw_headers = [h.strip() for h in table_lines[0].split('|')]
    headers = [h for h in raw_headers if h]

    rows = []
    for l in table_lines[1:]:
        raw_cols = [c.strip() for c in l.split('|')]
        cols = [c for c in raw_cols if c]
        if cols:
            rows.append(cols)

    q_words = set(re.findall(r'\w+', question.lower()))
    stop = {'what', 'are', 'the', 'for', 'is', 'who', 'can', 'approve', 'of', 'and', 'in', 'to', 'how', 'much', 'policy'}
    q_content = q_words - stop

    best_row = None
    best_overlap = 0

    for row in rows:
        row_str = " ".join(row).lower()
        row_words = set(re.findall(r'\w+', row_str))
        overlap = len(q_content.intersection(row_words))
        if overlap > best_overlap:
            best_overlap = overlap
            best_row = row

    if best_row and best_overlap >= 1:
        row_title = best_row[0]
        items = []
        for i, val in enumerate(best_row[1:], start=1):
            hdr = headers[i] if i < len(headers) else f"Level {i}"
            items.append(f"• **{hdr}**: {val}")
        return f"According to the **{row_title}** governance matrix:\n\n" + "\n".join(items)

    return None


def check_platform_query(question: str, tenant_id: str) -> Optional[Dict[str, Any]]:
    """
    Intelligently handles platform architecture, system health, and document catalog queries.
    Allows Global Admin and Department Stewards to query live database metrics directly.
    """
    q_low = question.lower()

    # 1. Platform status / metrics query
    status_keywords = ["platform status", "system status", "how many documents", "how many policies", "overview of platform", "system metrics", "health status", "database status"]
    if any(k in q_low for k in status_keywords):
        try:
            with db_service.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT tenant_id, count(*) FROM documents WHERE status = 'ACTIVE' GROUP BY tenant_id ORDER BY tenant_id;")
                    doc_counts = dict(cur.fetchall())

                    cur.execute("SELECT count(*) FROM vector_chunks WHERE status = 'ACTIVE';")
                    total_chunks = cur.fetchone()[0]

                    cur.execute("SELECT tenant_id, count(*) FROM quarantine_queue WHERE status = 'PENDING' GROUP BY tenant_id;")
                    quarantine_counts = dict(cur.fetchall())

                    cur.execute("SELECT count(*) FROM compliance_audit_log;")
                    audit_count = cur.fetchone()[0]

            total_docs = sum(doc_counts.values())
            doc_breakdown = ", ".join([f"**{k}**: {v} docs" for k, v in doc_counts.items()])
            quarantine_str = ", ".join([f"**{k}**: {v} pending" for k, v in quarantine_counts.items()]) if quarantine_counts else "0 pending"

            answer = (
                f"### Platform Health & Operational Status\n\n"
                f"• **In-Force Documents**: **{total_docs}** verified policies across enterprise departments ({doc_breakdown})\n"
                f"• **Active Vector Chunks**: **{total_chunks}** 384-dimensional vector embeddings indexed in PostgreSQL pgvector\n"
                f"• **Quarantine Resolution Tank**: {quarantine_str} requiring human-in-the-loop review\n"
                f"• **Cryptographic Compliance Ledger**: **{audit_count}** immutable SHA-256 hash-chained audit entries\n"
                f"• **AI Processing Pipeline**: Local CPU-optimized `all-MiniLM-L6-v2` embedder and `DeBERTa-v3` NLI adjudicator (threshold $\\tau = 0.85$)."
            )
            return {
                "answer": answer,
                "sources": [],
                "cacheHit": False,
                "latencyMs": 8.0,
                "llmMode": "Platform Telemetry",
                "policyInForce": None,
                "pendingQuarantineBadge": None,
                "tenantId": tenant_id
            }
        except Exception as e:
            logger.warning(f"Error querying platform stats: {e}")

    # 2. List policies in a department or globally
    list_keywords = ["list policies", "what policies", "show policies", "available policies", "which policies", "show all policies", "catalog"]
    if any(k in q_low for k in list_keywords):
        target_t = tenant_id if tenant_id not in ("ALL", "GLOBAL") else None
        for t in ["hr", "finance", "legal", "engineering"]:
            if t in q_low:
                target_t = t.upper()
                break

        try:
            with db_service.get_connection() as conn:
                with conn.cursor() as cur:
                    if target_t:
                        cur.execute("""
                            SELECT name, version, effective_date, tenant_id
                            FROM documents
                            WHERE status = 'ACTIVE' AND tenant_id = %s
                            ORDER BY name;
                        """, (target_t,))
                    else:
                        cur.execute("""
                            SELECT name, version, effective_date, tenant_id
                            FROM documents
                            WHERE status = 'ACTIVE'
                            ORDER BY tenant_id, name;
                        """)
                    rows = cur.fetchall()

            if rows:
                items = []
                for r in rows:
                    c_name = clean_doc_title(r[0])
                    items.append(f"• **[{r[3]}]** {c_name} *(v{r[1]}, effective {r[2]})*")
                scope_label = f"Department: {target_t}" if target_t else "All Departments (Global)"
                answer = f"### Active Enterprise Policies ({scope_label} • {len(rows)} Documents In Force)\n\n" + "\n".join(items)
                return {
                    "answer": answer,
                    "sources": [],
                    "cacheHit": False,
                    "latencyMs": 10.0,
                    "llmMode": "Catalog Query",
                    "policyInForce": None,
                    "pendingQuarantineBadge": None,
                    "tenantId": tenant_id
                }
        except Exception as e:
            logger.warning(f"Error querying policy catalog: {e}")

    return None


def extract_best_answer(question: str, chunks: List[Dict[str, Any]]) -> str:
    """
    Intelligent Extractive RAG Answering Engine:
    - Analyzes structured governance tables and formats matching rows.
    - Semantic sentence and clause ranking using cosine similarity with all-MiniLM-L6-v2.
    - Preserves complete thoughts, bullet points, and operational thresholds.
    """
    if not chunks:
        return "I could not find this in the current policies."

    top_chunk = chunks[0]
    if top_chunk.get("similarity", 0.0) < 0.20:
        return "I could not find this in the current policies."

    # 1. Check if any top chunk contains a table that matches the question
    for chunk in chunks[:3]:
        t_ans = format_table_answer(question, chunk.get("chunkText", ""))
        if t_ans:
            return t_ans

    # 2. Collect candidate sentences/clauses from top active chunks
    candidate_sentences = []
    for chunk in chunks[:3]:
        text = chunk.get("chunkText", "").strip()
        cleaned_text = re.sub(r'[-=_]{3,}', '', text)
        cleaned_text = re.sub(r'#{1,6}\s*', '', cleaned_text)

        # Split on sentence boundaries, list items, or linebreaks
        parts = re.split(r'(?<=[.!?])\s+(?=[A-Z0-9])|\n(?=[•\-\*\d]+\s+|\bSection\b|\bArticle\b|\bDirective\b|\bTier\b)', cleaned_text)
        for s in parts:
            s_clean = s.strip()
            # Filter out divider/header fragments
            if len(s_clean) >= 25 and not re.match(r'^(SECTION|ARTICLE|CHAPTER)\s+\d+[:\s]*[A-Z\s]*$', s_clean):
                candidate_sentences.append({
                    "sentence": s_clean,
                    "chunk": chunk
                })

    if not candidate_sentences:
        top_text = top_chunk.get("chunkText", "").strip()
        return top_text[:350] + ("..." if len(top_text) > 350 else "")

    try:
        from sentence_transformers import util
        q_emb = ai_service.model.encode(question, normalize_embeddings=True)
        s_texts = [c["sentence"] for c in candidate_sentences]
        s_embs = ai_service.model.encode(s_texts, normalize_embeddings=True)
        sim_scores = util.cos_sim(q_emb, s_embs)[0].tolist()

        for i, score in enumerate(sim_scores):
            boost = 0.06 if candidate_sentences[i]["chunk"]["chunkId"] == top_chunk["chunkId"] else 0.0
            candidate_sentences[i]["score"] = float(score) + boost

        candidate_sentences.sort(key=lambda x: x["score"], reverse=True)
        best = candidate_sentences[0]

        if best["score"] < 0.24:
            return "I could not find this in the current policies."

        ans = best["sentence"]
        if ans.startswith("- ") or ans.startswith("* "):
            ans = "• " + ans[2:]

        return ans
    except Exception as e:
        logger.warning(f"Sentence ranking error: {e}")
        return candidate_sentences[0]["sentence"]


class PolicyChatService:
    def chat(self, tenant_id: str, question: str, top_k: int = 5, as_of_date: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes Current-Policy-Only RAG Chat query with strict SQL-level ACTIVE chunk filtering,
        safety net version deduplication, Redis semantic caching, and extractive synthesis.
        Supports both department-scoped queries (HR, FINANCE, LEGAL, ENGINEERING) and Global Admin (ALL).
        """
        start_time = time.perf_counter()
        t_id = tenant_id.strip().upper() if tenant_id else "HR"
        q_clean = question.strip()
        if not q_clean:
            return {
                "answer": "Please ask a question regarding enterprise policies or platform operations.",
                "sources": [],
                "cacheHit": False,
                "latencyMs": 0.0,
                "llmMode": "Extractive AI",
                "policyInForce": None,
                "pendingQuarantineBadge": None,
                "tenantId": t_id
            }

        is_global = t_id in ("ALL", "GLOBAL")

        # 0. Check Platform Telemetry / Metadata Query
        platform_ans = check_platform_query(q_clean, t_id)
        if platform_ans:
            platform_ans["latencyMs"] = round((time.perf_counter() - start_time) * 1000, 2)
            return platform_ans

        rc = db_service.redis_client
        version_counter = "0"
        if rc:
            try:
                version_counter = rc.get(f"tenant:{t_id}:policy_version") or "0"
            except Exception as e:
                logger.warning(f"Failed to read policy version counter: {e}")

        # Check Cache
        q_sha = hashlib.sha256(q_clean.lower().encode("utf-8")).hexdigest()
        date_tag = f":asof:{as_of_date}" if as_of_date else ""
        cache_key = f"rag:chat:{t_id}:{version_counter}:{q_sha}{date_tag}"

        if rc:
            try:
                cached = rc.get(cache_key)
                if cached:
                    payload = json.loads(cached)
                    payload["cacheHit"] = True
                    payload["latencyMs"] = round((time.perf_counter() - start_time) * 1000, 2)
                    return payload
            except Exception as e:
                logger.warning(f"Chat cache read failed: {e}")

        # Vector Embedding
        q_vector = ai_service.generate_embeddings([q_clean])[0]

        # CORE RULE: Query strictly WHERE status = 'ACTIVE'
        # Scoped to caller tenant, or across ALL departments if Global Admin
        query_sql = """
            SELECT vc.id, vc.document_id, vc.doc_name, vc.chunk_index, vc.chunk_text,
                   COALESCE(d.version, '1.0') AS version,
                   COALESCE(d.effective_date, '2024-01-01') AS effective_date,
                   1 - (vc.embedding <=> %s::vector) AS similarity,
                   vc.tenant_id
            FROM vector_chunks vc
            LEFT JOIN documents d ON d.id = vc.document_id
            WHERE vc.status = 'ACTIVE'
        """
        params = [q_vector]

        if not is_global:
            query_sql += " AND vc.tenant_id = %s"
            params.append(t_id)

        if as_of_date:
            query_sql += " AND COALESCE(d.effective_date, '2024-01-01') <= %s"
            params.append(as_of_date)

        query_sql += " ORDER BY vc.embedding <=> %s::vector ASC LIMIT %s;"
        params.extend([q_vector, max(12, top_k * 2)])

        retrieved_raw = []
        try:
            with db_service.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query_sql, tuple(params))
                    for r in cur.fetchall():
                        retrieved_raw.append({
                            "chunkId": r[0],
                            "documentId": r[1],
                            "docName": r[2],
                            "chunkIndex": r[3],
                            "chunkText": r[4],
                            "version": r[5],
                            "effectiveDate": r[6],
                            "similarity": round(float(r[7]), 4),
                            "tenantId": r[8] if len(r) > 8 else t_id
                        })
        except Exception as e:
            logger.error(f"Error querying active vector chunks: {e}", exc_info=True)
            return {
                "answer": f"Error querying policy database: {str(e)}",
                "sources": [],
                "cacheHit": False,
                "latencyMs": round((time.perf_counter() - start_time) * 1000, 2),
                "llmMode": "Extractive AI",
                "policyInForce": None,
                "pendingQuarantineBadge": None,
                "tenantId": t_id
            }

        # Safety Net Deduplication: If two retrieved chunks belong to the same document family/policy topic
        # but different versions, keep only the one with the latest effective date that is ACTIVE; drop the other.
        family_map: Dict[str, Dict[str, Any]] = {}
        deduped_chunks: List[Dict[str, Any]] = []

        for ch in retrieved_raw:
            fam = f"{ch.get('tenantId', '')}_{extract_policy_family(ch['docName'])}"
            if fam not in family_map:
                family_map[fam] = ch
                deduped_chunks.append(ch)
            else:
                existing = family_map[fam]
                if ch["effectiveDate"] > existing["effectiveDate"]:
                    idx = deduped_chunks.index(existing)
                    deduped_chunks[idx] = ch
                    family_map[fam] = ch

        top_chunks = deduped_chunks[:top_k]

        # Check for pending quarantine updates outside the answer text
        pending_quarantine_count = 0
        try:
            with db_service.get_connection() as conn:
                with conn.cursor() as cur:
                    if is_global:
                        cur.execute("SELECT count(*) FROM quarantine_queue WHERE status = 'PENDING';")
                    else:
                        cur.execute("SELECT count(*) FROM quarantine_queue WHERE tenant_id = %s AND status = 'PENDING';", (t_id,))
                    row = cur.fetchone()
                    if row:
                        pending_quarantine_count = row[0]
        except Exception as e:
            logger.warning(f"Could not check pending quarantine count: {e}")

        # Synthesize Answer
        answer = extract_best_answer(q_clean, top_chunks)

        # Build clean Sources
        sources = []
        for ch in top_chunks:
            sources.append({
                "chunkId": ch["chunkId"],
                "docName": clean_doc_title(ch["docName"]),
                "version": ch["version"],
                "effectiveDate": ch["effectiveDate"],
                "similarity": ch["similarity"],
                "tenantId": ch.get("tenantId", t_id),
                "snippet": ch["chunkText"][:260] + ("..." if len(ch["chunkText"]) > 260 else "")
            })

        policy_in_force = None
        if sources:
            policy_in_force = {
                "docName": sources[0]["docName"],
                "version": sources[0]["version"],
                "effectiveDate": sources[0]["effectiveDate"],
                "tenantId": sources[0].get("tenantId", t_id)
            }

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        pending_badge = f"{pending_quarantine_count} pending update in quarantine (not used in answers)" if pending_quarantine_count > 0 else None

        response_payload = {
            "answer": answer,
            "sources": sources,
            "cacheHit": False,
            "latencyMs": latency_ms,
            "llmMode": "Extractive AI",
            "policyInForce": policy_in_force,
            "pendingQuarantineBadge": pending_badge,
            "tenantId": t_id
        }

        # Save to Cache with 1 hour TTL
        if rc:
            try:
                rc.setex(cache_key, 3600, json.dumps(response_payload))
            except Exception as e:
                logger.warning(f"Chat cache write failed: {e}")

        return response_payload

    def promote_conflict(self, conflict_id: str, tenant_id: str) -> Dict[str, Any]:
        """
        Promotes incoming policy from quarantine into ACTIVE vector chunk store,
        soft-archives existing chunk, and immediately purges tenant query cache.
        """
        t_id = tenant_id.strip().upper()
        with db_service.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, document_id, existing_document, existing_chunk_id,
                           incoming_chunk_text, status
                    FROM quarantine_queue
                    WHERE id = %s AND tenant_id = %s;
                """, (conflict_id, t_id))
                row = cur.fetchone()
                if not row:
                    raise ValueError(f"Quarantine conflict [{conflict_id}] not found for tenant [{t_id}].")

                incoming_doc_id = row[1]
                existing_doc_name = row[2]
                existing_chunk_id = row[3]
                incoming_text = row[4]

                # 1. Soft-archive existing baseline chunk
                if existing_chunk_id:
                    cur.execute("""
                        UPDATE vector_chunks
                        SET status = 'ARCHIVED', superseded_by = %s
                        WHERE id = %s;
                    """, (conflict_id, existing_chunk_id))

                # 2. Insert incoming chunk as ACTIVE with 384-dim embedding
                new_chunk_id = f"chk-prom-{conflict_id}"
                new_emb = ai_service.generate_embeddings([incoming_text.strip()])[0]

                cur.execute("DELETE FROM vector_chunks WHERE id = %s;", (new_chunk_id,))
                cur.execute("""
                    INSERT INTO vector_chunks (
                        id, tenant_id, document_id, doc_name, chunk_index,
                        chunk_text, embedding, status, created_at
                    ) VALUES (
                        %s, %s, %s, %s, 0,
                        %s, %s, 'ACTIVE', NOW()
                    );
                """, (new_chunk_id, t_id, incoming_doc_id, incoming_doc_id, incoming_text.strip(), new_emb))

                # 3. Update documents table
                cur.execute("""
                    UPDATE documents
                    SET status = 'ACTIVE', version = '2.0', effective_date = '2026-04-01'
                    WHERE id = %s;
                """, (incoming_doc_id,))

                # 4. Update quarantine_queue status
                cur.execute("""
                    UPDATE quarantine_queue
                    SET status = 'PROMOTED_INCOMING', resolution_action = 'PROMOTED_INCOMING',
                        resolved_at = NOW()
                    WHERE id = %s;
                """, (conflict_id,))

            conn.commit()

        # Invalidate Cache
        rc = db_service.redis_client
        if rc:
            try:
                rc.incr(f"tenant:{t_id}:policy_version")
                rc.incr("tenant:GLOBAL:policy_version")
                rc.incr("tenant:ALL:policy_version")
                keys = rc.keys(f"rag:chat:*") + rc.keys(f"rag:query:*")
                if keys:
                    rc.delete(*keys)
            except Exception as e:
                logger.warning(f"Cache invalidation error on promote: {e}")

        return {"status": "SUCCESS", "conflictId": conflict_id, "action": "PROMOTED_INCOMING", "promotedChunkId": new_chunk_id}

    def keep_existing(self, conflict_id: str, tenant_id: str) -> Dict[str, Any]:
        """
        Rejects incoming amendment; keeps existing chunk ACTIVE; purges tenant query cache.
        """
        t_id = tenant_id.strip().upper()
        with db_service.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, document_id FROM quarantine_queue
                    WHERE id = %s AND tenant_id = %s;
                """, (conflict_id, t_id))
                row = cur.fetchone()
                if not row:
                    raise ValueError(f"Quarantine conflict [{conflict_id}] not found for tenant [{t_id}].")

                incoming_doc_id = row[1]

                # Update documents table to ARCHIVED
                cur.execute("""
                    UPDATE documents
                    SET status = 'ARCHIVED'
                    WHERE id = %s;
                """, (incoming_doc_id,))

                # Update quarantine_queue status
                cur.execute("""
                    UPDATE quarantine_queue
                    SET status = 'KEEP_EXISTING', resolution_action = 'KEEP_EXISTING',
                        resolved_at = NOW()
                    WHERE id = %s;
                """, (conflict_id,))

            conn.commit()

        # Invalidate Cache
        rc = db_service.redis_client
        if rc:
            try:
                rc.incr(f"tenant:{t_id}:policy_version")
                rc.incr("tenant:GLOBAL:policy_version")
                rc.incr("tenant:ALL:policy_version")
                keys = rc.keys(f"rag:chat:*") + rc.keys(f"rag:query:*")
                if keys:
                    rc.delete(*keys)
            except Exception as e:
                logger.warning(f"Cache invalidation error on keep: {e}")

        return {"status": "SUCCESS", "conflictId": conflict_id, "action": "KEEP_EXISTING"}


chat_service = PolicyChatService()
