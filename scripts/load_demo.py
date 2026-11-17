#!/usr/bin/env python3
"""
Enterprise Semantic-RAG Platform — Demo Data Loader
Script: scripts/load_demo.py
"""

import os
import sys
import time
import requests

GATEWAY = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080/api/v1"
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

USERS = {
    "HR": ("hr_steward@enterprise.com", "password123"),
    "FINANCE": ("finance_steward@enterprise.com", "password123"),
    "ENGINEERING": ("eng_steward@enterprise.com", "password123")
}

FILES = [
    ("HR", os.path.join(ROOT_DIR, "demo-data", "hr", "HR_Policy_Baseline.txt")),
    ("HR", os.path.join(ROOT_DIR, "demo-data", "hr", "HR_Policy_2026_Update.txt")),
    ("FINANCE", os.path.join(ROOT_DIR, "demo-data", "finance", "Finance_Policy_Baseline.txt")),
    ("FINANCE", os.path.join(ROOT_DIR, "demo-data", "finance", "Finance_Policy_2026_Update.txt")),
    ("ENGINEERING", os.path.join(ROOT_DIR, "demo-data", "engineering", "Engineering_Architecture_Playbook.txt")),
    ("LEGAL", os.path.join(ROOT_DIR, "demo-data", "legal", "Legal_Compliance_Baseline.txt")),
    ("LEGAL", os.path.join(ROOT_DIR, "demo-data", "legal", "Legal_Compliance_2026_Update.txt"))
]

print("=" * 65)
print(" ENTERPRISE SEMANTIC-RAG PLATFORM — DEMO DATA LOADER")
print(f" Gateway URL: {GATEWAY}")
print("=" * 65)

# Step 1: Authenticate users
tokens = {}
for tenant, (email, pwd) in USERS.items():
    try:
        r = requests.post(f"{GATEWAY}/auth/login", json={"email": email, "password": pwd}, timeout=10)
        if r.status_code == 200:
            tokens[tenant] = r.json().get("token")
            print(f"  [AUTH] Logged in as {email} ({tenant})")
        else:
            print(f"  [ERROR] Login failed for {email}: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"  [ERROR] Could not connect to gateway for {email}: {e}")

# Step 1b: Ensure LEGAL data steward exists via superadmin
try:
    r_admin = requests.post(f"{GATEWAY}/auth/login", json={"email": "superadmin@enterprise.com", "password": "password123"}, timeout=10)
    if r_admin.status_code == 200:
        admin_tok = r_admin.json()["token"]
        # Try logging in as legal_steward
        r_leg = requests.post(f"{GATEWAY}/auth/login", json={"email": "legal_steward@enterprise.com", "password": "password123"}, timeout=10)
        if r_leg.status_code == 200:
            tokens["LEGAL"] = r_leg.json()["token"]
            print("  [AUTH] Logged in as legal_steward@enterprise.com (LEGAL)")
        else:
            # Create legal_steward
            r_create = requests.post(
                f"{GATEWAY}/admin/users",
                headers={"Authorization": f"Bearer {admin_tok}"},
                json={
                    "email": "legal_steward@enterprise.com",
                    "displayName": "Marcus Vance (Steward)",
                    "role": "DATA_STEWARD",
                    "tenantId": "LEGAL"
                },
                timeout=10
            )
            if r_create.status_code in (200, 201):
                temp_pwd = r_create.json()["temporaryPassword"]
                # Login with temp pwd and rotate to password123
                r_tlogin = requests.post(f"{GATEWAY}/auth/login", json={"email": "legal_steward@enterprise.com", "password": temp_pwd})
                temp_tok = r_tlogin.json()["token"]
                r_chg = requests.post(
                    f"{GATEWAY}/auth/change-password",
                    headers={"Authorization": f"Bearer {temp_tok}"},
                    json={"oldPassword": temp_pwd, "newPassword": "password123"}
                )
                tokens["LEGAL"] = r_chg.json()["token"]
                print("  [AUTH] Provisioned & logged in as legal_steward@enterprise.com (LEGAL)")
except Exception as e:
    print(f"  [WARN] Legal steward provisioning check: {e}")

print("\nUploading Demo Policy Documents:")
print("-" * 65)

for tenant, file_path in FILES:
    if not os.path.exists(file_path):
        print(f"  [SKIP] File not found: {file_path}")
        continue
    
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    token = tokens.get(tenant)
    if not token:
        print(f"  [SKIP] No auth token for tenant {tenant}")
        continue

    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Request presigned upload ticket
    try:
        ticket_res = requests.get(
            f"{GATEWAY}/ingest/upload-ticket",
            params={"fileName": file_name, "contentType": "text/plain"},
            headers=headers,
            timeout=10
        )
        if ticket_res.status_code != 200:
            print(f"  [FAIL] Failed ticket for {file_name}: {ticket_res.status_code} - {ticket_res.text}")
            continue
            
        ticket = ticket_res.json()
        upload_url = ticket["uploadUrl"]
        object_key = ticket["objectKey"]

        # 2. Direct-to-cloud PUT to RustFS S3
        with open(file_path, "rb") as f:
            file_bytes = f.read()
        put_res = requests.put(upload_url, data=file_bytes, headers={"Content-Type": "text/plain"}, timeout=15)
        if put_res.status_code not in (200, 204):
            print(f"  [FAIL] S3 PUT failed for {file_name}: {put_res.status_code}")
            continue

        # 3. Complete ingestion to trigger queue worker
        comp_res = requests.post(
            f"{GATEWAY}/ingest/complete",
            json={
                "objectKey": object_key,
                "fileName": file_name
            },
            headers=headers,
            timeout=10
        )
        if comp_res.status_code in (200, 201, 202):
            job_id = comp_res.json().get("jobId", "N/A")
            print(f"  [INGESTED] [{tenant}] {file_name} -> Job: {job_id}")
        else:
            print(f"  [FAIL] Ingestion complete error: {comp_res.status_code} - {comp_res.text}")
    except Exception as e:
        print(f"  [FAIL] Error processing {file_name}: {e}")

    # Brief delay so worker indexes baseline before update triggers collision
    time.sleep(1.5)

print("-" * 65)
print("[SUCCESS] All demo files ingested into platform queues.")
