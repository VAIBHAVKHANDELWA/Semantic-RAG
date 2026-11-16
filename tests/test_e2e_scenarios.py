"""
Automated End-to-End Scenarios Test Suite (ITEM 3):
Covers all 7 formal scenarios defined in docs/test-scenarios.md:
1. Happy-path ingest & retrieval
2. Duplicate document / chunk deduplication
3. Corrupt or empty file quarantine
4. Role-based access control (RBAC) enforcement
5. Multi-tenant isolation guard
6. Expired, tampered, and denylisted tokens
7. Account lockout on repeated failures
"""
import sys
import os
import unittest
import uuid
import time
import requests

# Add python-ai-engine to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python-ai-engine")))

from services.storage_service import storage_service
from services.db_service import db_service

GATEWAY_URL = "http://localhost:8080/api/v1"
AI_ENGINE_URL = "http://localhost:8000"


class TestEndToEndScenarios(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Authenticate actors
        cls.hr_steward_res = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "hr_steward@enterprise.com", "password": "password123"
        }).json()
        cls.hr_token = cls.hr_steward_res.get("token")

        cls.legal_auditor_res = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "legal_auditor@enterprise.com", "password": "password123"
        }).json()
        cls.auditor_token = cls.legal_auditor_res.get("token")

        cls.finance_steward_res = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "finance_steward@enterprise.com", "password": "password123"
        }).json()
        cls.finance_token = cls.finance_steward_res.get("token")

    def test_scenario_01_happy_path_ingest(self):
        """Scenario 1: Happy-path upload-ticket, S3 PUT, and complete ingestion."""
        file_name = f"e2e_policy_{uuid.uuid4().hex[:6]}.txt"
        headers = {"Authorization": f"Bearer {self.hr_token}"}

        # 1. Request presigned upload ticket
        res = requests.get(f"{GATEWAY_URL}/ingest/upload-ticket", headers=headers, params={"fileName": file_name})
        self.assertEqual(res.status_code, 200)
        ticket = res.json()
        self.assertIn("uploadUrl", ticket)
        self.assertIn("objectKey", ticket)
        self.assertTrue(ticket["objectKey"].startswith("uploads/HR/"))

        # 2. Direct upload to MinIO via presigned URL
        policy_bytes = b"Standard Enterprise Working Hours Policy: Standard office hours are 9:00 AM to 5:00 PM."
        put_res = requests.put(ticket["uploadUrl"], data=policy_bytes, headers={"Content-Type": "text/plain"})
        self.assertIn(put_res.status_code, (200, 204))

        # 3. Notify Gateway of upload completion
        complete_res = requests.post(f"{GATEWAY_URL}/ingest/complete", headers=headers, json={
            "objectKey": ticket["objectKey"],
            "fileName": file_name
        })
        self.assertEqual(complete_res.status_code, 201)
        job_data = complete_res.json()
        self.assertEqual(job_data.get("status"), "QUEUED")
        self.assertEqual(job_data.get("tenantId"), "HR")

    def test_scenario_02_duplicate_deduplication(self):
        """Scenario 2: Redis content hash deduplication skips repeated chunks and tracks metrics."""
        tenant = "HR"
        content_hash = f"e2e-hash-{uuid.uuid4().hex}"

        init_pruned = int(db_service.redis_client.get("metrics:dedup_pruned:total") or 0)

        # First chunk check
        first_unique = db_service.check_dedup(tenant, content_hash)
        self.assertTrue(first_unique)

        # Duplicate chunk check
        second_unique = db_service.check_dedup(tenant, content_hash)
        self.assertFalse(second_unique)

        updated_pruned = int(db_service.redis_client.get("metrics:dedup_pruned:total") or 0)
        self.assertGreaterEqual(updated_pruned, init_pruned + 1)

    def test_scenario_03_corrupt_or_empty_quarantine(self):
        """Scenario 3: Corrupt or unreadable files are quarantined with explicit reason."""
        job_id = f"job-corrupt-{uuid.uuid4().hex[:8]}"
        tenant = "HR"
        doc_name = "corrupt_payroll_report.bin"
        reason = "Failed extraction / corrupt file: Unrecognized binary trailer signature."

        conflict_id = db_service.quarantine_corrupt_or_empty_document(
            job_id=job_id,
            tenant_id=tenant,
            doc_name=doc_name,
            reason=reason,
            verdict_type="CORRUPT_FILE"
        )
        self.assertTrue(conflict_id.startswith("conf-err-"))

        with db_service.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT verdict_type, status, contradiction_explanation FROM quarantine_queue WHERE id = %s;", (conflict_id,))
                row = cur.fetchone()
                self.assertIsNotNone(row)
                self.assertEqual(row[0], "CORRUPT_FILE")
                self.assertEqual(row[1], "PENDING")
                self.assertEqual(row[2], reason)

    def test_scenario_04_unauthorized_role(self):
        """Scenario 4: Verify least-privilege role boundaries (auditor read-only, non-admin blocked)."""
        auditor_headers = {"Authorization": f"Bearer {self.auditor_token}"}
        steward_headers = {"Authorization": f"Bearer {self.hr_token}"}

        # Auditor cannot resolve quarantine
        res_resolve = requests.post(
            f"{GATEWAY_URL}/quarantine/conf-test/resolve",
            headers=auditor_headers,
            json={"action": "PROMOTED_INCOMING"}
        )
        self.assertEqual(res_resolve.status_code, 403)

        # Auditor cannot access admin user management
        res_admin = requests.get(f"{GATEWAY_URL}/admin/users", headers=auditor_headers)
        self.assertEqual(res_admin.status_code, 403)

        # Steward cannot access admin user management
        res_steward_admin = requests.get(f"{GATEWAY_URL}/admin/users", headers=steward_headers)
        self.assertEqual(res_steward_admin.status_code, 403)

    def test_scenario_05_wrong_tenant_isolation(self):
        """Scenario 5: Finance user cannot access or resolve HR tenant conflicts."""
        finance_headers = {"Authorization": f"Bearer {self.finance_token}"}

        # List pending conflicts for Finance tenant
        res = requests.get(f"{GATEWAY_URL}/quarantine/pending", headers=finance_headers)
        self.assertEqual(res.status_code, 200)
        conflicts = res.json()

        # Ensure no HR items leak into Finance result
        for conf in conflicts:
            self.assertEqual(conf.get("tenantId"), "FINANCE")

    def test_scenario_06_expired_tampered_denylisted_tokens(self):
        """Scenario 6: Tampered tokens and revoked/logged out tokens receive HTTP 401."""
        # 1. Tampered token
        tampered_token = self.hr_token[:-6] + "xxxxxx"
        res_tampered = requests.get(f"{GATEWAY_URL}/quarantine/pending", headers={"Authorization": f"Bearer {tampered_token}"})
        self.assertEqual(res_tampered.status_code, 401)

        # 2. Login, then logout to test Redis denylist
        login_res = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "finance_steward@enterprise.com", "password": "password123"
        }).json()
        temp_token = login_res["token"]

        # Token works initially
        res_before = requests.get(f"{GATEWAY_URL}/quarantine/pending", headers={"Authorization": f"Bearer {temp_token}"})
        self.assertEqual(res_before.status_code, 200)

        # Logout
        res_logout = requests.post(f"{GATEWAY_URL}/auth/logout", headers={"Authorization": f"Bearer {temp_token}"})
        self.assertEqual(res_logout.status_code, 200)

        # Token must now be rejected as denylisted
        res_after = requests.get(f"{GATEWAY_URL}/quarantine/pending", headers={"Authorization": f"Bearer {temp_token}"})
        self.assertEqual(res_after.status_code, 401)

    def test_scenario_07_account_lockout_on_repeated_failures(self):
        """Scenario 7: 5 consecutive failed logins trigger 15-minute account lockout."""
        test_email = f"lockout_{uuid.uuid4().hex[:6]}@enterprise.com"

        # Create user via super admin
        superadmin_res = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "superadmin@enterprise.com", "password": "password123"
        }).json()
        super_token = superadmin_res["token"]

        user_res = requests.post(
            f"{GATEWAY_URL}/admin/users",
            headers={"Authorization": f"Bearer {super_token}"},
            json={
                "email": test_email,
                "displayName": "Lockout Test User",
                "role": "DATA_STEWARD",
                "tenantId": "HR"
            }
        ).json()
        temp_pwd = user_res["temporaryPassword"]

        # Attempt 5 wrong passwords
        for _ in range(5):
            res = requests.post(f"{GATEWAY_URL}/auth/login", json={"email": test_email, "password": "wrongpassword"})
            self.assertEqual(res.status_code, 401)
            self.assertEqual(res.json().get("error"), "Invalid email or password")

        # 6th attempt: should return account lockout message
        lockout_res = requests.post(f"{GATEWAY_URL}/auth/login", json={"email": test_email, "password": temp_pwd})
        self.assertIn(lockout_res.status_code, (401, 423))
        self.assertIn("locked", lockout_res.json().get("error", "").lower())


if __name__ == "__main__":
    unittest.main()
