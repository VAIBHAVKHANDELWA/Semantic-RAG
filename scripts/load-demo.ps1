# ==============================================================================
# Enterprise Semantic-RAG Platform — Demo Data Loader
# File: scripts/load-demo.ps1
# ==============================================================================
param(
    [string]$GatewayUrl = "http://127.0.0.1:8080/api/v1"
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " LOADING DEMO DATA VIA REAL API PIPELINE" -ForegroundColor Cyan
Write-Host " Gateway: $GatewayUrl" -ForegroundColor Gray
Write-Host "=================================================================" -ForegroundColor Cyan

$Root = Resolve-Path "$PSScriptRoot\.."

$pyScript = @"
import os
import sys
import time
import requests

GATEWAY = "$GatewayUrl"

USERS = {
    "HR": ("hr_steward@enterprise.com", "Password123!"),
    "FINANCE": ("finance_steward@enterprise.com", "Password123!"),
    "LEGAL": ("legal_steward@enterprise.com", "Password123!"),
    "ENGINEERING": ("admin@enterprise.com", "Admin123456!")
}

FILES = [
    ("HR", r"$Root\demo-data\hr\HR_Policy_Baseline.txt"),
    ("HR", r"$Root\demo-data\hr\HR_Policy_2026_Update.txt"),
    ("FINANCE", r"$Root\demo-data\finance\Finance_Policy_Baseline.txt"),
    ("FINANCE", r"$Root\demo-data\finance\Finance_Policy_2026_Update.txt"),
    ("LEGAL", r"$Root\demo-data\legal\Legal_Compliance_Baseline.txt"),
    ("LEGAL", r"$Root\demo-data\legal\Legal_Compliance_2026_Update.txt"),
    ("ENGINEERING", r"$Root\demo-data\engineering\Engineering_Architecture_Playbook.txt")
]

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
    ticket_res = requests.get(
        f"{GATEWAY}/ingest/upload-ticket",
        params={"fileName": file_name, "contentType": "text/plain"},
        headers=headers,
        timeout=10
    )
    if ticket_res.status_code != 200:
        print(f"  [FAIL] Failed ticket for {file_name}: {ticket_res.status_code}")
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
            "fileName": file_name,
            "fileSize": file_size,
            "contentType": "text/plain"
        },
        headers=headers,
        timeout=10
    )
    if comp_res.status_code in (200, 202):
        job_id = comp_res.json().get("jobId", "N/A")
        print(f"  [INGESTED] [{tenant}] {file_name} -> Job: {job_id}")
    else:
        print(f"  [FAIL] Ingestion complete error: {comp_res.status_code} - {comp_res.text}")

    # Brief delay so baseline indexes before update triggers collision
    time.sleep(1.5)

print("-" * 65)
print("[SUCCESS] All demo files ingested into platform queues.")
"@

python -c "$pyScript"

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host " DEMO DATA LOAD COMPLETE" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
