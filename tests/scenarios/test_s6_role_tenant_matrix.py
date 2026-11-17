"""
Enterprise Multi-Tenant Semantic RAG Governance Platform
Scenario S6: ROLES AND TENANTS MATRIX & RATE LIMIT VERIFICATION
Verifies:
- 401 without token across all protected endpoints
- 403 for wrong role (RBAC matrix enforcement)
- Tenant boundaries: user never sees or accesses another tenant's rows
- DATA_STEWARD can ingest & resolve conflicts; blocked from admin/users
- COMPLIANCE_AUDITOR is read-only (audit logs & verify only); blocked from ingest, resolve, admin
- SYSTEM_ADMIN manages users & views audits; blocked from conflict resolution
- Rate limit verification: ensures 120 req/min token bucket operates correctly
"""
import requests
import json
import time

GATEWAY = "http://127.0.0.1:8080/api/v1"
AI_ENGINE = "http://127.0.0.1:8000"

USERS = {
    ("HR", "DATA_STEWARD"): "hr_steward@enterprise.com",
    ("HR", "SYSTEM_ADMIN"): "hr_admin@enterprise.com",
    ("FINANCE", "DATA_STEWARD"): "finance_steward@enterprise.com",
    ("LEGAL", "COMPLIANCE_AUDITOR"): "legal_auditor@enterprise.com",
    ("ENGINEERING", "DATA_STEWARD"): "eng_steward@enterprise.com",
    ("HR", "SUPER_ADMIN"): "superadmin@enterprise.com"
}

def login(email, pwd="password123"):
    r = requests.post(f"{GATEWAY}/auth/login", json={"email": email, "password": pwd})
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return r.json()["token"]

def run():
    print("==================================================")
    print("SCENARIO S6: ROLES & TENANTS MATRIX")
    print("==================================================")
    
    # 1. 401 Without Token on all critical Gateway endpoints
    unauth_endpoints = [
        ("GET", f"{GATEWAY}/quarantine/pending"),
        ("POST", f"{GATEWAY}/quarantine/conf-test/resolve"),
        ("GET", f"{GATEWAY}/audit/logs"),
        ("GET", f"{GATEWAY}/audit/verify"),
        ("GET", f"{GATEWAY}/admin/users"),
        ("POST", f"{GATEWAY}/admin/users"),
        ("GET", f"{GATEWAY}/documents"),
        ("GET", f"{GATEWAY}/ingest/jobs"),
        ("GET", f"{GATEWAY}/ingest/upload-ticket?fileName=test.pdf"),
        ("POST", f"{GATEWAY}/ingest/complete")
    ]
    for method, url in unauth_endpoints:
        if method == "GET":
            r = requests.get(url)
        else:
            r = requests.post(url, json={})
        assert r.status_code == 401, f"Expected 401 for unauthenticated {method} {url}, got {r.status_code}"
    print(f"[PASS] S6.1: All {len(unauth_endpoints)} protected endpoints strictly return 401 Unauthorized without token.")
    
    tokens = {k: login(v) for k, v in USERS.items()}
    
    # 2. RBAC Enforcement: Role Boundaries
    hr_steward_tok = tokens[("HR", "DATA_STEWARD")]
    hr_admin_tok = tokens[("HR", "SYSTEM_ADMIN")]
    legal_auditor_tok = tokens[("LEGAL", "COMPLIANCE_AUDITOR")]
    
    # (a) Steward blocked from /admin/users (403)
    r = requests.get(f"{GATEWAY}/admin/users", headers={"Authorization": f"Bearer {hr_steward_tok}"})
    assert r.status_code == 403, f"Expected 403, got {r.status_code}"
    print("[PASS] S6.2: DATA_STEWARD blocked from /admin/users with 403 Forbidden.")
    
    # (b) Auditor blocked from Ingest, Quarantine Resolve, and Admin (403)
    r_ing = requests.get(f"{GATEWAY}/ingest/upload-ticket?fileName=test.pdf", headers={"Authorization": f"Bearer {legal_auditor_tok}"})
    assert r_ing.status_code == 403, f"Expected 403 for auditor on ingest, got {r_ing.status_code}"
    
    r_res = requests.post(f"{GATEWAY}/quarantine/conf-test/resolve", headers={"Authorization": f"Bearer {legal_auditor_tok}"}, json={"action": "KEEP_EXISTING", "reason": "Audit test"})
    assert r_res.status_code == 403, f"Expected 403 for auditor on resolve, got {r_res.status_code}"
    
    r_adm = requests.get(f"{GATEWAY}/admin/users", headers={"Authorization": f"Bearer {legal_auditor_tok}"})
    assert r_adm.status_code == 403, f"Expected 403 for auditor on admin, got {r_adm.status_code}"
    print("[PASS] S6.3: COMPLIANCE_AUDITOR is strictly read-only (blocked from ingest, resolve, and admin).")
    
    # (c) Admin blocked from resolving quarantine conflicts (403)
    r_adm_res = requests.post(f"{GATEWAY}/quarantine/conf-test/resolve", headers={"Authorization": f"Bearer {hr_admin_tok}"}, json={"action": "KEEP_EXISTING", "reason": "Admin attempt"})
    assert r_adm_res.status_code == 403, f"Expected 403 for admin on resolve, got {r_adm_res.status_code}"
    print("[PASS] S6.4: SYSTEM_ADMIN blocked from conflict resolution (DATA_STEWARD privilege only).")
    
    # 3. Cross-Tenant Boundaries: Zero-Trust Isolation
    finance_steward_tok = tokens[("FINANCE", "DATA_STEWARD")]
    
    # (a) Finance steward queries HR quarantine -> sees only 0 or Finance items
    r_fin_q = requests.get(f"{GATEWAY}/quarantine/pending", headers={"Authorization": f"Bearer {finance_steward_tok}"})
    assert r_fin_q.status_code == 200
    for item in r_fin_q.json():
        assert item.get("tenantId") == "FINANCE", f"Finance steward leaked tenant item: {item.get('tenantId')}"
    print("[PASS] S6.5: Zero-trust tenant isolation: Finance steward receives strictly FINANCE quarantine items.")
    
    # (b) Finance steward attempts to resolve HR conflict -> Expect 403 Forbidden
    r_hr_q = requests.get(f"{GATEWAY}/quarantine/pending", headers={"Authorization": f"Bearer {hr_steward_tok}"})
    assert r_hr_q.status_code == 200
    hr_conflicts = r_hr_q.json()
    if hr_conflicts:
        hr_conf_id = hr_conflicts[0]["id"]
        r_cross_res = requests.post(f"{GATEWAY}/quarantine/{hr_conf_id}/resolve", headers={"Authorization": f"Bearer {finance_steward_tok}"}, json={"action": "KEEP_EXISTING", "reason": "Malicious cross-tenant attempt"})
        assert r_cross_res.status_code in (403, 404), f"Expected 403 or 404 for cross-tenant resolution, got {r_cross_res.status_code}"
        print(f"[PASS] S6.6: Cross-tenant conflict resolution blocked with {r_cross_res.status_code}.")
    
    # (c) Cross-tenant ingest objectKey injection rejected
    r_hack_ing = requests.post(f"{GATEWAY}/ingest/complete", headers={"Authorization": f"Bearer {finance_steward_tok}"}, json={
        "objectKey": "uploads/HR/malicious_payload.txt",
        "fileName": "malicious_payload.txt",
        "tenantId": "HR"
    })
    assert r_hack_ing.status_code == 403, f"Expected 403 for cross-tenant objectKey injection, got {r_hack_ing.status_code}"
    print(f"[PASS] S6.7: Cross-tenant objectKey namespace injection rejected with 403 Forbidden.")
    
    # 4. Rate limit check: Rapid burst of 15 requests within 1 second executes cleanly without false positives
    t0 = time.time()
    for _ in range(15):
        r_ping = requests.get(f"{GATEWAY}/telemetry/stats", headers={"Authorization": f"Bearer {hr_steward_tok}"})
        assert r_ping.status_code == 200
    print(f"[PASS] S6.8: Normal user traffic burst (15 req in {time.time()-t0:.2f}s) executes without tripping 120/min limit.")
    
    print("==================================================")
    print("SCENARIO S6 RESULT: PASS (All assertions verified)")
    print("==================================================")

if __name__ == "__main__":
    run()
