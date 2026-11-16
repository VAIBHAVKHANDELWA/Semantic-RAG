"""
Automated Tests for ITEM 6:
1. Real conflict verdicts with evidence passages, non-placeholder explanation, and confidence score.
2. DBSCAN clustering over chunk embeddings with configurable eps and min_samples.
3. RAG query retrieval with Redis caching, TTL, and latency tracking.
4. Cache invalidation on new document ingestion or explicit invalidation.
"""
import sys
import os
import unittest
import requests

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python-ai-engine")))

from services.conflict_service import conflict_service
from services.db_service import db_service

AI_ENGINE_URL = "http://localhost:8000"


class TestItem6RagFeatures(unittest.TestCase):

    def test_01_conflict_verdict_with_evidence_passages(self):
        """Conflict adjudication returns real verdict, confidence score, and supporting evidence passages."""
        existing_policy = "Standard Working Policy 2024: Employees are permitted to work remotely up to 3 days per week."
        incoming_policy = "Mandatory Office Attendance 2026: Remote work is strictly prohibited and all staff must report to office 5 days a week."

        verdict = conflict_service.adjudicate_conflict(incoming_policy, existing_policy, tenant_id="HR")

        self.assertTrue(verdict["conflict"])
        self.assertEqual(verdict["verdict_type"], "CONTRADICTORY")
        self.assertGreaterEqual(verdict["confidence"], 0.70)
        self.assertIn("contradiction", verdict["explanation"].lower())

        # Verify evidence passages
        self.assertIn("evidence", verdict)
        self.assertIn("incoming_passage", verdict["evidence"])
        self.assertIn("existing_passage", verdict["evidence"])
        self.assertIn("Remote work is strictly prohibited", verdict["evidence"]["incoming_passage"])
        self.assertIn("work remotely up to 3 days", verdict["evidence"]["existing_passage"])

    def test_02_dbscan_clustering_endpoint(self):
        """DBSCAN topic clustering endpoint with configurable eps and min_samples."""
        res = requests.post(f"{AI_ENGINE_URL}/api/v1/clusters", json={
            "tenantId": "HR",
            "eps": 0.20,
            "min_samples": 2
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data.get("tenantId"), "HR")
        self.assertIn("clusters", data)
        self.assertIn("noise", data)
        self.assertEqual(data.get("eps"), 0.20)
        self.assertEqual(data.get("minSamples"), 2)

    def test_03_query_retrieval_and_redis_cache(self):
        """RAG query endpoint retrieves vector chunks and serves repeated queries from Redis cache."""
        query_payload = {
            "tenantId": "HR",
            "query": "remote working hours and attendance policy",
            "top_k": 3
        }

        # First query: Cache Miss
        res1 = requests.post(f"{AI_ENGINE_URL}/api/v1/query", json=query_payload)
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()

        self.assertEqual(data1.get("tenantId"), "HR")
        self.assertFalse(data1.get("cached"))
        self.assertIn("results", data1)
        self.assertIn("latencyMs", data1)

        # Second query: Cache Hit (served from Redis)
        res2 = requests.post(f"{AI_ENGINE_URL}/api/v1/query", json=query_payload)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()

        self.assertTrue(data2.get("cached"), "Subsequent identical query must be served from Redis cache")
        self.assertEqual(len(data2["results"]), len(data1["results"]))

    def test_04_query_cache_invalidation(self):
        """Query cache invalidation flushes tenant queries so subsequent query is a fresh fetch."""
        query_payload = {
            "tenantId": "HR",
            "query": "probation period review timeline",
            "top_k": 3
        }

        # 1. Warm cache
        requests.post(f"{AI_ENGINE_URL}/api/v1/query", json=query_payload)
        res_cached = requests.post(f"{AI_ENGINE_URL}/api/v1/query", json=query_payload)
        self.assertTrue(res_cached.json().get("cached"))

        # 2. Invalidate cache for HR tenant
        inv_res = requests.post(f"{AI_ENGINE_URL}/api/v1/query/invalidate?tenantId=HR")
        self.assertEqual(inv_res.status_code, 200)
        self.assertGreaterEqual(inv_res.json().get("invalidatedEntries", 0), 1)

        # 3. Third query must now be a cache miss
        res_fresh = requests.post(f"{AI_ENGINE_URL}/api/v1/query", json=query_payload)
        self.assertFalse(res_fresh.json().get("cached"), "Query after cache invalidation must be a fresh fetch")

    def test_05_dbscan_parameter_validation_and_get_endpoint(self):
        """DBSCAN accepts query parameters on GET/POST and enforces strict input bounds."""
        # 1. Valid GET request with query params
        res_get = requests.get(f"{AI_ENGINE_URL}/api/v1/clusters?tenantId=HR&eps=0.25&min_samples=3")
        self.assertEqual(res_get.status_code, 200)
        data = res_get.json()
        self.assertEqual(data.get("eps"), 0.25)
        self.assertEqual(data.get("minSamples"), 3)

        # 2. Invalid eps (negative)
        res_bad_eps = requests.get(f"{AI_ENGINE_URL}/api/v1/clusters?tenantId=HR&eps=-0.1")
        self.assertEqual(res_bad_eps.status_code, 400)
        self.assertIn("Invalid eps", res_bad_eps.json().get("detail", ""))

        # 3. Invalid min_samples (zero)
        res_bad_ms = requests.get(f"{AI_ENGINE_URL}/api/v1/clusters?tenantId=HR&min_samples=0")
        self.assertEqual(res_bad_ms.status_code, 400)
        self.assertIn("Invalid min_samples", res_bad_ms.json().get("detail", ""))

    def test_06_gateway_provenance_edges_real_db(self):
        """Java Gateway /api/v1/provenance/{conflictId} returns real database provenance edges."""
        # Login as DATA_STEWARD for HR tenant
        login_res = requests.post("http://localhost:8080/api/v1/auth/login", json={
            "email": "hr_steward@enterprise.com",
            "password": "password123"
        })
        self.assertEqual(login_res.status_code, 200)
        token = login_res.json()["token"]

        # Insert a sample provenance edge into postgres for testing
        with db_service.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO provenance_edges (id, tenant_id, from_chunk_id, to_chunk_id, relation, created_by_conflict_id)
                    VALUES ('pe-test-prov-1', 'HR', 'chk-from-1', 'chk-to-1', 'SUPERSEDES', 'conf-prov-test-99')
                    ON CONFLICT (id) DO NOTHING;
                """)
                conn.commit()

        # Query provenance edge from Java Gateway
        prov_res = requests.get(
            "http://localhost:8080/api/v1/provenance/conf-prov-test-99",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(prov_res.status_code, 200)
        edges = prov_res.json()
        self.assertIsInstance(edges, list)
        self.assertGreaterEqual(len(edges), 1)
        self.assertEqual(edges[0]["id"], "pe-test-prov-1")
        self.assertEqual(edges[0]["relation"], "SUPERSEDES")
        self.assertEqual(edges[0]["fromChunkId"], "chk-from-1")
        self.assertEqual(edges[0]["toChunkId"], "chk-to-1")

    def test_07_cache_invalidation_on_ingest_complete(self):
        """Ingest complete endpoint automatically flushes the tenant's Redis query cache."""
        login_res = requests.post("http://localhost:8080/api/v1/auth/login", json={
            "email": "hr_steward@enterprise.com",
            "password": "password123"
        })
        token = login_res.json()["token"]

        # Warm query cache for HR
        query_payload = {
            "tenantId": "HR",
            "query": "comprehensive annual leave entitlement policy",
            "top_k": 3
        }
        requests.post(f"{AI_ENGINE_URL}/api/v1/query", json=query_payload)
        res_cached = requests.post(f"{AI_ENGINE_URL}/api/v1/query", json=query_payload)
        self.assertTrue(res_cached.json().get("cached"))

        # Ingest complete on Java Gateway
        ingest_res = requests.post(
            "http://localhost:8080/api/v1/ingest/complete",
            json={
                "objectKey": "uploads/HR/annual_leave_2026.pdf",
                "fileName": "annual_leave_2026.pdf"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(ingest_res.status_code, 201)

        # Subsequent query must now be a fresh fetch (cache invalidated)
        res_after = requests.post(f"{AI_ENGINE_URL}/api/v1/query", json=query_payload)
        self.assertFalse(res_after.json().get("cached"), "Query cache must be invalidated after ingest complete")


if __name__ == "__main__":
    unittest.main()
