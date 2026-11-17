# DEMO_SCRIPT.md — 10-Minute Teacher Demonstration Walkthrough

This script provides an exact minute-by-minute script for presenting the **Enterprise Multi-Tenant Semantic RAG Governance Platform** to evaluation committees and faculty advisors.

---

## 0. Pre-Flight Setup (5 Minutes Before Demo)

1. Open PowerShell and run:
   ```powershell
   cd D:\major
   .\scripts\start-all.ps1
   ```
2. Verify all three services indicate `[READY]`:
   - Frontend: `http://localhost:5173`
   - Gateway: `http://localhost:8080/api/v1/health`
   - Python Engine: `http://localhost:8000/health`
3. Open browser at `http://localhost:5173` in Full Screen (F11).

---

## 1. Minute-by-Minute Presentation Plan

### [0:00 – 1:30] Introduction & Problem Statement
- **What to say**:
  > *"Good morning, professors. Traditional RAG systems retrieve documents using naive vector similarity. When an enterprise updates a policy—for example, changing remote work from 2 days to 3 days, or core hours from 9–5 to 8:30–4:30—both documents have high vector similarity (~0.95). As a result, the LLM hallucinates or retrieves contradictory clauses.*
  > *Our capstone solves this by building an Enterprise Semantic RAG Governance Platform that guarantees zero-trust multi-tenancy, automated semantic collision quarantine using cross-encoder NLI, human-in-the-loop adjudication, cryptographic hash-chained audit trails, and sub-10ms Redis query caching."*
- **Action**: Show Architecture Diagram or High-Level System Topology.

---

### [1:30 – 3:30] Scenario A: Direct-to-Cloud Ingestion & Baseline Indexing
- **What to say**:
  > *"First, let's look at secure data ingestion. The client never buffers multi-gigabyte files in the gateway. Instead, the Java Gateway generates a cryptographically signed presigned S3 PUT URL for RustFS object storage."*
- **Action**:
  1. Log in as `hr_steward@enterprise.com` (`Password123!`).
  2. Navigate to **Document Ingestion**.
  3. Drag and drop `demo-data/hr/HR_Policy_Baseline.txt`.
  4. Show real-time progress bar reach 100%.
  5. Point out the live telemetry stream showing Apache Tika extracting text and the Python AI Engine computing 384-dimensional dense vectors with pgvector indexing.

---

### [3:30 – 6:00] Scenario B: Conflict Detection & Human-in-the-Loop Quarantine
- **What to say**:
  > *"Now, the critical demonstration: a policy revision arrives with contradictory terms."*
- **Action**:
  1. Upload `demo-data/hr/HR_Policy_2026_Update.txt`.
  2. Within 2 seconds, notice the alert: **"Semantic collision detected! Routed to Quarantine"**.
  3. Click **Quarantine Queue** in the sidebar.
  4. Click on the detected conflict row.
  5. Show the **Side-by-Side Diff**:
     - *Existing*: 2 days remote work, 9:00 AM - 5:00 PM EST, $75 meal cap.
     - *Incoming*: 3 days remote work, 8:30 AM - 4:30 PM EST, $100 meal cap.
     - *DeBERTa Cross-Encoder Verdict*: `CONTRADICTORY` (Confidence: 99.2%).
  6. Attempt to click "Promote Incoming" without a reason -> Show validation: **"Resolution reason is required"**.
  7. Enter reason: *"Approved 2026 hybrid workplace policy revision"* and click **Promote Incoming**.
  8. Point out: The incoming chunk is now `ACTIVE`, and the baseline chunk is safely `ARCHIVED` (soft-archived for legal compliance, never destructively deleted).

---

### [6:00 – 7:30] Scenario C: Provenance DAG & Redis Query Cache
- **What to say**:
  > *"Every chunk maintains immutable lineage back to its source document and decision audit. Furthermore, query retrieval is cached with instant invalidation."*
- **Action**:
  1. Navigate to **Policy Documents** -> Click **HR_Policy_2026_Update.txt** -> View **Provenance Graph**. Show the visual DAG connecting document to active chunks.
  2. Open **RAG Query Playground**.
  3. Search: *"What are the core operating business hours?"*
  4. First Query: Point out latency badge **~55ms (Cache MISS: Vector Embedding + pgvector HNSW)**. Result accurately reflects 2026 updated hours (8:30 AM to 4:30 PM).
  5. Click **Submit Query** again: Point out latency badge **< 5ms (Cache HIT: Redis In-Memory)**. Explain the 10x-14x retrieval acceleration.

---

### [7:30 – 9:00] Scenario D: Cryptographic Audit Trail & Zero-Trust Isolation
- **What to say**:
  > *"Compliance mandates that no administrator can secretly alter or delete audit history. Every governance action is sealed in an immutable SHA-256 hash chain."*
- **Action**:
  1. Navigate to **Compliance Audit Logs**.
  2. Click **"Verify Cryptographic Chain"**.
  3. Show the green banner: *"Ledger Verified — 0 Tampering Detected"*, pointing out the sequential block hashes.
  4. Log out and log in as `finance_steward@enterprise.com` (`Password123!`).
  5. Show Quarantine Queue: Exactly 0 HR records visible. Zero-trust cross-tenant isolation in action.

---

### [9:00 – 10:00] Conclusion & Viva Handover
- **What to say**:
  > *"To summarize: We built an enterprise-grade semantic RAG platform integrating Spring Boot 3.2, Python FastAPI, PostgreSQL with pgvector, Redis, RabbitMQ, and RustFS S3. It prevents hallucinations from outdated documents, provides sub-10ms cached queries, and cryptographically proves data integrity.*
  > *Thank you. I am ready for any technical questions regarding the architecture, models, or implementation."*

---

## 2. Plan B: Contingency Fallback Procedures

| Potential Issue | Symptom | Immediate Fallback Action |
|---|---|---|
| **Browser UI fails to connect** | Network error in Vite console | 1. Open second PowerShell terminal.<br>2. Run `python tests/scenarios/test_s3_s4_full_flow.py`<br>3. Explain that the automated scenario suite executes the exact same REST/AMQP flow with real assertions. |
| **Java Gateway or Python hang** | 502 Bad Gateway or Timeout | 1. Run `.\scripts\stop-all.ps1`<br>2. Run `.\scripts\start-all.ps1`<br>3. Services will restart in < 25 seconds without data loss. |
| **Evaluator asks for a fresh demo run** | Need pristine database | 1. Run `.\scripts\reset-demo.ps1` (type `CONFIRM`).<br>2. Run `.\scripts\load-demo.ps1`.<br>3. Stack is instantly pre-seeded with clean baseline and conflict documents. |
| **Port 5173 busy** | Port in use | Kill node process via Task Manager or run `npx vite --port 5174`. |
