"""
Live Benchmark Suite for Semantic RAG Platform.
Measures real performance across running microservices:
1. RAG Query Latency (Cache Miss vs Cache Hit, p50, p95).
2. DBSCAN Clustering Execution Time (p50, p95).
3. Adjudication Latency (DeBERTa / Heuristic inference vs Redis Cache).
4. Text Extraction Latency (Apache Tika REST API).
5. Ingest End-to-End Processing Throughput.
"""
import os
import sys
import time
import statistics
import requests

AI_ENGINE_URL = os.environ.get("AI_ENGINE_URL", "http://127.0.0.1:8000")
GATEWAY_URL = os.environ.get("GATEWAY_URL", "http://127.0.0.1:8080/api/v1")
TIKA_URL = os.environ.get("TIKA_URL", "http://127.0.0.1:9998")


def measure_query_latency(n_runs: int = 25):
    print(f"\n--- Measuring RAG Query Retrieval Latency ({n_runs} runs via persistent session) ---", flush=True)
    session = requests.Session()
    miss_latencies = []
    hit_latencies = []
    server_miss_latencies = []
    server_hit_latencies = []

    # Invalidate HR cache before test
    session.post(f"{AI_ENGINE_URL}/api/v1/query/invalidate?tenantId=HR")

    for i in range(n_runs):
        query_text = f"performance evaluation milestone review question {i} regarding company rules"
        payload = {"tenantId": "HR", "query": query_text, "top_k": 3}

        # First run: Cache Miss (Dense Embedding + pgvector cosine similarity search)
        t0 = time.perf_counter()
        r1 = session.post(f"{AI_ENGINE_URL}/api/v1/query", json=payload)
        t_miss = (time.perf_counter() - t0) * 1000.0
        if r1.status_code == 200 and not r1.json().get("cached"):
            miss_latencies.append(t_miss)
            server_miss_latencies.append(r1.json().get("latencyMs", 0.0))

        # Second run: Cache Hit (Redis In-Memory Key Lookup)
        t0 = time.perf_counter()
        r2 = session.post(f"{AI_ENGINE_URL}/api/v1/query", json=payload)
        t_hit = (time.perf_counter() - t0) * 1000.0
        if r2.status_code == 200 and r2.json().get("cached"):
            hit_latencies.append(t_hit)
            server_hit_latencies.append(r2.json().get("latencyMs", 0.0))

    miss_p50 = statistics.median(miss_latencies) if miss_latencies else 0.0
    miss_p95 = statistics.quantiles(miss_latencies, n=20)[18] if len(miss_latencies) >= 20 else max(miss_latencies or [0.0])

    hit_p50 = statistics.median(hit_latencies) if hit_latencies else 0.0
    hit_p95 = statistics.quantiles(hit_latencies, n=20)[18] if len(hit_latencies) >= 20 else max(hit_latencies or [0.0])

    srv_miss_p50 = statistics.median(server_miss_latencies) if server_miss_latencies else 0.0
    srv_hit_p50 = statistics.median(server_hit_latencies) if server_hit_latencies else 0.0

    print(f"Cache MISS Client Roundtrip: p50={miss_p50:.2f} ms | p95={miss_p95:.2f} ms (Server p50={srv_miss_p50:.2f} ms)", flush=True)
    print(f"Cache HIT Client Roundtrip:  p50={hit_p50:.2f} ms | p95={hit_p95:.2f} ms (Server p50={srv_hit_p50:.2f} ms)", flush=True)
    return {
        "miss_p50": round(miss_p50, 2), "miss_p95": round(miss_p95, 2),
        "hit_p50": round(hit_p50, 2), "hit_p95": round(hit_p95, 2),
        "server_miss_p50": round(srv_miss_p50, 2), "server_hit_p50": round(srv_hit_p50, 2)
    }


def measure_dbscan_runtime(n_runs: int = 25):
    print(f"\n--- Measuring DBSCAN Topic Clustering Runtime ({n_runs} runs) ---", flush=True)
    session = requests.Session()
    latencies = []
    for _ in range(n_runs):
        t0 = time.perf_counter()
        r = session.get(f"{AI_ENGINE_URL}/api/v1/clusters?tenantId=HR&eps=0.20&min_samples=2")
        t_elapsed = (time.perf_counter() - t0) * 1000.0
        if r.status_code == 200:
            latencies.append(t_elapsed)

    p50 = statistics.median(latencies) if latencies else 0.0
    p95 = statistics.quantiles(latencies, n=20)[18] if len(latencies) >= 20 else max(latencies or [0.0])
    print(f"DBSCAN Clustering: p50={p50:.2f} ms | p95={p95:.2f} ms (Samples: {len(latencies)})", flush=True)
    return {"p50": round(p50, 2), "p95": round(p95, 2)}


def measure_adjudication_latency(n_runs: int = 25):
    print(f"\n--- Measuring Conflict Adjudication (Cross-Encoder / Heuristic vs Redis) ---")
    sys.path.insert(0, os.path.abspath("python-ai-engine"))
    from services.conflict_service import conflict_service

    direct_latencies = []
    cache_latencies = []

    for i in range(n_runs):
        inc = f"Policy update {i}: Remote work is restricted to zero days per week mandatory."
        ex = f"Policy baseline {i}: Remote work allowed up to 3 days per week flexible."

        # Fresh evaluation
        t0 = time.perf_counter()
        v1 = conflict_service._adjudicate_heuristic(inc, ex)
        direct_latencies.append((time.perf_counter() - t0) * 1000.0)

        # Cached Redis evaluation
        conflict_service.adjudicate_conflict(inc, ex, tenant_id="HR")
        t0 = time.perf_counter()
        v2 = conflict_service.adjudicate_conflict(inc, ex, tenant_id="HR")
        cache_latencies.append((time.perf_counter() - t0) * 1000.0)

    dir_p50 = statistics.median(direct_latencies)
    cache_p50 = statistics.median(cache_latencies)
    print(f"Direct Adjudication: p50={dir_p50:.2f} ms")
    print(f"Cached Adjudication: p50={cache_p50:.2f} ms (Speedup: {dir_p50/max(0.01, cache_p50):.1f}x)")
    return {"direct_p50": round(dir_p50, 2), "cached_p50": round(cache_p50, 2)}


def measure_tika_extraction():
    print("\n--- Measuring Apache Tika Text Extraction Latency ---", flush=True)
    sample_text_bytes = b"Corporate Enterprise Policy: Annual compliance verification mandated for all departments."
    latencies = []
    for _ in range(10):
        t0 = time.perf_counter()
        try:
            r = requests.put(
                "http://localhost:9998/tika",
                data=sample_text_bytes,
                headers={"Accept": "text/plain", "Content-Type": "application/octet-stream"},
                timeout=5
            )
            if r.status_code == 200:
                latencies.append((time.perf_counter() - t0) * 1000.0)
        except Exception as e:
            print(f"Tika benchmark warning: {e}", flush=True)

    p50 = statistics.median(latencies) if latencies else 0.0
    print(f"Apache Tika Extraction: p50={p50:.2f} ms", flush=True)
    return {"tika_p50": round(p50, 2)}


def measure_ingest_throughput(n_docs: int = 10):
    print(f"\n--- Measuring End-to-End Ingestion Processing Throughput ({n_docs} documents) ---", flush=True)
    sys.path.insert(0, os.path.abspath("python-ai-engine"))
    from services.ai_service import ai_service

    sample_doc = (
        "Standard Operational Procedure 2026: All organizational personnel are mandated to follow strict security hygiene. "
        "Two-factor authentication with hardware keys is required for all production database access. "
        "Any suspicious anomalous activity must be reported to the security operations center within 15 minutes. "
        "Annual regulatory compliance audits will inspect audit trails and cryptographic hashes for verification."
    )

    t0 = time.perf_counter()
    total_chunks = 0
    for _ in range(n_docs):
        chunks = ai_service.chunk_text(sample_doc)
        embeddings = ai_service.generate_embeddings(chunks)
        total_chunks += len(chunks)

    elapsed_sec = time.perf_counter() - t0
    docs_per_sec = n_docs / max(0.001, elapsed_sec)
    chunks_per_sec = total_chunks / max(0.001, elapsed_sec)
    print(f"Ingest Throughput: {docs_per_sec:.2f} docs/sec | {chunks_per_sec:.2f} chunks/sec (Total: {total_chunks} chunks in {elapsed_sec:.2f}s)", flush=True)
    return {
        "docs_per_sec": round(docs_per_sec, 2),
        "chunks_per_sec": round(chunks_per_sec, 2),
        "total_chunks": total_chunks,
        "elapsed_sec": round(elapsed_sec, 2)
    }


if __name__ == "__main__":
    print("Executing Real System Benchmarks against Local Microservices...", flush=True)
    q = measure_query_latency(15)
    d = measure_dbscan_runtime(15)
    a = measure_adjudication_latency(15)
    t = measure_tika_extraction()
    i = measure_ingest_throughput(10)
    print("\nBenchmark Execution Complete.", flush=True)
    print(f"Summary: {q}, {d}, {a}, {t}, {i}", flush=True)
    print("\nBenchmark Execution Complete.")
    print(f"Summary: {q}, {d}, {a}, {t}")
