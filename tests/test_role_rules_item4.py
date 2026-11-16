"""
Unit and Integration Tests for ITEM 4: Strict RBAC Matrix and Tenant Isolation
Validates:
1. COMPLIANCE_AUDITOR: Read-only access to audit logs and verify; blocked (403) from all other endpoints
   (ingest, quarantine resolve, jobs, provenance, admin user management).
2. DATA_STEWARD: Full access to ingest and quarantine resolution; blocked (403) from audit logs and admin user management.
3. SYSTEM_ADMIN: User management and audit oversight; blocked (403) from steward conflict resolution and upload tickets.
4. Cross-Tenant Ingest Guard: Blocking ingest/complete when objectKey or tenantId targets another tenant (403).
5. Unauthenticated rejection (401) on all protected endpoints without token.
"""
import sys
import os
import unittest
import uuid
import requests

GATEWAY_URL = "http://localhost:8080/api/v1"
AI_ENGINE_URL = "http://localhost:8000"


class TestRoleRulesItem4(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # 1. Login HR Data Steward
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

        # 3. Login HR Admin (Tenant Admin)
        res_admin = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "hr_admin@enterprise.com", "password": "password123"
        }).json()
        cls.admin_token = res_admin["token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

    def test_01_auditor_permissions(self):
        """Auditor may read audit logs and verify chain, but gets 403 on everything else."""
        # Allowed endpoints
        res_logs = requests.get(f"{GATEWAY_URL}/audit/logs", headers=self.auditor_headers)
        self.assertEqual(res_logs.status_code, 200, "Auditor must be permitted to read audit logs")

        res_verify = requests.get(f"{GATEWAY_URL}/audit/verify", headers=self.auditor_headers)
        self.assertEqual(res_verify.status_code, 200, "Auditor must be permitted to verify audit chain")

        # Prohibited endpoints (must return 403)
        res_upload = requests.get(f"{GATEWAY_URL}/ingest/upload-ticket?fileName=test.txt", headers=self.auditor_headers)
        self.assertEqual(res_upload.status_code, 403, "Auditor must receive 403 on upload-ticket")

        res_complete = requests.post(f"{GATEWAY_URL}/ingest/complete", headers=self.auditor_headers, json={
            "objectKey": "uploads/HR/test.txt"
        })
        self.assertEqual(res_complete.status_code, 403, "Auditor must receive 403 on ingest complete")

        res_jobs = requests.get(f"{GATEWAY_URL}/ingest/jobs", headers=self.auditor_headers)
        self.assertEqual(res_jobs.status_code, 403, "Auditor must receive 403 on ingest jobs")

        res_quarantine = requests.get(f"{GATEWAY_URL}/quarantine/pending", headers=self.auditor_headers)
        self.assertEqual(res_quarantine.status_code, 403, "Auditor must receive 403 on quarantine pending")

        res_resolve = requests.post(f"{GATEWAY_URL}/quarantine/conf-test/resolve", headers=self.auditor_headers, json={
            "action": "PROMOTED_INCOMING"
        })
        self.assertEqual(res_resolve.status_code, 403, "Auditor must receive 403 on quarantine resolve")

        res_admin = requests.get(f"{GATEWAY_URL}/admin/users", headers=self.auditor_headers)
        self.assertEqual(res_admin.status_code, 403, "Auditor must receive 403 on admin users")

    def test_02_steward_permissions(self):
        """Steward can upload and resolve conflicts, but gets 403 on audit logs and admin user management."""
        # Allowed endpoints
        res_ticket = requests.get(f"{GATEWAY_URL}/ingest/upload-ticket?fileName=steward_doc.txt", headers=self.steward_headers)
        self.assertEqual(res_ticket.status_code, 200)

        res_jobs = requests.get(f"{GATEWAY_URL}/ingest/jobs", headers=self.steward_headers)
        self.assertEqual(res_jobs.status_code, 200)

        res_quarantine = requests.get(f"{GATEWAY_URL}/quarantine/pending", headers=self.steward_headers)
        self.assertEqual(res_quarantine.status_code, 200)

        # Prohibited endpoints (must return 403)
        res_audit = requests.get(f"{GATEWAY_URL}/audit/logs", headers=self.steward_headers)
        self.assertEqual(res_audit.status_code, 403, "Steward must receive 403 on audit logs")

        res_verify = requests.get(f"{GATEWAY_URL}/audit/verify", headers=self.steward_headers)
        self.assertEqual(res_verify.status_code, 403, "Steward must receive 403 on audit verify")

        res_admin = requests.get(f"{GATEWAY_URL}/admin/users", headers=self.steward_headers)
        self.assertEqual(res_admin.status_code, 403, "Steward must receive 403 on admin user management")

    def test_03_admin_permissions(self):
        """Admin manages users and reviews audit logs, but gets 403 on conflict resolution and upload tickets."""
        # Allowed endpoints
        res_users = requests.get(f"{GATEWAY_URL}/admin/users", headers=self.admin_headers)
        self.assertEqual(res_users.status_code, 200)

        res_audit = requests.get(f"{GATEWAY_URL}/audit/logs", headers=self.admin_headers)
        self.assertEqual(res_audit.status_code, 200)

        # Prohibited endpoints (must return 403)
        res_resolve = requests.post(f"{GATEWAY_URL}/quarantine/conf-test/resolve", headers=self.admin_headers, json={
            "action": "PROMOTED_INCOMING"
        })
        self.assertEqual(res_resolve.status_code, 403, "Admin must receive 403 on conflict resolution")

        res_ticket = requests.get(f"{GATEWAY_URL}/ingest/upload-ticket?fileName=admin_test.txt", headers=self.admin_headers)
        self.assertEqual(res_ticket.status_code, 403, "Admin must receive 403 on upload ticket")

    def test_04_cross_tenant_ingest_guard(self):
        """Cross-tenant ingest/complete attempts return 403 Forbidden."""
        # HR steward attempts to pass explicit target tenantId: FINANCE
        res_cross_tenant = requests.post(f"{GATEWAY_URL}/ingest/complete", headers=self.steward_headers, json={
            "objectKey": "uploads/HR/doc.txt",
            "tenantId": "FINANCE"
        })
        self.assertEqual(res_cross_tenant.status_code, 403, "Must reject cross-tenant target with 403")

        # HR steward attempts to pass objectKey in another tenant's namespace
        res_cross_key = requests.post(f"{GATEWAY_URL}/ingest/complete", headers=self.steward_headers, json={
            "objectKey": "uploads/FINANCE/finance_report.pdf",
            "tenantId": "HR"
        })
        self.assertEqual(res_cross_key.status_code, 403, "Must reject cross-tenant objectKey with 403")

    def test_05_unauthenticated_negative_cases(self):
        """Protected endpoints without Authorization header must return 401 Unauthorized."""
        endpoints = [
            ("GET", f"{GATEWAY_URL}/ingest/jobs"),
            ("GET", f"{GATEWAY_URL}/ingest/upload-ticket?fileName=test.txt"),
            ("POST", f"{GATEWAY_URL}/ingest/complete"),
            ("GET", f"{GATEWAY_URL}/quarantine/pending"),
            ("GET", f"{GATEWAY_URL}/audit/logs"),
            ("GET", f"{GATEWAY_URL}/admin/users"),
            ("GET", f"{GATEWAY_URL}/telemetry/stream")
        ]

        for method, url in endpoints:
            if method == "GET":
                res = requests.get(url)
            else:
                res = requests.post(url, json={})
            self.assertEqual(res.status_code, 401, f"Expected 401 for unauthenticated {method} {url}, got {res.status_code}")


if __name__ == "__main__":
    unittest.main()
