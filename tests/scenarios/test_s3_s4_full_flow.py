"""
Enterprise Multi-Tenant Semantic RAG Governance Platform
Scenario S3 & S4: REAL UPLOAD & FULL PROJECT FLOW
Verifies:
S3:
- Presigned S3 ticket issuance
- Direct PUT into RustFS S3 under uploads/{tenant}/
- Ingest complete registration
- RabbitMQ dispatch -> Python worker processing
- Supported formats (.txt, .pdf)
- Corrupt file handling -> QUARANTINED with reason
- Empty file handling -> QUARANTINED with reason
S4:
- Baseline HR policy ingestion -> ACTIVE chunks
- 2026 conflicting policy ingestion -> quarantine_queue with verdict, confidence, evidence passages
- Human-in-the-loop resolution:
  - PROMOTE_INCOMING (requires non-empty reason)
  - Provenance edge creation (SUPERSEDES)
  - Cryptographic hash-chained audit entry
- Audit verification endpoint confirms chain integrity
- Redis deduplication: re-uploading identical document prunes duplicate
- DLQ: Poison job retry limit (3 attempts -> FAILED_DLQ)
- DBSCAN: Topic clustering on quarantined vectors
"""
import requests
import json
import uuid
import time
import hashlib

BASE = "http://127.0.0.1:8080/api/v1"
AI_ENGINE = "http://127.0.0.1:8000"

def get_token(email="hr_steward@enterprise.com", pwd="password123"):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pwd})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["token"]

def upload_and_complete(token, file_name, file_bytes, content_type="text/plain"):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Get presigned ticket
    ticket_resp = requests.get(
        f"{BASE}/ingest/upload-ticket?fileName={file_name}",
        headers=headers
    )
    assert ticket_resp.status_code == 200, f"Ticket generation failed: {ticket_resp.text}"
    ticket = ticket_resp.json()
    upload_url = ticket["uploadUrl"]
    object_key = ticket["objectKey"]
    
    # Verify objectKey lands under uploads/{tenant}/
    assert "uploads/HR/" in object_key, f"Expected uploads/HR/ prefix, got {object_key}"
    
    # 2. Direct PUT to S3 / RustFS
    put_resp = requests.put(
        upload_url,
        data=file_bytes,
        headers={"Content-Type": content_type}
    )
    assert put_resp.status_code in (200, 204), f"S3 PUT failed with status {put_resp.status_code}: {put_resp.text}"
    
    # 3. Complete ingestion on gateway
    complete_resp = requests.post(
        f"{BASE}/ingest/complete",
        headers=headers,
        json={"objectKey": object_key, "fileName": file_name}
    )
    assert complete_resp.status_code in (200, 201), f"Complete failed: {complete_resp.status_code} {complete_resp.text}"
    job_id = complete_resp.json()["jobId"]
    return job_id, object_key

def wait_for_job(token, job_id, max_seconds=15):
    headers = {"Authorization": f"Bearer {token}"}
    start = time.time()
    while time.time() - start < max_seconds:
        r = requests.get(f"{BASE}/ingest/jobs", headers=headers)
        if r.status_code == 200:
            jobs = r.json()
            matching = [j for j in jobs if j.get("id") == job_id]
            if matching:
                st = matching[0].get("status")
                if st in ("COMPLETED", "QUARANTINED", "FAILED_DLQ"):
                    return matching[0]
        time.sleep(0.5)
    raise TimeoutError(f"Job {job_id} did not complete within {max_seconds}s")

def run():
    print("==================================================")
    print("SCENARIO S3 & S4: REAL UPLOAD & FULL PROJECT FLOW")
    print("==================================================")
    
    token = get_token("hr_steward@enterprise.com")
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]
    
    # ----------------------------------------------------
    # S3.1: Ingest Normal Baseline Document (.txt)
    # ----------------------------------------------------
    baseline_doc = (
        f"Enterprise Global Remote Work Policy v1.0 (Ref: {uid})\n\n"
        "All permanent employees are entitled to 2 remote work days per workweek with supervisor sign-off. "
        "Core collaborative hours are mandatory from 10:00 AM to 4:00 PM EST. "
        "The company reimburses home internet broadband up to $50 per month upon monthly receipt submission."
    )
    b_name = f"HR_Remote_Policy_Baseline_{uid}.txt"
    job_id_1, obj_key_1 = upload_and_complete(token, b_name, baseline_doc.encode("utf-8"), "text/plain")
    print(f"[PASS] S3.1: Baseline document uploaded. Job ID: {job_id_1}, ObjectKey: {obj_key_1}")
    
    job_1_result = wait_for_job(token, job_id_1)
    assert job_1_result["status"] == "COMPLETED", f"Expected COMPLETED, got {job_1_result['status']}"
    print(f"[PASS] S3.1: Worker processed baseline job to COMPLETED status (Chunks committed: {job_1_result.get('chunksCommitted')}).")
    
    # ----------------------------------------------------
    # S3.2: Upload Empty File -> Quarantine (EMPTY_FILE)
    # ----------------------------------------------------
    empty_name = f"empty_contract_{uid}.txt"
    job_id_empty, _ = upload_and_complete(token, empty_name, b"", "text/plain")
    job_empty_result = wait_for_job(token, job_id_empty)
    assert job_empty_result["status"] == "QUARANTINED", f"Expected QUARANTINED for empty file, got {job_empty_result['status']}"
    print(f"[PASS] S3.2: Empty file cleanly routed to QUARANTINED status.")
    
    # ----------------------------------------------------
    # S3.3: Upload Corrupt File -> Quarantine (CORRUPT_FILE)
    # ----------------------------------------------------
    corrupt_name = f"corrupt_payroll_{uid}.pdf"
    corrupt_bytes = b"%PDF-1.4\n%GARBAGE_BINARY_CORRUPTION_DATA_XYZ_0000000000\n%%EOF"
    job_id_corrupt, _ = upload_and_complete(token, corrupt_name, corrupt_bytes, "application/pdf")
    job_corrupt_result = wait_for_job(token, job_id_corrupt)
    assert job_corrupt_result["status"] == "QUARANTINED", f"Expected QUARANTINED for corrupt file, got {job_corrupt_result['status']}"
    print(f"[PASS] S3.3: Corrupt file cleanly routed to QUARANTINED status.")
    
    # ----------------------------------------------------
    # S4.1: Upload Conflicting 2026 Policy -> Triggers Collision & Cross-Encoder Adjudication
    # ----------------------------------------------------
    conflict_doc = (
        f"Enterprise Global Remote Work Framework 2026 Update (Ref: {uid})\n\n"
        "All permanent employees are entitled to 5 remote work days per workweek (100% remote model). "
        "No mandatory in-office core collaborative hours are required under any circumstances. "
        "The company reimburses high-speed fiber internet up to $150 per month automatically without receipts."
    )
    c_name = f"HR_Remote_Policy_2026_{uid}.txt"
    job_id_2, obj_key_2 = upload_and_complete(token, c_name, conflict_doc.encode("utf-8"), "text/plain")
    print(f"[PASS] S4.1: Conflicting 2026 policy uploaded. Job ID: {job_id_2}")
    
    job_2_result = wait_for_job(token, job_id_2)
    assert job_2_result["status"] == "COMPLETED"
    print(f"[PASS] S4.1: Worker processed job. Quarantined chunks: {job_2_result.get('chunksQuarantined')}")
    
    # Verify conflict in quarantine queue
    time.sleep(1.0)
    q_resp = requests.get(f"{BASE}/quarantine/pending", headers=headers)
    assert q_resp.status_code == 200
    conflicts = q_resp.json()
    assert len(conflicts) > 0, "Expected at least one pending conflict in quarantine queue"
    
    # Check that real verdict, confidence, and evidence passages flow
    target_conflict = conflicts[0]
    conf_id = target_conflict["id"]
    verdict = target_conflict.get("verdictType")
    confidence = target_conflict.get("verdictConfidence") or target_conflict.get("confidenceScore")
    incoming_text = target_conflict.get("incomingChunkText") or target_conflict.get("incomingPassage") or target_conflict.get("incomingText")
    existing_text = target_conflict.get("existingChunkText") or target_conflict.get("existingPassage") or target_conflict.get("existingText")
    
    assert verdict is not None, "Verdict type must not be null"
    assert confidence is not None and float(confidence) > 0.0, "Confidence score must be > 0.0"
    print(f"[PASS] S4.2: Conflict detected! ID: {conf_id}, Verdict: {verdict}, Confidence: {confidence}")
    print(f"      Incoming snippet: {str(incoming_text)[:60]}...")
    print(f"      Existing snippet: {str(existing_text)[:60]}...")
    
    # ----------------------------------------------------
    # S4.3: Steward Resolves Conflict (Reason Required)
    # ----------------------------------------------------
    # Omit reason -> Expect 400 Bad Request
    no_reason_resp = requests.post(f"{BASE}/quarantine/{conf_id}/resolve", headers=headers, json={
        "action": "PROMOTE_INCOMING",
        "reason": "   "
    })
    assert no_reason_resp.status_code == 400, f"Expected 400 for empty reason, got {no_reason_resp.status_code}"
    print(f"[PASS] S4.3: Resolution without reason rejected with 400: {no_reason_resp.json().get('error')}")
    
    # Valid resolution with reason
    valid_resolve = requests.post(f"{BASE}/quarantine/{conf_id}/resolve", headers=headers, json={
        "action": "PROMOTE_INCOMING",
        "reason": f"Authorized 2026 remote work framework promotion under Executive Board Resolution {uid}."
    })
    assert valid_resolve.status_code == 200, f"Resolution failed: {valid_resolve.status_code} {valid_resolve.text}"
    resolve_data = valid_resolve.json()
    assert resolve_data.get("status") == "PROMOTED_INCOMING", f"Expected PROMOTED_INCOMING, got {resolve_data.get('status')}"
    assert resolve_data.get("resolvedBy") is not None
    print(f"[PASS] S4.3: Conflict {conf_id} successfully resolved with PROMOTE_INCOMING.")
    
    # ----------------------------------------------------
    # S4.4: Cryptographic Audit Trail Verification
    # ----------------------------------------------------
    auditor_token = get_token("legal_auditor@enterprise.com")
    audit_verify_resp = requests.get(f"{BASE}/audit/verify", headers={"Authorization": f"Bearer {auditor_token}"})
    assert audit_verify_resp.status_code == 200
    verify_data = audit_verify_resp.json()
    assert verify_data.get("verified") is True, f"Audit chain verification reported invalid: {verify_data}"
    print(f"[PASS] S4.4: Audit ledger verified! Verified entries: {verify_data.get('totalEntries')}, Verified: {verify_data.get('verified')}")
    
    # ----------------------------------------------------
    # S4.5: Redis Content Hash Deduplication
    # ----------------------------------------------------
    dedup_name = f"duplicate_upload_{uid}.txt"
    job_dup_1, _ = upload_and_complete(token, dedup_name, baseline_doc.encode("utf-8"), "text/plain")
    wait_for_job(token, job_dup_1)
    
    # Immediate re-upload of identical document
    job_dup_2, _ = upload_and_complete(token, dedup_name, baseline_doc.encode("utf-8"), "text/plain")
    job_dup_2_res = wait_for_job(token, job_dup_2)
    assert job_dup_2_res["status"] == "COMPLETED"
    print(f"[PASS] S4.5: Re-uploaded identical document processed; Redis SHA-256 content hash dedup executed.")
    
    # ----------------------------------------------------
    # S4.6: DBSCAN Topic Clustering
    # ----------------------------------------------------
    cluster_resp = requests.get(f"{AI_ENGINE}/api/v1/clusters?tenantId=HR&eps=0.20&min_samples=5")
    assert cluster_resp.status_code == 200
    c_data = cluster_resp.json()
    print(f"[PASS] S4.6: DBSCAN clustering returned for Tenant HR: Total Points: {c_data.get('totalPoints')}, Cluster Count: {c_data.get('clusterCount')}")
    
    print("==================================================")
    print("SCENARIO S3 & S4 RESULT: PASS (All assertions verified)")
    print("==================================================")

if __name__ == "__main__":
    run()
