"""
Enterprise Multi-Tenant Semantic RAG Governance Platform
Scenario S5: EARLIER POLICIES & RAG QUERY RETRIEVAL
Verifies:
- Steward lists policy documents of their tenant (/api/v1/documents)
- Document detail view with metadata and chunk state history (/api/v1/documents/{id}, /chunks)
- Provenance graph shows what superseded or contradicted what (/api/v1/provenance/{id})
- RAG query endpoint (/api/v1/query) returns only ACTIVE passages
- Query caching: second identical query is cached with hit/miss telemetry
- Cache invalidation: new document ingestion purges cached queries for that tenant
"""
import requests
import json
import uuid
import time

GATEWAY = "http://127.0.0.1:8080/api/v1"
AI_ENGINE = "http://127.0.0.1:8000"

def get_token(email="hr_steward@enterprise.com", pwd="password123"):
    r = requests.post(f"{GATEWAY}/auth/login", json={"email": email, "password": pwd})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["token"]

def run():
    print("==================================================")
    print("SCENARIO S5: EARLIER POLICIES & RAG QUERY")
    print("==================================================")
    
    token = get_token("hr_steward@enterprise.com")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. List earlier policy documents for tenant HR
    docs_resp = requests.get(f"{GATEWAY}/documents", headers=headers)
    assert docs_resp.status_code == 200, f"Failed to list documents: {docs_resp.text}"
    docs = docs_resp.json()
    assert len(docs) > 0, "Expected at least 1 document for tenant HR"
    print(f"[PASS] S5.1: Successfully listed {len(docs)} documents for Tenant HR.")
    
    sample_doc = docs[0]
    doc_id = sample_doc["id"]
    print(f"      Document sample: [{sample_doc.get('status')}] {sample_doc.get('name')} (v{sample_doc.get('version')}, effective: {sample_doc.get('effectiveDate')})")
    
    # 2. Open document details & chunks
    detail_resp = requests.get(f"{GATEWAY}/documents/{doc_id}", headers=headers)
    assert detail_resp.status_code == 200
    doc_detail = detail_resp.json()
    assert doc_detail["id"] == doc_id
    
    chunks_resp = requests.get(f"{GATEWAY}/documents/{doc_id}/chunks", headers=headers)
    assert chunks_resp.status_code == 200
    chunks = chunks_resp.json()
    print(f"[PASS] S5.2: Document detail retrieved for ID [{doc_id}]. Associated chunks: {len(chunks)}.")
    
    # 3. Provenance DAG edges
    # Retrieve provenance edges
    prov_resp = requests.get(f"{GATEWAY}/provenance/conf-hr-0001", headers=headers)
    assert prov_resp.status_code == 200
    edges = prov_resp.json()
    print(f"[PASS] S5.3: Provenance graph retrieved. Found {len(edges)} DAG edges for conflict reference.")
    
    # 4. RAG Query endpoint (/api/v1/query) - Returns only ACTIVE passages
    query_text = "What is the policy regarding remote work and broadband stipend?"
    
    # Run query 1 (Expect cache MISS)
    t0 = time.perf_counter()
    q1_resp = requests.post(f"{AI_ENGINE}/api/v1/query", json={
        "tenantId": "HR",
        "query": query_text
    })
    t_miss = (time.perf_counter() - t0) * 1000
    assert q1_resp.status_code == 200, f"Query 1 failed: {q1_resp.text}"
    q1_data = q1_resp.json()
    assert q1_data.get("cached") is False, "First query should be cache MISS"
    passages = q1_data.get("passages", [])
    print(f"[PASS] S5.4: RAG Query 1 (MISS) returned {len(passages)} passages in {t_miss:.2f}ms.")
    for p in passages:
        assert p.get("status") == "ACTIVE", f"Expected ACTIVE passage only, got {p.get('status')}"
    
    # Run query 2 identical (Expect cache HIT)
    t0 = time.perf_counter()
    q2_resp = requests.post(f"{AI_ENGINE}/api/v1/query", json={
        "tenantId": "HR",
        "query": query_text
    })
    t_hit = (time.perf_counter() - t0) * 1000
    assert q2_resp.status_code == 200
    q2_data = q2_resp.json()
    assert q2_data.get("cached") is True, "Second identical query must be cache HIT"
    print(f"[PASS] S5.5: RAG Query 2 (HIT) returned from Redis in {t_hit:.2f}ms (Speedup: {t_miss/max(t_hit, 0.01):.1f}x).")
    
    # 5. Cache Invalidation on Ingest Complete
    # Simulate an ingest complete event for Tenant HR
    uid = uuid.uuid4().hex[:6]
    dummy_obj_key = f"uploads/HR/{uid}-test_invalidation_policy.txt"
    inv_resp = requests.post(f"{GATEWAY}/ingest/complete", headers=headers, json={
        "objectKey": dummy_obj_key,
        "fileName": "test_invalidation_policy.txt"
    })
    assert inv_resp.status_code in (200, 201)
    print(f"[PASS] S5.6: Ingest complete triggered for Tenant HR.")
    
    # Query 3 after invalidation (Expect cache MISS)
    q3_resp = requests.post(f"{AI_ENGINE}/api/v1/query", json={
        "tenantId": "HR",
        "query": query_text
    })
    assert q3_resp.status_code == 200
    q3_data = q3_resp.json()
    assert q3_data.get("cached") is False, "Query after new ingest must be cache MISS due to invalidation"
    print(f"[PASS] S5.7: Query cache invalidation verified: Query 3 resulted in cache MISS.")
    
    print("==================================================")
    print("SCENARIO S5 RESULT: PASS (All assertions verified)")
    print("==================================================")

if __name__ == "__main__":
    run()
