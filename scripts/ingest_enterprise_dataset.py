#!/usr/bin/env python3
"""
Enterprise Dataset Ingestor
Script: scripts/ingest_enterprise_dataset.py

Pushes all 60 generated enterprise policy manuals across HR, FINANCE, LEGAL,
and ENGINEERING through the live direct-to-cloud presigned S3 pipeline and
RabbitMQ ingestion queue.
"""

import os
import sys
import time
import requests

GATEWAY = "http://127.0.0.1:8080/api/v1"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "demo-data", "enterprise_dataset")

STEWARDS = {
    "HR": ("hr_steward@enterprise.com", "password123"),
    "FINANCE": ("finance_steward@enterprise.com", "password123"),
    "LEGAL": ("legal_steward@enterprise.com", "password123"),
    "ENGINEERING": ("eng_steward@enterprise.com", "password123")
}

def main():
    print("=" * 70)
    print(" INGESTING 60 ENTERPRISE POLICY MANUALS VIA DIRECT-TO-CLOUD PIPELINE")
    print(" Gateway: " + GATEWAY)
    print("=" * 70)

    # 1. Authenticate stewards per department
    tokens = {}
    for tenant, (email, pwd) in STEWARDS.items():
        try:
            r = requests.post(f"{GATEWAY}/auth/login", json={"email": email, "password": pwd}, timeout=10)
            if r.status_code == 200:
                tokens[tenant] = r.json()["token"]
                print(f"  [AUTH] Authenticated {email} ({tenant})")
            else:
                print(f"  [FAIL] Auth failed for {email}: {r.status_code} - {r.text}")
        except Exception as e:
            print(f"  [ERROR] Connection error for {email}: {e}")

    # 2. Ingest documents per tenant
    total_queued = 0
    start_time = time.time()

    for tenant in ["HR", "FINANCE", "LEGAL", "ENGINEERING"]:
        tenant_dir = os.path.join(DATASET_DIR, tenant)
        if not os.path.exists(tenant_dir):
            print(f"[WARN] Directory not found: {tenant_dir}")
            continue

        token = tokens.get(tenant)
        if not token:
            print(f"[SKIP] No token for tenant {tenant}")
            continue

        headers = {"Authorization": f"Bearer {token}"}
        files = sorted(os.listdir(tenant_dir))
        print(f"\n[INGESTING] Tenant: {tenant} ({len(files)} documents)...")

        for idx, file_name in enumerate(files, 1):
            file_path = os.path.join(tenant_dir, file_name)
            file_size = os.path.getsize(file_path)

            try:
                # 1. Get presigned upload ticket
                ticket_res = requests.get(
                    f"{GATEWAY}/ingest/upload-ticket",
                    params={"fileName": file_name, "contentType": "text/plain"},
                    headers=headers,
                    timeout=10
                )
                if ticket_res.status_code != 200:
                    print(f"  [{idx}/{len(files)}] [FAIL] Ticket error {file_name}: {ticket_res.status_code}")
                    continue

                ticket = ticket_res.json()
                upload_url = ticket["uploadUrl"]
                object_key = ticket["objectKey"]

                # 2. Direct PUT to RustFS S3
                with open(file_path, "rb") as f:
                    file_bytes = f.read()

                put_res = requests.put(
                    upload_url,
                    data=file_bytes,
                    headers={"Content-Type": "text/plain"},
                    timeout=20
                )
                if put_res.status_code not in (200, 204):
                    print(f"  [{idx}/{len(files)}] [FAIL] S3 PUT error {file_name}: {put_res.status_code}")
                    continue

                # 3. Complete ingestion on gateway
                comp_res = requests.post(
                    f"{GATEWAY}/ingest/complete",
                    json={"objectKey": object_key, "fileName": file_name},
                    headers=headers,
                    timeout=10
                )
                if comp_res.status_code in (200, 201, 202):
                    job_id = comp_res.json().get("jobId", "N/A")
                    print(f"  [{idx:02d}/{len(files):02d}] [QUEUED] {file_name} ({file_size/1024:.1f} KB) -> Job: {job_id}")
                    total_queued += 1
                else:
                    print(f"  [{idx}/{len(files)}] [FAIL] Complete error: {comp_res.status_code} {comp_res.text}")

            except Exception as e:
                print(f"  [{idx}/{len(files)}] [EXCEPTION] {file_name}: {e}")

            # Modest delay between uploads
            time.sleep(0.3)

    elapsed = time.time() - start_time
    print("\n" + "=" * 70)
    print(f" [SUCCESS] Dispatched {total_queued} documents to ingestion queues in {elapsed:.1f}s.")
    print(" Background AI Engine worker is extracting, chunking, and indexing in pgvector.")
    print("=" * 70)

if __name__ == '__main__':
    main()
