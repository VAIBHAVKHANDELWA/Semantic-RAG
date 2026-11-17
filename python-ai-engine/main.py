import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
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
    """Public health check endpoint."""
    return {
        "status": "healthy",
        "service": "python-ai-engine",
        "model": "all-MiniLM-L6-v2",
        "vector_dimensions": 384
    }


@app.get("/api/v1/telemetry")
@app.get("/telemetry")
def get_telemetry():
    """
    T0.5 / ITEM 2: Real telemetry endpoint exposing counters and extraction timings from Redis.
    Counters: processed, duplicates_pruned, quarantined, dlq.
    Timings: last_extraction_latency_ms, average_extraction_latency_ms.
    """
    from services.db_service import db_service
    rc = db_service.redis_client

    if not rc:
        return {
            "status": "degraded",
            "message": "Redis disconnected; returning zeroed telemetry.",
            "processed": 0,
            "duplicates": 0,
            "quarantined": 0,
            "dlq": 0,
            "extractionLatency": {
                "lastMs": 0.0,
                "avgMs": 0.0,
                "sampleCount": 0
            }
        }

    try:
        processed = int(rc.get("metrics:processed_total") or 0)
        duplicates = int(rc.get("metrics:dedup_pruned:total") or 0)
        quarantined = int(rc.get("metrics:quarantined_total") or 0)
        dlq = int(rc.get("metrics:dlq_total") or 0)
        last_latency = float(rc.get("metrics:last_extraction_latency_ms") or 0.0)
        query_hits = int(rc.get("metrics:query:cache_hits") or 0)
        query_misses = int(rc.get("metrics:query:cache_misses") or 0)
        query_total = int(rc.get("metrics:query:total") or 0)

        raw_latencies = rc.lrange("metrics:extraction_latencies", 0, 99) or []
        latencies = [float(x) for x in raw_latencies if x]
        avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else 0.0

        return {
            "status": "healthy",
            "processed": processed,
            "duplicates": duplicates,
            "quarantined": quarantined,
            "dlq": dlq,
            "queryCache": {
                "hits": query_hits,
                "misses": query_misses,
                "total": query_total,
                "hitRate": round(query_hits / query_total, 4) if query_total > 0 else 0.0
            },
            "extractionLatency": {
                "lastMs": last_latency,
                "avgMs": avg_latency,
                "sampleCount": len(latencies)
            }
        }
    except Exception as e:
        logger.warning(f"Error querying telemetry metrics: {e}")
        return {
            "status": "error",
            "error": str(e),
            "processed": 0,
            "duplicates": 0,
            "quarantined": 0,
            "dlq": 0,
            "extractionLatency": {
                "lastMs": 0.0,
                "avgMs": 0.0,
                "sampleCount": 0
            }
        }


DEFAULT_DBSCAN_EPS = float(os.environ.get("DBSCAN_EPS", "0.15"))
DEFAULT_DBSCAN_MIN_SAMPLES = int(os.environ.get("DBSCAN_MIN_SAMPLES", "12"))


class ClusterRequest(BaseModel):
    tenantId: Optional[str] = None
    eps: Optional[float] = None
    min_samples: Optional[int] = None


@app.api_route("/api/v1/clusters", methods=["GET", "POST"])
def get_dbscan_clusters(
    req: Optional[ClusterRequest] = None,
    tenantId: Optional[str] = Query(None),
    eps: Optional[float] = Query(None),
    min_samples: Optional[int] = Query(None)
):
    """
    T1.2: Unsupervised DBSCAN topic clustering on quarantined chunk vectors.
    Uses cosine distance metric (eps=0.15, min_samples=12) with PCA 2D projection.
    Uses cosine distance metric with configurable eps and min_samples (env vars, body, or query params).
    PCA 2D projection for UI scatter plot visualization.
    """
    target_tenant = (req.tenantId if req and req.tenantId else tenantId) or ""
    tenant_id = target_tenant.strip().upper()
    if not tenant_id or tenant_id in ("GLOBAL", "ALL"):
        raise HTTPException(status_code=400, detail="Specific tenantId required for clustering.")

    effective_eps = eps if eps is not None else (req.eps if req and req.eps is not None else DEFAULT_DBSCAN_EPS)
    effective_min_samples = min_samples if min_samples is not None else (req.min_samples if req and req.min_samples is not None else DEFAULT_DBSCAN_MIN_SAMPLES)

    if effective_eps <= 0.0 or effective_eps > 2.0:
        raise HTTPException(status_code=400, detail="Invalid eps: must be between 0.01 and 2.0")
    if effective_min_samples < 1 or effective_min_samples > 1000:
        raise HTTPException(status_code=400, detail="Invalid min_samples: must be between 1 and 1000")

    from services.db_service import db_service
    import numpy as np

    try:
        with db_service.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT qq.id, qq.document_id, qq.similarity_score, qq.verdict_type, vc.embedding
                    FROM quarantine_queue qq
                    LEFT JOIN vector_chunks vc ON vc.id = qq.existing_chunk_id
                    WHERE qq.tenant_id = %s
                    LIMIT 500;
                """, (tenant_id,))
                rows = cur.fetchall()
    except Exception as e:
        logger.warning(f"Could not load vector embeddings for clustering ({e}). Generating synthetic tenant projection.")
        rows = []

    if len(rows) < effective_min_samples:
        return {
            "tenantId": tenant_id,
            "totalPoints": len(rows),
            "clusterCount": 0,
            "clusters": [],
            "noise": [{"id": r[0], "docName": r[1], "x": 0.0, "y": 0.0} for r in rows],
            "eps": effective_eps,
            "minSamples": effective_min_samples,
            "message": f"Insufficient quarantined points ({len(rows)} found; minimum {effective_min_samples} required for DBSCAN clustering). All marked as noise."
        }

    from sklearn.cluster import DBSCAN
    from sklearn.decomposition import PCA

    embeddings = []
    metadata = []
    for r in rows:
        if r[4] is not None:
            vec = r[4].to_numpy() if hasattr(r[4], 'to_numpy') else np.array(r[4])
            embeddings.append(vec)
            metadata.append({"id": r[0], "docName": r[1], "score": float(r[2]), "verdict": r[3]})

    if len(embeddings) < max(2, effective_min_samples):
        return {
            "tenantId": tenant_id,
            "totalPoints": len(embeddings),
            "clusterCount": 0,
            "clusters": [],
            "noise": metadata,
            "eps": effective_eps,
            "minSamples": effective_min_samples,
            "message": f"Only {len(embeddings)} chunks have active embedding vectors."
        }

    X = np.array(embeddings)
    clustering = DBSCAN(eps=effective_eps, min_samples=effective_min_samples, metric="cosine").fit(X)
    labels = clustering.labels_

    # PCA 2D dimensionality reduction for UI scatter canvas
    pca = PCA(n_components=2)
    coords_2d = pca.fit_transform(X)

    clusters_dict = {}
    noise_list = []

    for i, label in enumerate(labels):
        pt = {
            "id": metadata[i]["id"],
            "docName": metadata[i]["docName"],
            "score": metadata[i]["score"],
            "verdict": metadata[i]["verdict"],
            "x": round(float(coords_2d[i, 0]), 4),
            "y": round(float(coords_2d[i, 1]), 4)
        }
        if label == -1:
            noise_list.append(pt)
        else:
            clusters_dict.setdefault(int(label), []).append(pt)

    cluster_results = [
        {"clusterId": cid, "label": f"Cluster {cid+1}", "size": len(pts), "points": pts}
        for cid, pts in clusters_dict.items()
    ]

    return {
        "tenantId": tenant_id,
        "totalPoints": len(embeddings),
        "clusterCount": len(cluster_results),
        "clusters": cluster_results,
        "noise": noise_list,
        "eps": effective_eps,
        "minSamples": effective_min_samples
    }


QUERY_CACHE_TTL = int(os.environ.get("QUERY_CACHE_TTL", "3600"))

class QueryRequest(BaseModel):
    tenantId: str
    query: str
    top_k: Optional[int] = 5


@app.post("/api/v1/query")
def query_rag_knowledge_base(req: QueryRequest):
    """
    RAG Query Retrieval Endpoint with Redis Semantic Caching.
    - Caches results at 'rag:query:{tenant}:{sha256(query)}' with 1-hour TTL.
    - Invalidated automatically when new documents are committed to the tenant index.
    - Tracks cache hits and misses in Redis metrics.
    """
    import hashlib
    import json
    import time
    from services.db_service import db_service
    from services.ai_service import ai_service

    start_time = time.perf_counter()
    tenant_id = req.tenantId.strip().upper()
    if not tenant_id or tenant_id in ("GLOBAL", "ALL"):
        raise HTTPException(status_code=400, detail="Specific tenantId required for RAG query retrieval.")

    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty.")

    query_str = req.query.strip()
    query_sha = hashlib.sha256(query_str.lower().encode('utf-8')).hexdigest()
    cache_key = f"rag:query:{tenant_id}:{query_sha}"

    rc = db_service.redis_client
    if rc:
        try:
            cached_data = rc.get(cache_key)
            if cached_data:
                rc.incr("metrics:query:cache_hits")
                rc.incr("metrics:query:total")
                res = json.loads(cached_data)
                res["cached"] = True
                res["latencyMs"] = round((time.perf_counter() - start_time) * 1000, 2)
                return res
        except Exception as e:
            logger.warning(f"Query cache read failed: {e}")

    # Cache miss: Compute dense vector embedding
    embedding = ai_service.generate_embeddings([query_str])[0]

    results = []
    try:
        with db_service.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, document_id, doc_name, chunk_index, chunk_text,
                           1 - (embedding <=> %s::vector) AS similarity
                    FROM vector_chunks
                    WHERE tenant_id = %s AND status = 'ACTIVE'
                    ORDER BY embedding <=> %s::vector ASC
                    LIMIT %s;
                """, (embedding, tenant_id, embedding, req.top_k or 5))
                rows = cur.fetchall()
                for r in rows:
                    results.append({
                        "chunkId": r[0],
                        "documentId": r[1],
                        "docName": r[2],
                        "chunkIndex": r[3],
                        "chunkText": r[4],
                        "similarity": round(float(r[5]), 4)
                    })
    except Exception as e:
        logger.error(f"Error querying pgvector: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    response_payload = {
        "tenantId": tenant_id,
        "query": query_str,
        "cached": False,
        "totalResults": len(results),
        "results": results,
        "latencyMs": latency_ms
    }

    if rc:
        try:
            rc.setex(cache_key, 3600, json.dumps(response_payload))
            rc.setex(cache_key, QUERY_CACHE_TTL, json.dumps(response_payload))
            rc.incr("metrics:query:cache_misses")
            rc.incr("metrics:query:total")
        except Exception as e:
            logger.warning(f"Query cache write failed: {e}")

    return response_payload


@app.post("/api/v1/query/invalidate")
def invalidate_cache(tenantId: str):
    """Explicitly invalidates all cached query responses for a given tenant."""
    from services.db_service import db_service
    count = db_service.invalidate_tenant_query_cache(tenantId)
    return {"tenantId": tenantId.upper(), "invalidatedEntries": count}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
