import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
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


class ClusterRequest(BaseModel):
    tenantId: str
    eps: Optional[float] = 0.15
    min_samples: Optional[int] = 12


@app.post("/api/v1/clusters")
def get_dbscan_clusters(req: ClusterRequest):
    """
    T1.2: Unsupervised DBSCAN topic clustering on quarantined chunk vectors.
    Uses cosine distance metric (eps=0.15, min_samples=12) with PCA 2D projection.
    """
    tenant_id = req.tenantId.strip().upper()
    if not tenant_id or tenant_id in ("GLOBAL", "ALL"):
        raise HTTPException(status_code=400, detail="Specific tenantId required for clustering.")

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

    if len(rows) < req.min_samples:
        return {
            "tenantId": tenant_id,
            "clusters": [],
            "noise": [{"id": r[0], "docName": r[1], "x": 0.0, "y": 0.0} for r in rows],
            "message": f"Insufficient quarantined points ({len(rows)} found; minimum {req.min_samples} required for DBSCAN clustering). All marked as noise."
        }

    from sklearn.cluster import DBSCAN
    from sklearn.decomposition import PCA

    embeddings = []
    metadata = []
    for r in rows:
        if r[4] is not None:
            embeddings.append(list(r[4]))
            metadata.append({"id": r[0], "docName": r[1], "score": float(r[2]), "verdict": r[3]})

    if len(embeddings) < req.min_samples:
        return {
            "tenantId": tenant_id,
            "clusters": [],
            "noise": metadata,
            "message": f"Only {len(embeddings)} chunks have active embedding vectors."
        }

    X = np.array(embeddings)
    clustering = DBSCAN(eps=req.eps, min_samples=req.min_samples, metric="cosine").fit(X)
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
        "eps": req.eps,
        "minSamples": req.min_samples
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
