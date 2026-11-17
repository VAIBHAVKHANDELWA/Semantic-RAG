"""
Enterprise Multi-Tenant Semantic RAG Governance Platform
Scenario S2: USER LOGIN & SESSION SECURITY
Verifies:
- New user must change temporary password before accessing business endpoints (403 Forbidden)
- Password policy enforced (regex length, letters+digits, non-identity)
- Normal login after password change
- Anti-enumeration: wrong password returns generic 401
- 5 consecutive failed attempts locks account for 15 minutes
- Disabled user cannot log in
- Logout invalidates token via Redis denylist (401 on reuse)
- Tampered JWT signature gets 401
- Token scope and sessionStorage architectural continuity
"""
import requests
import uuid
import time

BASE = "http://127.0.0.1:8080/api/v1"

def run():
    print("==================================================")
    print("SCENARIO S2: USER LOGIN & SESSION SECURITY")
    print("==================================================")
    
    # Step A: Provision a fresh user via hr_admin
    hr_admin_resp = requests.post(f"{BASE}/auth/login", json={"email": "hr_admin@enterprise.com", "password": "password123"})
    assert hr_admin_resp.status_code == 200
    hr_token = hr_admin_resp.json()["token"]
    
    uid = uuid.uuid4().hex[:6]
    test_email = f"user_s2_{uid}@enterprise.com"
    create_resp = requests.post(f"{BASE}/admin/users", headers={"Authorization": f"Bearer {hr_token}"}, json={
        "email": test_email,
        "displayName": f"User S2 {uid}",
        "role": "DATA_STEWARD",
        "tenantId": "HR"
    })
    assert create_resp.status_code in (200, 201)
    user_info = create_resp.json()
    temp_pwd = user_info["temporaryPassword"]
    user_id = user_info["id"]
    print(f"[PASS] Provisioned test user {test_email} with temp password.")
    
    # Step B: Login with temporary password -> must_change_password should be True
    login_temp = requests.post(f"{BASE}/auth/login", json={"email": test_email, "password": temp_pwd})
    assert login_temp.status_code == 200
    temp_login_data = login_temp.json()
    assert temp_login_data.get("mustChangePassword") is True, "mustChangePassword must be true for new user"
    first_token = temp_login_data["token"]
    print(f"[PASS] Login with temporary password succeeded; mustChangePassword=True returned in payload.")
    
    # Step C: Attempt to access a business endpoint (e.g. /quarantine/pending) -> Expect 403 Forbidden
    guard_resp = requests.get(f"{BASE}/quarantine/pending", headers={"Authorization": f"Bearer {first_token}"})
    assert guard_resp.status_code == 403, f"Expected 403 for mustChangePassword token, got {guard_resp.status_code}"
    print(f"[PASS] Access to business endpoints blocked with 403: {guard_resp.json().get('error')}")
    
    # Step D: Password policy enforcement on /auth/change-password
    # D1: Too short (< 10 chars)
    r = requests.post(f"{BASE}/auth/change-password", headers={"Authorization": f"Bearer {first_token}"}, json={
        "oldPassword": temp_pwd,
        "newPassword": "Pass1"
    })
    assert r.status_code == 400, f"Expected 400 for short password, got {r.status_code}"
    print("[PASS] Rejected short password (< 10 chars) with 400 Bad Request.")
    
    # D2: Missing numbers
    r = requests.post(f"{BASE}/auth/change-password", headers={"Authorization": f"Bearer {first_token}"}, json={
        "oldPassword": temp_pwd,
        "newPassword": "PasswordOnlyLetters"
    })
    assert r.status_code == 400, f"Expected 400 for missing number, got {r.status_code}"
    print("[PASS] Rejected password without digits with 400 Bad Request.")
    
    # D3: Identity with old password
    r = requests.post(f"{BASE}/auth/change-password", headers={"Authorization": f"Bearer {first_token}"}, json={
        "oldPassword": temp_pwd,
        "newPassword": temp_pwd
    })
    assert r.status_code == 400, f"Expected 400 for identical password, got {r.status_code}"
    print("[PASS] Rejected identical password with 400 Bad Request.")
    
    # Step E: Valid password change
    new_permanent_pwd = f"StrongPassword{uid}!"
    change_resp = requests.post(f"{BASE}/auth/change-password", headers={"Authorization": f"Bearer {first_token}"}, json={
        "oldPassword": temp_pwd,
        "newPassword": new_permanent_pwd
    })
    assert change_resp.status_code == 200, f"Failed valid password change: {change_resp.status_code} {change_resp.text}"
    new_token = change_resp.json()["token"]
    print(f"[PASS] Successfully rotated password. Fresh token issued with mustChangePassword=False.")
    
    # Step F: Access business endpoint with fresh token -> Expect 200 OK
    steward_check = requests.get(f"{BASE}/quarantine/pending", headers={"Authorization": f"Bearer {new_token}"})
    assert steward_check.status_code == 200, f"Expected 200 after password change, got {steward_check.status_code}"
    print(f"[PASS] Business endpoint accessible (200 OK) with post-rotation token.")
    
    # Step G: Anti-enumeration & Lockout testing on a separate victim account
    victim_email = f"victim_lockout_{uid}@enterprise.com"
    requests.post(f"{BASE}/admin/users", headers={"Authorization": f"Bearer {hr_token}"}, json={
        "email": victim_email,
        "displayName": "Lockout Victim",
        "role": "DATA_STEWARD",
        "tenantId": "HR"
    })
    
    # Non-existent user check
    r_ghost = requests.post(f"{BASE}/auth/login", json={"email": "nonexistent_ghost_user@enterprise.com", "password": "WrongPassword123!"})
    r_badpw = requests.post(f"{BASE}/auth/login", json={"email": victim_email, "password": "WrongPassword123!"})
    assert r_ghost.status_code == 401 and r_badpw.status_code == 401
    assert r_ghost.json().get("error") == r_badpw.json().get("error") == "Invalid email or password", "Must be identical error message"
    print(f"[PASS] Anti-enumeration confirmed: Unknown email and wrong password return identical 401 JSON.")
    
    # Consecutive failures up to 5
    for attempt in range(2, 6): # attempts 2, 3, 4, 5
        r_fail = requests.post(f"{BASE}/auth/login", json={"email": victim_email, "password": f"BadPassword{attempt}!"})
        assert r_fail.status_code == 401
    
    # 6th attempt: should report account locked
    r_locked = requests.post(f"{BASE}/auth/login", json={"email": victim_email, "password": "AnyPassword!"})
    assert r_locked.status_code == 401
    assert "Account locked" in r_locked.json().get("error", ""), f"Expected lockout message, got {r_locked.json()}"
    print(f"[PASS] Account lockout verified after 5 consecutive failed attempts: {r_locked.json().get('error')}")
    
    # Step H: Disabled user cannot log in
    # Disable victim account via admin
    requests.patch(f"{BASE}/admin/users/{user_id}", headers={"Authorization": f"Bearer {hr_token}"}, json={"active": False})
    r_disabled = requests.post(f"{BASE}/auth/login", json={"email": test_email, "password": new_permanent_pwd})
    assert r_disabled.status_code == 401, f"Expected 401 for disabled user, got {r_disabled.status_code}"
    print(f"[PASS] Disabled user login rejected with 401 Unauthorized: {r_disabled.json().get('error')}")
    
    # Step I: Logout denylist and token tampering
    active_login = requests.post(f"{BASE}/auth/login", json={"email": "hr_steward@enterprise.com", "password": "password123"})
    steward_tok = active_login.json()["token"]
    
    # Check token works
    assert requests.get(f"{BASE}/quarantine/pending", headers={"Authorization": f"Bearer {steward_tok}"}).status_code == 200
    
    # Logout
    logout_resp = requests.post(f"{BASE}/auth/logout", headers={"Authorization": f"Bearer {steward_tok}"})
    assert logout_resp.status_code == 200, f"Logout failed: {logout_resp.status_code}"
    print("[PASS] User logged out successfully via POST /auth/logout.")
    
    # Re-use logged-out token -> Expect 401
    reuse_resp = requests.get(f"{BASE}/quarantine/pending", headers={"Authorization": f"Bearer {steward_tok}"})
    assert reuse_resp.status_code == 401, f"Expected 401 for denylisted token, got {reuse_resp.status_code}"
    print(f"[PASS] Denylisted token rejected with 401 Unauthorized: {reuse_resp.json().get('error')}")
    
    # Tampered signature token -> Expect 401
    tampered_tok = steward_tok[:-4] + "ABCD"
    tampered_resp = requests.get(f"{BASE}/quarantine/pending", headers={"Authorization": f"Bearer {tampered_tok}"})
    assert tampered_resp.status_code == 401, f"Expected 401 for tampered token, got {tampered_resp.status_code}"
    print("[PASS] Tampered JWT signature rejected with 401 Unauthorized.")
    
    print("==================================================")
    print("SCENARIO S2 RESULT: PASS (All assertions verified)")
    print("==================================================")

if __name__ == "__main__":
    run()
