# Enterprise Semantic RAG Governance Platform

An enterprise-grade, multi-tenant Semantic Retrieval-Augmented Generation (RAG) platform with deterministic policy conflict adjudication, Apache Tika text extraction, pgvector semantic search, Redis-based deduplication and query caching, and tamper-evident SHA-256 hash-chain audit logging.

---

## 1. Architectural Topology

```
+---------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER                                 |
|      React 19 SPA (Vite) | Tailwind CSS v4 | Interactive Lineage DAG | Real-time SSE  |
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
|  - Table: quarantine_queue (Flagged Collisions| |  - In-Memory Dense Query Cache (1h) |
|  - Table: compliance_audit_log (Hash Chain)   | |  - Adjudication Verdict Cache (30d) |
+-----------------------------------------------+ +-------------------------------------+
```

---

## 2. Ports & Protocols

| Service | Port | Protocol | Purpose |
|---|---|---|---|
| **Java API Gateway** | `8080` | HTTP / REST & SSE | Authentication, Ingestion API, Governance & Audit, SSE Stream |
| **Python AI Engine** | `8000` | HTTP / REST | Query retrieval, DBSCAN clustering, NLI Adjudication |
| **PostgreSQL 16** | `5432` | TCP (pgvector) | Vector embeddings (384-dim), relational tables, hash chain |
| **Redis 7** | `6379` | RESP | Deduplication, Query caching, Token denylist, Metrics |
| **RabbitMQ** | `5672` / `15672` | AMQP / HTTP | Async document ingestion queue & dead-letter queue (DLQ) |
| **Apache Tika** | `9998` | HTTP | Text extraction from PDF, DOCX, and scanned binaries |
| **MinIO (S3)** | `9000` / `9001` | S3 API / HTTP | Object storage for raw document uploads |
| **React Web App** | `5173` | HTTP | Vite frontend dashboard & governance visualizer |

---

## 3. Quickstart & Commands

### Prerequisites
- Docker Engine 24+ & Docker Compose v2
- JDK 21 LTS (`JAVA_HOME` configured)
- Python 3.13 with PyTorch & SentenceTransformers
- Node.js v22+ with npm

### Step 1: Start Infrastructure Containers
```bash
docker compose up -d
```

### Step 2: Start Java API Gateway (Port 8080)
```bash
cd java-gateway
mvn spring-boot:run
```

### Step 3: Start Python AI Engine (Port 8000)
```bash
cd python-ai-engine
python -u -m uvicorn main:app --port 8000 --host 0.0.0.0
```

### Step 4: Start Frontend SPA (Port 5173)
```bash
npm run dev
```

---

## 4. Automated Testing & Verification

Execute the full suite of automated end-to-end tests:
```bash
# Run all Python & API unit/integration tests (39/39 passing)
python -m unittest discover tests

# Run comprehensive system verification (Java, Python syntax, Adjudicator, Frontend build)
python tests/run_verification.py
```

### Test Suite Summary
| Suite | Tests | Result |
|---|---|---|
| `tests/test_auth_governance.py` | 7 | ✅ Passed |
| `tests/test_worker_item2.py` | 6 | ✅ Passed |
| `tests/test_e2e_scenarios.py` | 7 | ✅ Passed |
| `tests/test_role_rules_item4.py` | 5 | ✅ Passed |
| `tests/test_item5_governance.py` | 4 | ✅ Passed |
| `tests/test_item6_rag_features.py` | 7 | ✅ Passed |
| `tests/test_e2e_platform.py` | 3 | ✅ Passed |
| **Total** | **39** | **100% Pass Rate (0 Failures)** |

---

## 5. Measured Empirical Benchmarks

Measured on Windows 11 x64, PyTorch CPU runtime, PostgreSQL 16 + pgvector, Redis 7:

- **RAG Query Retrieval (Cache MISS)**: $p_{50} = 53.59\text{ ms}$ (Server), $p_{95} = 101.39\text{ ms}$ (Roundtrip)
- **RAG Query Retrieval (Cache HIT from Redis)**: $p_{50} = 3.80\text{ ms}$ (Server), $p_{95} = 12.18\text{ ms}$ (Roundtrip) — **14.1× server acceleration**
- **DBSCAN Topic Clustering**: $p_{50} = 33.00\text{ ms}$, $p_{95} = 57.92\text{ ms}$ (15 samples)
- **Conflict Adjudication**: Direct $p_{50} = 141.36\text{ ms}$ vs. Cached $p_{50} = 2.26\text{ ms}$ — **62.5× acceleration**
- **Apache Tika Text Extraction**: $p_{50} = 40.42\text{ ms}$
- **Ingestion Throughput**: $28.19\text{ documents/second}$ ($28.19\text{ chunks/second}$)
