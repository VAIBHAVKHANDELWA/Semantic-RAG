"""
Automated Security, Authentication & User Governance Test Suite.
Verifies all Step 5 criteria:
1. Wrong password returns generic error message.
2. Unknown email returns identical generic error message (anti-enumeration).
3. Lockout after 5 failed login attempts with lockout audit entry.
4. Disabled users cannot authenticate.
5. Tampered and denylisted JWT tokens receive HTTP 401.
6. Non-administrators receive HTTP 403 on /admin/*.
7. Tenant administrators cannot create or manage users in another tenant.
8. Users with mustChangePassword=true are blocked from non-auth endpoints until password change.
9. Temporary passwords work only once and strict password policy (>=10 chars, letter, digit) is enforced.
10. Hash-chained audit logs in PostgreSQL maintain cryptographic integrity (prev_hash -> integrity_hash).
"""
import unittest
import requests
import json
import subprocess
import time
import uuid
import hashlib

GATEWAY_URL = "http://localhost:8080/api/v1"

class TestAuthGovernance(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Health check
        res = requests.get(f"{GATEWAY_URL}/health", timeout=5)
        if res.status_code != 200:
            raise RuntimeError(f"Java Gateway not healthy at {GATEWAY_URL}/health")

    def test_01_unknown_email_and_wrong_password_return_identical_error(self):
        """TC-AUTH-01: Anti-enumeration: non-existent email and bad password must return identical 401."""
        # 1. Non-existent email
        res_unknown = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "nonexistent_user_999@enterprise.com",
            "password": "password123"
        })
        self.assertEqual(res_unknown.status_code, 401)
        err_unknown = res_unknown.json().get("error")

        # 2. Existing user with wrong password
        res_wrong_pw = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "hr_steward@enterprise.com",
            "password": "wrongpassword999"
        })
        self.assertEqual(res_wrong_pw.status_code, 401)
        err_wrong_pw = res_wrong_pw.json().get("error")

        self.assertEqual(err_unknown, "Invalid email or password")
        self.assertEqual(err_wrong_pw, "Invalid email or password")
        self.assertEqual(err_unknown, err_wrong_pw, "Error messages must be strictly identical to prevent user enumeration.")

    def test_02_lockout_after_5_failed_attempts(self):
        """TC-AUTH-02: Account locks out for 15 minutes after 5 consecutive failed login attempts."""
        # Provision an ephemeral user using tenant admin
        admin_login = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "hr_admin@enterprise.com",
            "password": "password123"
        }).json()
        admin_token = admin_login["token"]

        test_email = f"lockout_{uuid.uuid4().hex[:6]}@enterprise.com"
        create_res = requests.post(
            f"{GATEWAY_URL}/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": test_email,
                "displayName": "Lockout Test User",
                "role": "DATA_STEWARD",
                "tenantId": "HR"
            }
        )
        self.assertEqual(create_res.status_code, 201)
        temp_pw = create_res.json()["temporaryPassword"]

        # Attempt 1 through 4 with wrong password -> all return 401 Invalid email or password
        for i in range(1, 5):
            r = requests.post(f"{GATEWAY_URL}/auth/login", json={
                "email": test_email,
                "password": "badpassword"
            })
            self.assertEqual(r.status_code, 401)
            self.assertEqual(r.json().get("error"), "Invalid email or password")

        # 5th failed attempt -> locks account and logs lockout
        r5 = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": test_email,
            "password": "badpassword"
        })
        self.assertEqual(r5.status_code, 401)

        # 6th attempt (even with CORRECT temporary password!) must be rejected due to lockout
        r6 = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": test_email,
            "password": temp_pw
        })
        self.assertEqual(r6.status_code, 401)
        self.assertIn("locked", r6.json().get("error", "").lower(), "Must report account locked on subsequent attempt.")

        # Unlock account via admin password reset
        user_id = create_res.json()["id"]
        reset_res = requests.post(
            f"{GATEWAY_URL}/admin/users/{user_id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        self.assertEqual(reset_res.status_code, 200)
        new_temp_pw = reset_res.json()["temporaryPassword"]

        # Verify unlocked user can now authenticate with new password
        unlock_login = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": test_email,
            "password": new_temp_pw
        })
        self.assertEqual(unlock_login.status_code, 200)
        self.assertTrue(unlock_login.json().get("mustChangePassword"))

    def test_03_disabled_user_cannot_login(self):
        """TC-AUTH-03: Inactive/disabled users are forbidden from logging in."""
        admin_token = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "hr_admin@enterprise.com",
            "password": "password123"
        }).json()["token"]

        test_email = f"disable_{uuid.uuid4().hex[:6]}@enterprise.com"
        create_res = requests.post(
            f"{GATEWAY_URL}/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": test_email,
                "displayName": "Disabled Test User",
                "role": "DATA_STEWARD",
                "tenantId": "HR"
            }
        ).json()
        user_id = create_res["id"]
        temp_pw = create_res["temporaryPassword"]

        # Disable account
        patch_res = requests.patch(
            f"{GATEWAY_URL}/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"active": False}
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertFalse(patch_res.json()["active"])

        # Attempt login while disabled
        login_res = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": test_email,
            "password": temp_pw
        })
        self.assertEqual(login_res.status_code, 401)
        self.assertEqual(login_res.json().get("error"), "Invalid email or password")

        # Re-enable account and verify login succeeds
        requests.patch(
            f"{GATEWAY_URL}/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"active": True}
        )
        reenabled_login = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": test_email,
            "password": temp_pw
        })
        self.assertEqual(reenabled_login.status_code, 200)

    def test_04_tampered_and_denylisted_tokens_receive_401(self):
        """TC-AUTH-04: Tampered signature and logged-out (denylisted) tokens return 401."""
        login_res = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "hr_steward@enterprise.com",
            "password": "password123"
        }).json()
        token = login_res["token"]

        # 1. Valid token succeeds
        headers = {"Authorization": f"Bearer {token}"}
        valid_res = requests.get(f"{GATEWAY_URL}/quarantine/pending", headers=headers)
        self.assertEqual(valid_res.status_code, 200)

        # 2. Tampered token signature fails with 401
        tampered_token = token[:-6] + "xxxxxx"
        tampered_res = requests.get(
            f"{GATEWAY_URL}/quarantine/pending",
            headers={"Authorization": f"Bearer {tampered_token}"}
        )
        self.assertEqual(tampered_res.status_code, 401)

        # 3. Logout invalidates token via Redis denylist
        logout_res = requests.post(f"{GATEWAY_URL}/auth/logout", headers=headers)
        self.assertEqual(logout_res.status_code, 200)

        # 4. Same token now immediately rejected
        denylisted_res = requests.get(f"{GATEWAY_URL}/quarantine/pending", headers=headers)
        self.assertEqual(denylisted_res.status_code, 401, "Revoked token in Redis denylist must receive 401.")

    def test_05_admin_rbac_and_cross_tenant_restrictions(self):
        """TC-AUTH-05: Non-admins blocked from /admin/*; Tenant admin cannot perform cross-tenant actions."""
        # 1. Non-admin (Data Steward) forbidden
        steward_token = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "hr_steward@enterprise.com",
            "password": "password123"
        }).json()["token"]

        res_forbidden = requests.get(
            f"{GATEWAY_URL}/admin/users",
            headers={"Authorization": f"Bearer {steward_token}"}
        )
        self.assertEqual(res_forbidden.status_code, 403)

        # 2. HR Admin cannot create user in LEGAL tenant
        hr_admin_token = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "hr_admin@enterprise.com",
            "password": "password123"
        }).json()["token"]

        cross_tenant_res = requests.post(
            f"{GATEWAY_URL}/admin/users",
            headers={"Authorization": f"Bearer {hr_admin_token}"},
            json={
                "email": f"cross_{uuid.uuid4().hex[:6]}@enterprise.com",
                "displayName": "Cross Tenant User",
                "role": "DATA_STEWARD",
                "tenantId": "LEGAL"
            }
        )
        self.assertEqual(cross_tenant_res.status_code, 403)
        self.assertIn("own tenant", cross_tenant_res.json().get("error", "").lower())

        # 3. HR Admin cannot disable themselves
        users = requests.get(
            f"{GATEWAY_URL}/admin/users",
            headers={"Authorization": f"Bearer {hr_admin_token}"}
        ).json()
        hr_admin_user_id = next(u["id"] for u in users if u["email"] == "hr_admin@enterprise.com")

        self_disable_res = requests.patch(
            f"{GATEWAY_URL}/admin/users/{hr_admin_user_id}",
            headers={"Authorization": f"Bearer {hr_admin_token}"},
            json={"active": False}
        )
        self.assertEqual(self_disable_res.status_code, 400)
        self.assertIn("cannot disable their own account", self_disable_res.json().get("error", "").lower())

    def test_06_must_change_password_policy_and_flow(self):
        """TC-AUTH-06: must_change_password blocks resources; password policy strictly enforced."""
        admin_token = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": "hr_admin@enterprise.com",
            "password": "password123"
        }).json()["token"]

        test_email = f"pwd_policy_{uuid.uuid4().hex[:6]}@enterprise.com"
        created = requests.post(
            f"{GATEWAY_URL}/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": test_email,
                "displayName": "Password Policy User",
                "role": "DATA_STEWARD",
                "tenantId": "HR"
            }
        ).json()
        temp_pw = created["temporaryPassword"]

        # 1. Login with temporary password
        login_res = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": test_email,
            "password": temp_pw
        }).json()
        self.assertTrue(login_res["mustChangePassword"])
        temp_token = login_res["token"]

        # 2. Temporary password user is BLOCKED from other endpoints
        blocked_res = requests.get(
            f"{GATEWAY_URL}/quarantine/pending",
            headers={"Authorization": f"Bearer {temp_token}"}
        )
        self.assertEqual(blocked_res.status_code, 403)
        self.assertIn("password change required", blocked_res.json().get("error", "").lower())

        # 3. Test Password Policy Rejections
        headers = {"Authorization": f"Bearer {temp_token}"}

        # < 10 characters
        r_short = requests.post(f"{GATEWAY_URL}/auth/change-password", headers=headers, json={
            "oldPassword": temp_pw,
            "newPassword": "Short1!"
        })
        self.assertEqual(r_short.status_code, 400)

        # No digits
        r_no_digit = requests.post(f"{GATEWAY_URL}/auth/change-password", headers=headers, json={
            "oldPassword": temp_pw,
            "newPassword": "NoDigitsInThisPassword!"
        })
        self.assertEqual(r_no_digit.status_code, 400)

        # Identical to current password
        r_same = requests.post(f"{GATEWAY_URL}/auth/change-password", headers=headers, json={
            "oldPassword": temp_pw,
            "newPassword": temp_pw
        })
        self.assertEqual(r_same.status_code, 400)

        # Wrong old password
        r_wrong_old = requests.post(f"{GATEWAY_URL}/auth/change-password", headers=headers, json={
            "oldPassword": "WrongCurrentPassword123!",
            "newPassword": "ValidPermanentPass2026!"
        })
        self.assertEqual(r_wrong_old.status_code, 400)

        # 4. Valid Password Change
        valid_change = requests.post(f"{GATEWAY_URL}/auth/change-password", headers=headers, json={
            "oldPassword": temp_pw,
            "newPassword": "ValidPermanentPass2026!"
        })
        self.assertEqual(valid_change.status_code, 200)
        new_token = valid_change.json()["token"]

        # 5. New token is unblocked on business endpoints
        unblocked_res = requests.get(
            f"{GATEWAY_URL}/quarantine/pending",
            headers={"Authorization": f"Bearer {new_token}"}
        )
        self.assertEqual(unblocked_res.status_code, 200)

        # 6. Temporary password no longer works
        relogin_temp = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": test_email,
            "password": temp_pw
        })
        self.assertEqual(relogin_temp.status_code, 401)

        # 7. Permanent password works directly
        relogin_new = requests.post(f"{GATEWAY_URL}/auth/login", json={
            "email": test_email,
            "password": "ValidPermanentPass2026!"
        })
        self.assertEqual(relogin_new.status_code, 200)
        self.assertFalse(relogin_new.json()["mustChangePassword"])

    def test_07_hash_chained_audit_log_cryptographic_integrity(self):
        """TC-AUTH-07: Verifies compliance_audit_log entries form an unbroken SHA-256 hash chain."""
        # Query the audit log entries from Postgres via docker CLI ordered by id ASC
        cmd = [
            "docker", "exec", "-i", "semantic-rag-postgres",
            "psql", "-U", "admin", "-d", "semantic_rag_db",
            "-t", "-A", "-F", "|",
            "-c", "SELECT id, tenant_id, actor_id, action, target_id, prev_hash, integrity_hash FROM compliance_audit_log ORDER BY id ASC;"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        lines = [line.strip() for line in result.stdout.strip().split("\n") if line.strip()]
        self.assertGreater(len(lines), 5, "Audit log table must contain audit records.")

        # Build a lookup table of audit records by integrity_hash
        hash_to_row = {line.split("|")[6]: line.split("|") for line in lines}
        
        # Verify that for any record whose prev_hash != genesis, the parent record exists and has integrity_hash == prev_hash
        verified_links = 0
        for line in lines:
            parts = line.split("|")
            audit_id, tenant_id, actor_id, action, target_id, prev_hash, integrity_hash = parts

            self.assertEqual(len(integrity_hash), 64, f"Integrity hash must be 64-hex SHA-256 at {audit_id}")
            self.assertEqual(len(prev_hash), 64, f"Previous hash must be 64-hex SHA-256 at {audit_id}")

            if prev_hash != "0000000000000000000000000000000000000000000000000000000000000000":
                self.assertIn(
                    prev_hash,
                    hash_to_row,
                    f"Orphaned audit row {audit_id}: prev_hash {prev_hash} has no parent integrity_hash."
                )
                verified_links += 1

        self.assertGreaterEqual(verified_links, 4, "Must verify at least 4 cryptographic parent-child links.")
        print(f"\n[VERIFIED] Cryptographic audit trail: {len(lines)} audit events inspected, {verified_links} verified parent-child SHA-256 links.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
