import requests

AI_ENGINE = "http://127.0.0.1:8000"

queries = [
    ("HR", "What is the policy for parental leave and caregiver support?"),
    ("FINANCE", "What are the capital expenditure and SOX 404 approval limits?"),
    ("LEGAL", "What are the cross-border data transfer and GDPR DSAR requirements?"),
    ("ENGINEERING", "What are the zero trust architecture and encryption key standards?")
]

print("=" * 65)
print(" TESTING RAG RETRIEVAL ACROSS 4 DEPARTMENTS (60-DOC CORPUS)")
print("=" * 65)

for tenant, query in queries:
    # First query: Cache MISS
    r1 = requests.post(f"{AI_ENGINE}/api/v1/query", json={"tenantId": tenant, "query": query, "top_k": 3})
    d1 = r1.json()
    cached1 = d1.get("cached", False)
    lat1 = d1.get("latencyMs", 0)
    results1 = d1.get("results", [])

    print(f"[{tenant}] Query: \"{query}\"")
    print(f"  -> Q1 (MISS): Latency={lat1:.2f}ms | Cached={cached1} | Results Retrieved={len(results1)}")
    if results1:
        top = results1[0]
        snippet = top.get("chunkText", "")[:120].replace("\n", " ")
        doc = top.get("docName", "N/A")
        sim = top.get("similarity", 0)
        print(f"     Doc: {doc}")
        print(f"     Cosine Similarity: {sim:.4f}")
        print(f"     Snippet: {snippet}...")

    # Second query: Cache HIT (Redis)
    r2 = requests.post(f"{AI_ENGINE}/api/v1/query", json={"tenantId": tenant, "query": query, "top_k": 3})
    d2 = r2.json()
    cached2 = d2.get("cached", False)
    lat2 = d2.get("latencyMs", 0)
    print(f"  -> Q2 (HIT) : Latency={lat2:.2f}ms | Cached={cached2} (Redis In-Memory Fast-Path)")
    print()

print("=" * 65)
print(" TESTING DBSCAN TOPIC CLUSTERING ACROSS 4 DEPARTMENTS")
print("=" * 65)

for tenant in ["HR", "FINANCE", "LEGAL", "ENGINEERING"]:
    rc = requests.get(f"{AI_ENGINE}/api/v1/clusters?tenantId={tenant}&eps=0.25&min_samples=2")
    cdata = rc.json()
    pts = cdata.get("total_points", 0)
    num_clust = cdata.get("cluster_count", 0)
    clusters = cdata.get("clusters", [])
    print(f"[{tenant}] Chunks Clustered: {pts} | Thematic Clusters Discovered: {num_clust}")
    for c in clusters[:2]:
        topic = c.get('representative_topic', 'General')[:60].replace('\n', ' ')
        print(f"       -> Cluster {c.get('cluster_id')}: {c.get('size')} chunks (Topic: {topic}...)")
    print()
