# MANUAL_UI_CHECKLIST.md — Step-by-Step UI Verification & Demo Runbook

This checklist guides manual verification of the React Web Application (`http://localhost:5173`) against the live Java Gateway (`:8080`) and Python AI Engine (`:8000`).

---

## 1. Persona Login & Navigation

| Step | Action | UI Location / Inputs | Expected Visual Output | API-Level Proof |
|:---:|---|---|---|---|
| **1.1** | Open application | Navigate to `http://localhost:5173` | Clean login card: Email, Password, Tenant Selector, "Sign In" button. | HTTP 200 on Vite dev server. |
| **1.2** | Login as System Admin | Email: `admin@enterprise.com`<br>Password: `Admin123456!` | Redirects to Admin Persona Dashboard. Top navigation displays **SYSTEM_ADMIN** badge and tenant dropdown. | `POST /api/v1/auth/login` -> 200 OK with JWT token. |
| **1.3** | User Management | Click **User Management** in left sidebar | Table displays active users across all tenants with roles and status toggles. | `GET /api/v1/admin/users` -> 200 OK list. |
| **1.4** | Switch to Data Steward | Click user menu -> Logout -> Login as `hr_steward@enterprise.com` / `Password123!` | Dashboard renders Data Steward view with **HR** tenant badge. Administrative tabs are hidden. | `POST /api/v1/auth/login` -> 200 OK. |

---

## 2. Ingestion & Direct-to-Cloud Upload

| Step | Action | UI Location / Inputs | Expected Visual Output | API-Level Proof |
|:---:|---|---|---|---|
| **2.1** | Open Ingestion Console | Click **Document Ingestion** in sidebar | Upload dropzone appears with supported types (.txt, .pdf, .docx, .json). | UI rendered. |
| **2.2** | Select & Upload Document | Drag `demo-data/hr/HR_Policy_Baseline.txt` into dropzone | Upload progress bar fills to 100%. Status changes from "Uploading" to "Processing" -> "Completed". | `GET /ingest/upload-ticket`<br>PUT directly to RustFS S3<br>`POST /ingest/complete` |
| **2.3** | Ingest Conflict Update | Upload `demo-data/hr/HR_Policy_2026_Update.txt` | Job queues. After ~2 seconds, notification appears: *"Semantic collision detected! Routed to Quarantine"*. | `ingestion_jobs` status `COMPLETED`; `quarantine_queue` receives contradictory chunk. |

---

## 3. Quarantine Conflict Adjudication (Human-in-the-Loop)

| Step | Action | UI Location / Inputs | Expected Visual Output | API-Level Proof |
|:---:|---|---|---|---|
| **3.1** | Open Quarantine Console | Click **Quarantine Queue** in sidebar | Pending conflicts table shows conflict ID, incoming policy name, confidence score (99%), and verdict badge (`CONTRADICTORY`). | `GET /api/v1/quarantine/pending` |
| **3.2** | Inspect Conflict Diff | Click conflict item row | Side-by-side diff modal opens showing:<br>• **Existing Chunk** (2 days remote work, 9-5 hours)<br>• **Incoming Chunk** (3 days remote work, 8:30-4:30 hours)<br>• DeBERTa Cross-Encoder explanation bar. | Real chunk text and scores loaded from DB. |
| **3.3** | Attempt Empty Resolution | Click "Promote Incoming" without entering justification | Form blocks submission with validation message: *"Resolution reason is required"*. | Gateway validates reason length >= 5. |
| **3.4** | Execute Resolution | Enter reason: *"Approved 2026 workplace updates"* and click **Promote Incoming** | Conflict dismissed from pending list. Toast notification appears: *"Chunk Promoted & Soft-Archived"*. | `POST /quarantine/{id}/resolve` -> status `PROMOTED_INCOMING`. Existing chunk marked `ARCHIVED`. |

---

## 4. Lineage, Provenance DAG & Document Catalog

| Step | Action | UI Location / Inputs | Expected Visual Output | API-Level Proof |
|:---:|---|---|---|---|
| **4.1** | Document Catalog | Click **Policy Documents** in sidebar | Lists all ingested documents with version, effective dates, chunk counts, and `ACTIVE` badges. | `GET /api/v1/documents` |
| **4.2** | Inspect Provenance DAG | Click on `HR_Policy_2026_Update.txt` -> View Provenance | Interactive DAG graph renders nodes: Document -> Vector Chunks -> Superseded Chunks -> Audit Log. | `GET /api/v1/provenance/{id}` |

---

## 5. RAG Retrieval & Cache Acceleration

| Step | Action | UI Location / Inputs | Expected Visual Output | API-Level Proof |
|:---:|---|---|---|---|
| **5.1** | Query Playground | Click **RAG Query Playground** | Query input bar with tenant filter. | UI rendered. |
| **5.2** | First Query (Cache MISS) | Enter: *"What are the core operating business hours?"* | Returns 2026 updated clause (8:30 AM to 4:30 PM EST). Latency badge shows `~55ms (Cache MISS)`. | `POST /api/v1/query` computes embedding + pgvector cosine distance. |
| **5.3** | Repeated Query (Cache HIT) | Click **Submit Query** again with identical text | Results instantly appear. Latency badge drops to `< 5ms (Cache HIT: Redis)`. | Retrieved from `rag:query:HR:{sha256}`. Zero vector DB query. |

---

## 6. DBSCAN Topic Clustering

| Step | Action | UI Location / Inputs | Expected Visual Output | API-Level Proof |
|:---:|---|---|---|---|
| **6.1** | Topic Clustering View | Click **Topic Clusters** in sidebar | 2D scatter plot displays policy clusters grouped by semantic density (PCA reduced). Outliers marked as noise. | `GET /api/v1/clusters?tenantId=HR&eps=0.15&min_samples=12` |
| **6.2** | Adjust Hyperparameters | Change `eps` slider to `0.20` and `min_samples` to `2` | Plot dynamically updates showing tighter departmental clusters. | Query parameters validated and forwarded to Python AI Engine. |

---

## 7. Real-Time Telemetry & Hash-Chained Audit Ledger

| Step | Action | UI Location / Inputs | Expected Visual Output | API-Level Proof |
|:---:|---|---|---|---|
| **7.1** | System Logs (SSE) | Click **System Logs** in sidebar | Live log stream displays real-time microservice events arriving over SSE (`/telemetry/stream`). | SSE connection active; zero simulated `Math.random` logs. |
| **7.2** | Audit Ledger Verification | Click **Compliance Audit** in sidebar -> Click **"Verify Cryptographic Chain"** | Green confirmation banner: *"Ledger Integrity Verified — 0 Tampering Detected"*. Total entries and head SHA-256 hash displayed. | `GET /api/v1/audit/verify` -> `{ verified: true, totalEntries: N, headHash: "..." }`. |
