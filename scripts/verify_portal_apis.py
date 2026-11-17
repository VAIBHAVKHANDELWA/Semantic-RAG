import urllib.request
import json

def post(url, body, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method='POST')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def get(url, token=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers, method='GET')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def main():
    print("=== LIVE PORTAL API VERIFICATION ===")
    
    # 1. Login as HR Steward (Sarah Jenkins)
    login_res = post('http://localhost:8080/api/v1/auth/login', {'email': 'hr_steward@enterprise.com', 'password': 'password123'})
    token = login_res['token']
    user = login_res['user']
    print(f"1. Login OK: {user['name']} | Role: {user['role']} | Tenant: {user['tenant']}")

    # 2. Ingestion Jobs
    jobs = get('http://localhost:8080/api/v1/ingest/jobs', token)
    print(f"2. Ingestion Jobs: {len(jobs)} jobs loaded for HR.")
    if jobs:
        print(f"   First Job: {jobs[0]['fileName']} (Status: {jobs[0]['status']}, Chunks: {jobs[0]['chunkTotal']})")

    # 3. Quarantine Pending
    conflicts = get('http://localhost:8080/api/v1/quarantine/pending', token)
    print(f"3. Pending Conflicts: {len(conflicts)} collisions isolated to HR.")
    if conflicts:
        print(f"   Sample Conflict ID: {conflicts[0]['id']} | Verdict: {conflicts[0]['verdictType']} | Score: {conflicts[0]['similarityScore']:.4f}")

    # 4. Audit Logs
    audit_logs = get('http://localhost:8080/api/v1/audit/logs', token)
    print(f"4. Audit Logs: {len(audit_logs)} compliance logs returned for HR.")

    # 5. Provenance Edges
    if conflicts:
        sample_id = conflicts[0]['id']
        prov = get(f'http://localhost:8080/api/v1/provenance/{sample_id}', token)
        print(f"5. Provenance Edges: {len(prov)} edge(s) for conflict {sample_id}.")

    # 6. Telemetry Stats
    stats = get('http://localhost:8080/api/v1/telemetry/stats', token)
    print(f"6. Telemetry Stats: Pending={stats.get('pendingConflicts')}, Jobs={stats.get('totalIngestionJobs')}, DedupPruned={stats.get('duplicatesPrunedTotal')}")

    # 7. Audit Chain Verification
    verify_res = get('http://localhost:8080/api/v1/audit/verify', token)
    print(f"7. Audit Chain Verification: Verified={verify_res.get('verified')} | Total Entries={verify_res.get('totalEntries')}")

if __name__ == '__main__':
    main()
