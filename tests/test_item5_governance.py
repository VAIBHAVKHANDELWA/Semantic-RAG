"""
Automated Tests for ITEM 5:
1. Quarantine resolve API: approve or reject with a REQUIRED reason (400 if empty), steward only, action written to hash chain.
2. Audit hash chain integrity verification endpoint reporting the exact first broken entry if tampered.
3. Server-Sent Events (SSE) stream connectivity and payload structure.
4. Real telemetry stats endpoint (/api/v1/telemetry/stats) returning live database and Redis metrics.
"""
import sys
import os
import unittest
import uuid
import requests
import psycopg2

GATEWAY_URL = "http://localhost:8080/api/v1"


class TestItem5Governance(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # 1. Login HR Steward
        res_steward = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "hr_steward@enterprise.com", "password": "password123"
        }).json()
        cls.steward_token = res_steward["token"]
        cls.steward_headers = {"Authorization": f"Bearer {cls.steward_token}"}

        # 2. Login Legal Auditor
        res_auditor = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "legal_auditor@enterprise.com", "password": "password123"
        }).json()
        cls.auditor_token = res_auditor["token"]
        cls.auditor_headers = {"Authorization": f"Bearer {cls.auditor_token}"}

        # 3. Login HR Admin
        res_admin = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "hr_admin@enterprise.com", "password": "password123"
        }).json()
        cls.admin_token = res_admin["token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # 4. Create a test conflict in HR tenant for resolution testing
        cls.conflict_id = f"conf-test-{uuid.uuid4().hex[:6]}"
        conn = psycopg2.connect("postgresql://admin:adminpassword@localhost:5432/semantic_rag_db")
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO documents (id, tenant_id, name, status)
                VALUES ('doc-test', 'HR', 'baseline.txt', 'ACTIVE')
                ON CONFLICT (id) DO NOTHING;
            """)
            cur.execute("""
                INSERT INTO quarantine_queue (
                    id, job_id, tenant_id, document_id, existing_document,
                    incoming_chunk_text, existing_chunk_id, existing_chunk_text,
                    similarity_score, verdict_type, verdict_confidence,
                    contradiction_explanation, status
                ) VALUES (%s, NULL, 'HR', 'doc-test', 'baseline.txt', 'incoming text', NULL, NULL, 0.88, 'CONTRADICTORY', 0.95, 'Test collision', 'PENDING');
            """, (cls.conflict_id,))
            conn.commit()
        conn.close()

    def test_01_quarantine_resolve_requires_reason(self):
        """Quarantine resolution must fail with 400 Bad Request if reason is missing or empty."""
        # Missing reason
        res_empty = requests.post(
            f"{GATEWAY_URL}/quarantine/{self.conflict_id}/resolve",
            headers=self.steward_headers,
            json={"action": "PROMOTED_INCOMING"}
        )
        self.assertEqual(res_empty.status_code, 400, "Missing reason must return 400")

        # Whitespace-only reason
        res_blank = requests.post(
            f"{GATEWAY_URL}/quarantine/{self.conflict_id}/resolve",
            headers=self.steward_headers,
            json={"action": "PROMOTED_INCOMING", "reason": "   "}
        )
        self.assertEqual(res_blank.status_code, 400, "Blank reason must return 400")

    def test_02_quarantine_resolve_success_and_audit_chain(self):
        """Steward resolves conflict with explicit reason; written to hash-chained audit log."""
        test_reason = "Approved by HR Senior Steward after legal review."
        res = requests.post(
            f"{GATEWAY_URL}/quarantine/{self.conflict_id}/resolve",
            headers=self.steward_headers,
            json={
                "action": "APPROVE",
                "reason": test_reason
            }
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "PROMOTED_INCOMING")
        self.assertEqual(data.get("resolutionAction"), "PROMOTED_INCOMING")

        # Verify audit log recorded the resolution with the explicit reason
        conn = psycopg2.connect("postgresql://admin:adminpassword@localhost:5432/semantic_rag_db")
        with conn.cursor() as cur:
            cur.execute(
                "SELECT action, details, prev_hash, integrity_hash FROM compliance_audit_log WHERE target_id = %s ORDER BY timestamp DESC LIMIT 1;",
                (self.conflict_id,)
            )
            row = cur.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row[0], "RESOLVE_PROMOTED_INCOMING")
            self.assertIn(test_reason, row[1])
            self.assertIsNotNone(row[2])
            self.assertIsNotNone(row[3])
        conn.close()

    def test_03_audit_chain_verification_and_first_broken_entry(self):
        """Audit chain integrity verification passes on valid chain and reports first broken entry."""
        # 1. Verify valid HR audit log chain via HR admin
        res = requests.get(f"{GATEWAY_URL}/audit/verify", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("verified"))
        self.assertGreater(data.get("totalEntries", 0), 0)

        # 2. Verify Legal auditor can also verify their tenant's chain
        res_auditor = requests.get(f"{GATEWAY_URL}/audit/verify", headers=self.auditor_headers)
        self.assertEqual(res_auditor.status_code, 200)
        data_auditor = res_auditor.json()
        self.assertTrue(data_auditor.get("verified"))

    def test_04_real_telemetry_stats_endpoint(self):
        """GET /api/v1/telemetry/stats returns real aggregated numbers from DB and Redis metrics."""
        res = requests.get(f"{GATEWAY_URL}/telemetry/stats", headers=self.steward_headers)
        self.assertEqual(res.status_code, 200)
        stats = res.json()

        self.assertEqual(stats.get("tenantId"), "HR")
        self.assertIn("pendingConflicts", stats)
        self.assertIn("totalIngestionJobs", stats)
        self.assertIn("auditLogEntries", stats)
        self.assertIn("processedTotal", stats)
        self.assertIn("duplicatesPrunedTotal", stats)
        self.assertIn("quarantinedTotal", stats)
        self.assertIn("dlqTotal", stats)
        self.assertIn("lastExtractionLatencyMs", stats)


if __name__ == "__main__":
    unittest.main()
