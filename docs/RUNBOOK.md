# Enterprise Multi-Tenant Semantic RAG Governance Platform
## Operations Runbook & System Architecture Guide

---

### 1. Architectural Topology Overview

The platform decouples high-throughput document ingestion, asynchronous semantic vector processing, deterministic policy collision detection, and compliance auditing across dedicated microservice layers:

```
+---------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER                                 |
|      React 19 SPA (Vite) | Tailwind CSS v4 | React Flow (DAG) | Recharts Telemetry   |
+---------------------------------------------------------------------------------------+
                                          |  ^
              Direct-to-Cloud Upload /    |  | Real-Time SSE Telemetry
              JWT Authenticated REST      |  | & Conflict Alerts
                                          v  |
+---------------------------------------------------------------------------------------+
|                              INGRESS & GATEWAY LAYER (Java 21)                        |
|  Spring Boot 3.2 | Spring Security (RBAC) | MinIO/S3 Ticket Issuer | SseConnectionMgr |
+---------------------------------------------------------------------------------------+
                |                                                 ^
    Asynchronous Document Task                                    | Telemetry Event
    (jobId, tenantId, objectKey)                                  | (Queue: telemetry-queue)
                v                                                 |
+---------------------------------------------------------------------------------------+
|                               MESSAGE BROKER (RabbitMQ)                               |
|        Durable Queue: raw-document-queue | Consumer QoS Prefetch: 5 Messages          |
+---------------------------------------------------------------------------------------+
                |
    Pika Worker Stream Listener
                v
+---------------------------------------------------------------------------------------+
|                              AI ENGINE MICROSERVICE (Python 3.13)                     |
|  LangChain Chunking | SentenceTransformers (all-MiniLM-L6-v2) | DBSCAN Topic Cluster  |
+---------------------------------------------------------------------------------------+
                |                                                 |
    Vector Distance Search &                                      | Direct In-Memory
    Relational Quarantine Routing                                 | Deduplication Cache
                v                                                 v
+-----------------------------------------------+ +-------------------------------------+
|        DATA STORAGE (PostgreSQL 16)           | |         CACHE LAYER (Redis 7)       |
|  - Table: vector_chunks (pgvector 384-dim)    | |  - SHA-256 Text Duplicate Pruning   |
|  - Table: quarantine_queue (Flagged Collisions| |  - Sliding Window Tenant Rate Limits|
|  - Table: compliance_audit_log (Forensic Hash)| |  - In-Memory Semantic Prompt Cache  |
+-----------------------------------------------+ +-------------------------------------+
```

---

### 2. Service Component Ports & Protocols

| Service Name | Port | Protocol / Transport | Purpose |
| :--- | :--- | :--- | :--- |
| **Java API Gateway** | `8080` | HTTP / REST & SSE | JWT Auth, S3 Ticket Generator, Governance API, SSE stream |
| **Python AI Engine** | `8000` | HTTP / REST | FastAPI healthcheck, DBSCAN clustering, Adjudication endpoints |
| **PostgreSQL 16** | `5432` | TCP (pgvector, pgcrypto) | Relational metadata, HNSW vector index, Audit trail |
| **RabbitMQ AMQP** | `5672` | AMQP 0-9-1 | Task queue (`raw-document-queue`) & Telemetry (`telemetry-queue`) |
| **RabbitMQ Console** | `15672` | HTTP Management UI | Message broker administration (`admin` / `adminpassword`) |
| **MinIO S3 API** | `9000` | S3 REST API | Presigned direct-to-cloud file uploads (`semantic-rag-uploads`) |
| **MinIO Console** | `9001` | HTTP Web Console | Object storage administration (`minioadmin` / `minioadmin`) |
| **Redis 7** | `6379` | RESP / Redis TCP | SHA-256 deduplication cache, rate limiting, metric counters |
| **Apache Tika Server** | `9998` | HTTP Tika API | Binary text extraction & OCR parsing (PDF, DOCX, scans) |
| **React Web Client** | `5173` | HTTP (Vite Dev Server) | Administrative Governance Dashboard & Visual Diff Center |

---

### 3. Prerequisites

- **Docker Desktop** (or Docker Engine 24+ with Compose v2)
- **Java Development Kit (JDK 21 LTS)**
- **Apache Maven 3.9+**
- **Python 3.13** (with `pip` and virtual environment support)
- **Node.js v22+** (with `npm`)

---

### 4. Quickstart: Step-by-Step Setup

#### Step 1: Environment File Setup
Copy the provided `.env.example` templates to active `.env` files:
```bash
# Root frontend environment
cp .env.example .env

# Python AI Engine environment
cp python-ai-engine/.env.example python-ai-engine/.env

# Java API Gateway environment
cp java-gateway/.env.example java-gateway/.env
```

#### Step 2: Spin Up Infrastructure Containers
Start PostgreSQL (with `pgvector`), RabbitMQ, MinIO, Redis, and Apache Tika:
```bash
docker compose up -d
```
Verify that all containers are healthy:
```bash
docker compose ps
```

#### Step 3: Run Database Schema Migrations and Seed Data
The database schema is managed exclusively by Flyway migrations (`V1__init_schema.sql` through `V5__fix_seed_password_hashes.sql`).
When starting the Java API Gateway (`mvn spring-boot:run`), Flyway executes all pending migrations automatically.
Migration V5 updates the BCrypt hashes for seeded users (`password123`) using pgcrypto `crypt(..., gen_salt('bf', 10))`.

To run the idempotent seed script to populate additional demo policy pairs:
```bash
python seed.py
```

#### Step 4: Start the Java API Gateway
In Windows PowerShell (ensuring JDK 21 is used, never JDK 22):
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
cd d:\major\java-gateway
mvn spring-boot:run
```
*Health Check:* `curl.exe http://localhost:8080/api/v1/health`

#### Step 5: Start the Python AI Engine & Queue Worker
In a new Windows PowerShell terminal:
```powershell
cd d:\major\python-ai-engine
python -m uvicorn main:app --port 8000
```
*Health Check:* `curl.exe http://localhost:8000/health`

#### Step 6: Start the React Frontend Application
In a third Windows PowerShell terminal:
```powershell
cd d:\major
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

### 5. Seeded Demo Users & RBAC Matrix

All seeded users have the default password: **`password123`**

| Email | Role | Tenant Department | Capabilities |
| :--- | :--- | :--- | :--- |
| `hr_steward@enterprise.com` | `DATA_STEWARD` | `HR` | Resolve quarantine conflicts, upload documents, merge policies |
| `hr_admin@enterprise.com` | `SYSTEM_ADMIN` | `HR` | Tenant administration, quota rate limits, billing analytics |
| `finance_steward@enterprise.com`| `DATA_STEWARD` | `FINANCE` | Finance document ingestion, CapEx conflict adjudication |
| `legal_auditor@enterprise.com` | `COMPLIANCE_AUDITOR`| `LEGAL` | Read-only forensic audit trail, SHA-256 integrity verification |
| `eng_steward@enterprise.com` | `DATA_STEWARD` | `ENGINEERING` | Technical documentation and incident playbook management |
| `superadmin@enterprise.com` | `SYSTEM_ADMIN` | `HR` (Global Privileges) | Cross-system observability and tenant provisioning |

---

### 6. End-to-End Demo Workflow Guide

1. **Authentication:**
   - Navigate to `http://localhost:5173/login`.
   - Log in as `hr_steward@enterprise.com` with password `password123`.
   - Confirm the JWT is securely stored and that the user's role is `DATA_STEWARD` with scope `HR`.

2. **Direct-to-Cloud Ingestion:**
   - Navigate to the **Ingestion Hub**.
   - Upload a new document (e.g., `Global_Remote_Work_Framework_2026.pdf`).
   - The browser requests a presigned S3 ticket from `GET /api/v1/ingest/upload-ticket`.
   - The binary streams directly to MinIO, and upon completion triggers `POST /api/v1/ingest/complete`.
   - An event publishes to RabbitMQ's `raw-document-queue`.

3. **Collision Detection & Quarantine:**
   - The Python worker pulls the job from RabbitMQ with prefetch $N=5$.
   - Text is parsed via Apache Tika, chunked via LangChain, and embedded using `all-MiniLM-L6-v2`.
   - Chunks are compared against active `HR` vectors in PostgreSQL using `pgvector` Cosine Distance (`<=>`).
   - Because the 2026 remote work framework has an $89.4\%$ similarity to the 2022 policy, it is flagged as a collision and routed to `quarantine_queue`.

4. **Human-in-the-Loop Conflict Resolution:**
   - Navigate to the **Quarantine Center**.
   - Inspect the pending conflict `conf-8901` showing the side-by-side diff between the 2022 baseline and 2026 incoming text.
   - Click **Promote Incoming & Archive Old**.
   - The Java Gateway executes the transaction: promoting the incoming chunk to `ACTIVE`, setting the 2022 chunk to `SUPERSEDED`, recording a `SUPERSEDES` edge in `provenance_edges`, and writing an immutable entry to `compliance_audit_log` with an SHA-256 chain hash.

5. **Audit Chain Verification:**
   - Log out and log in as `legal_auditor@enterprise.com`.
   - Open **Compliance Audit Trail** and click **Verify Chain Integrity**.
   - The system re-hashes all tenant audit rows from root; the audit status displays **VERIFIED (Tamper-Free)**.

6. **Zero-Trust Multi-Tenant Isolation Test:**
   - Log in as `finance_steward@enterprise.com`.
   - Notice that the Finance dashboard shows only Finance records ($0$ HR conflicts visible).
   - Attempting to query an HR conflict ID via direct API call returns `403 Forbidden`.

---

### 7. Redis Key Conventions

| Key Pattern | Data Structure | TTL | Purpose |
| :--- | :--- | :--- | :--- |
| `denylist:jwt:{jti}` | String | Token Lifetime | Invalidation denylist for revoked JWT tokens on logout |
| `dedup:{tenant}:{sha256(chunk)}` | String (`SET NX`) | None | Exact duplicate text pruning before embedding computation |
| `adj:{tenant}:{sha256(a)}:{sha256(b)}` | String (JSON) | 30 days | Adjudication verdict cache for identical policy comparisons |
| `rl:{userId}:{minute}` | Integer (Counter) | 60 sec | Sliding window rate limiting per user |
| `metrics:cache_hits` | Integer (Counter) | None | Cumulative Redis semantic cache hit counter |
| `metrics:dedup_pruned` | Integer (Counter) | None | Cumulative exact duplicate chunks pruned |

---

### 8. Authentication & User Governance Operations

#### Seeded Administrative & Tenant Users
All seeded demo users are re-hashed via Flyway migration `V5__fix_seed_password_hashes.sql` using PostgreSQL `pgcrypto` (`crypt('password123', gen_salt('bf', 10))`):

| Email | Role | Department / Tenant | Privileges | Initial Password |
| :--- | :--- | :--- | :--- | :--- |
| `superadmin@enterprise.com` | `SYSTEM_ADMIN` | `GLOBAL` | Super Admin (Cross-Tenant) | `password123` |
| `hr_admin@enterprise.com` | `SYSTEM_ADMIN` | `HR` | Tenant Admin (`HR` Only) | `password123` |
| `hr_steward@enterprise.com` | `DATA_STEWARD` | `HR` | Data Steward (`HR` Scope) | `password123` |
| `legal_auditor@enterprise.com` | `COMPLIANCE_AUDITOR` | `LEGAL` | Compliance Auditor | `password123` |
| `finance_steward@enterprise.com` | `DATA_STEWARD` | `FINANCE` | Data Steward (`FINANCE` Scope) | `password123` |
| `eng_steward@enterprise.com` | `DATA_STEWARD` | `ENGINEERING` | Data Steward (`ENGINEERING` Scope)| `password123` |

#### Key Identity & Governance Endpoints
- `POST /api/v1/auth/login`: Authenticates user against Postgres users table; enforces 5-attempt lockout (15 minutes); returns JWT and `mustChangePassword` flag.
- `POST /api/v1/auth/change-password`: Updates password enforcing policy (min 10 chars, letter, digit, non-identical to old). Reissues unblocked token.
- `POST /api/v1/auth/logout`: Revokes token by adding its `jti` to the Redis denylist.
- `GET /api/v1/admin/users`: Lists users (filtered by tenant for tenant-admin, global for super-admin).
- `POST /api/v1/admin/users`: Provisions user account with temporary password; enforces tenant boundaries; logs hash-chained audit row.
- `PATCH /api/v1/admin/users/{id}`: Modifies user role or active status (self-disable blocked).
- `POST /api/v1/admin/users/{id}/reset-password`: Issues new temporary password and resets lockout.

#### Running the Automated Security & Auth Test Suite
Execute the end-to-end security regression suite verifying lockout, anti-enumeration, password policies, token denylisting, RBAC, and hash-chain integrity:
```bash
python tests/test_auth_governance.py
```

---

### 9. Troubleshooting & Diagnostics

- **RabbitMQ Queue Backlog:** Inspect queue status at `http://localhost:15672` (Queue: `raw-document-queue`). If messages are accumulating, verify that Python worker `queue_worker.py` is running.
- **MinIO Connection Errors:** Ensure the bucket `semantic-rag-uploads` exists and that CORS allows `PUT` from origin `http://localhost:5173`.
- **Database Connection Refused:** Verify PostgreSQL is running on port 5432 and `vector` extension is active:
  ```sql
  SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
  ```

