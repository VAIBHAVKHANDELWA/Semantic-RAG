"""
Enterprise Multi-Tenant Semantic RAG Governance Platform
Scenario S1: ADMIN CREATES USERS
Verifies:
- hr_admin creates user in HR (temporary password shown once)
- hr_admin cannot create in FINANCE (403)
- Duplicate email rejected (400)
- Invalid role rejected (400)
- Admin cannot disable self (400)
- Super admin can manage every tenant (HR, FINANCE, LEGAL, ENGINEERING)
- Non-admin gets 403
"""
import requests
import uuid

BASE = "http://127.0.0.1:8080/api/v1"

def login(email, pwd="password123"):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pwd})
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return r.json()["token"]

def run():
    print("==================================================")
    print("SCENARIO S1: ADMIN CREATES USERS")
    print("==================================================")
    
    # 1. Login as hr_admin
    hr_token = login("hr_admin@enterprise.com")
    headers_hr = {"Authorization": f"Bearer {hr_token}"}
    print("[PASS] hr_admin logged in successfully.")
    
    # 2. hr_admin creates user in HR
    uid = uuid.uuid4().hex[:6]
    hr_user_email = f"steward_{uid}@enterprise.com"
    r = requests.post(f"{BASE}/admin/users", headers=headers_hr, json={
        "email": hr_user_email,
        "displayName": f"Steward {uid}",
        "role": "DATA_STEWARD",
        "tenantId": "HR"
    })
    assert r.status_code in (200, 201), f"Failed to create HR user: {r.status_code} {r.text}"
    user_data = r.json()
    temp_pwd = user_data.get("temporaryPassword")
    assert temp_pwd is not None and len(temp_pwd) >= 10, "Temporary password must be returned and >= 10 chars"
    print(f"[PASS] hr_admin created HR user ({hr_user_email}). Temporary password returned: ***redacted*** (length={len(temp_pwd)})")
    
    # 3. hr_admin attempts to create user in FINANCE (Expect 403)
    r = requests.post(f"{BASE}/admin/users", headers=headers_hr, json={
        "email": f"finance_illegal_{uid}@enterprise.com",
        "displayName": "Illegal User",
        "role": "DATA_STEWARD",
        "tenantId": "FINANCE"
    })
    assert r.status_code == 403, f"Expected 403 for cross-tenant user creation, got {r.status_code}"
    print(f"[PASS] Cross-tenant user creation rejected with 403 Forbidden.")
    
    # 4. Duplicate email rejected (Expect 409 or 400)
    r = requests.post(f"{BASE}/admin/users", headers=headers_hr, json={
        "email": hr_user_email,
        "displayName": "Duplicate User",
        "role": "DATA_STEWARD",
        "tenantId": "HR"
    })
    assert r.status_code in (400, 409), f"Expected 400 or 409 for duplicate email, got {r.status_code}"
    print(f"[PASS] Duplicate email rejected with {r.status_code} Conflict/Bad Request.")
    
    # 5. Invalid role rejected (Expect 400)
    r = requests.post(f"{BASE}/admin/users", headers=headers_hr, json={
        "email": f"invalid_role_{uid}@enterprise.com",
        "displayName": "Invalid Role User",
        "role": "SUPER_ADMIN_HACKER",
        "tenantId": "HR"
    })
    assert r.status_code == 400, f"Expected 400 for invalid role, got {r.status_code}"
    print(f"[PASS] Invalid role rejected with 400 Bad Request.")
    
    # 6. Admin cannot disable self (Expect 400)
    r = requests.get(f"{BASE}/admin/users", headers=headers_hr)
    assert r.status_code == 200
    hr_admin_id = next(u["id"] for u in r.json() if u["email"] == "hr_admin@enterprise.com")
    r = requests.patch(f"{BASE}/admin/users/{hr_admin_id}", headers=headers_hr, json={"active": False})
    assert r.status_code == 400, f"Expected 400 preventing admin from disabling self, got {r.status_code}"
    print(f"[PASS] Self-disable prevented with 400 Bad Request: {r.json().get('error')}")
    
    # 7. Super admin can manage every tenant
    super_token = login("superadmin@enterprise.com")
    headers_super = {"Authorization": f"Bearer {super_token}"}
    for tenant in ["HR", "FINANCE", "LEGAL", "ENGINEERING"]:
        t_uid = uuid.uuid4().hex[:4]
        r = requests.post(f"{BASE}/admin/users", headers=headers_super, json={
            "email": f"super_user_{tenant.lower()}_{t_uid}@enterprise.com",
            "displayName": f"User {tenant}",
            "role": "DATA_STEWARD",
            "tenantId": tenant
        })
        assert r.status_code in (200, 201), f"Super admin failed for tenant {tenant}: {r.status_code}"
    print(f"[PASS] Super admin successfully provisioned users across all 4 tenants (HR, FINANCE, LEGAL, ENGINEERING).")
    
    # 8. Non-admin gets 403 on admin endpoints
    steward_token = login("hr_steward@enterprise.com")
    r = requests.get(f"{BASE}/admin/users", headers={"Authorization": f"Bearer {steward_token}"})
    assert r.status_code == 403, f"Expected 403 for non-admin on /admin/users, got {r.status_code}"
    print(f"[PASS] DATA_STEWARD blocked from /admin/users with 403 Forbidden.")
    
    print("==================================================")
    print("SCENARIO S1 RESULT: PASS (All assertions verified)")
    print("==================================================")
    return hr_user_email, temp_pwd

if __name__ == "__main__":
    run()
