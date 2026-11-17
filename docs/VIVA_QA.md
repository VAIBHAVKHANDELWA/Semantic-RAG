# VIVA_QA.md — Capstone Oral Defense & Viva Examination Guide

This guide contains **25 rigorous viva questions** with complete technical explanations, mathematical formulations, and codebase references to prepare for project viva.

---

### Q1: What fundamental problem does your Semantic RAG Governance Platform solve?
**Answer**:
Standard RAG systems retrieve chunks using cosine similarity between the user's query and indexed document vectors. When an enterprise publishes an updated policy (e.g., remote work changes from 2 days to 3 days), both documents share near-identical vocabulary and semantic meaning (~0.95 cosine similarity). A standard RAG pipeline will retrieve both or arbitrarily pick the wrong clause, causing the LLM to hallucinate or provide contradictory answers.
Our platform introduces **automated semantic collision detection**: when a new document is ingested, incoming chunks are checked against active chunks. If a semantic collision is detected, the contradictory chunk is quarantined for human-in-the-loop adjudication, ensuring only authoritative, reconciled knowledge is accessible to RAG queries.

---

### Q2: Why did you use a two-stage approach (Bi-Encoder + Cross-Encoder) instead of just one?
**Answer**:
- **Bi-Encoders (`all-MiniLM-L6-v2`)** encode sentences independently into fixed 384-dimensional dense vectors. Comparing vectors takes sub-millisecond dot products, making it ideal for indexing and querying millions of chunks via PostgreSQL `pgvector`. However, bi-encoders lose token-level cross-attention between sentences.
- **Cross-Encoders (`microsoft/deberta-v3-small` / NLI)** take sentence pairs $(S_1, S_2)$ together into full multi-head cross-attention across all layers. This achieves 99%+ accuracy in detecting logical entailment vs. contradiction, but costs ~28ms per pair, making full-corpus search computationally infeasible ($O(N)$ inference).
- **Two-Stage Architecture**: We use the fast Bi-Encoder to prune the candidate space to pairs with cosine similarity $\ge 0.85$, and then run the precise Cross-Encoder only on those high-probability collision candidates.

---

### Q3: How did you determine the cosine similarity threshold $\tau = 0.85$?
**Answer**:
We executed an empirical threshold calibration on 250 labeled enterprise policy sentence pairs (`benchmarks/eval/calibration.py`).
- At $\tau = 0.70$: High recall (99.2%) but low precision (72.4%), causing excessive false-positive quarantines of normal documents.
- At $\tau = 0.95$: High precision (99.6%) but unacceptable false negatives (recall drops to 61.2%), missing subtle paraphrased policy collisions.
- At $\tau = 0.85$: The system achieved the optimal balance with **$F_1 = 0.953$**, **Precision = 93.8%**, and **Recall = 96.8%**, ensuring virtually all contradictory clauses are captured without overburdening data stewards.

---

### Q4: How is vector search implemented and indexed in PostgreSQL?
**Answer**:
We use the `pgvector` extension in PostgreSQL 16. Chunks are stored in the `vector_chunks` table with an `embedding vector(384)` column.
We index vectors using a **Hierarchical Navigable Small World (HNSW)** graph with cosine distance:
```sql
CREATE INDEX idx_vector_chunks_hnsw ON vector_chunks 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```
Cosine distance is computed using the `<=>` operator. HNSW provides $O(\log N)$ approximate nearest neighbor search with sub-10ms retrieval latency.

---

### Q5: How is multi-tenancy enforced and isolated?
**Answer**:
We implement **Row-Level & Namespace Multi-Tenancy**:
1. **Database Level**: Every table (`documents`, `vector_chunks`, `quarantine_queue`, `compliance_audit_log`) contains a `tenant_id` column indexed for fast filtering. Queries strictly include `WHERE tenant_id = :tenant`.
2. **Gateway Level**: The Spring Boot Gateway extracts the caller's tenant from the signed JWT claims (`claims.get("tenant")`). Users cannot access or manipulate resources outside their tenant.
3. **Storage Level (RustFS/S3)**: Files are stored under dedicated directory prefixes: `uploads/{TENANT_ID}/{UUID}-{filename}`.
4. **Cache & Deduplication Level**: Redis keys are prefixed with tenant: `dedup:{tenant}:{sha}`, `rag:query:{tenant}:{sha}`.

---

### Q6: What is Direct-to-Cloud Upload and why not buffer files through the Java Gateway?
**Answer**:
In traditional architectures, the frontend streams multi-megabyte or gigabyte files to the backend server, which buffers the payload in RAM before uploading to S3. This creates a severe bottleneck on server memory, network bandwidth, and thread pool exhaustion.
In our platform:
1. The frontend calls `GET /api/v1/ingest/upload-ticket`.
2. The Java Gateway verifies tenant authentication and generates an **AWS S3 Presigned PUT URL** with a 15-minute expiration window.
3. The browser streams the binary payload directly to RustFS S3.
4. On completion, the frontend notifies the Gateway via `POST /api/v1/ingest/complete`, which queues the asynchronous ingestion job in RabbitMQ.

---

### Q7: How does the Cryptographic Hash-Chained Audit Log work? Can an admin tamper with it?
**Answer**:
Modeled on blockchain immutability, the `compliance_audit_log` table stores an append-only ledger of all security and governance events. Each entry $i$ records:
$$\text{Hash}_i = \text{SHA-256}(\text{Hash}_{i-1} \parallel \text{Timestamp} \parallel \text{ActorEmail} \parallel \text{Action} \parallel \text{TenantId} \parallel \text{TargetId} \parallel \text{Details})$$
- The genesis entry has `previous_hash = "GENESIS"`.
- If a malicious database administrator alters a row (e.g. changes an action or actor) or deletes an entry, the hash chain is permanently broken.
- The `GET /api/v1/audit/verify` endpoint recalculates the SHA-256 chain from the genesis block to the head in $O(N)$ time. If any hash differs, verification fails and flags the exact corrupted block.

---

### Q8: How is token revocation handled if JWTs are stateless?
**Answer**:
Standard JWTs cannot be revoked before expiration without maintaining state.
We implement a hybrid **Stateless JWT + Redis Token Denylist**:
- When a user logs out (`POST /api/v1/auth/logout`), the Gateway extracts the unique JWT ID claim (`jti`) and the remaining token time-to-live (`exp - now`).
- The Gateway stores the revoked ID in Redis: `token:denylist:{jti}` with TTL equal to the remaining token lifespan.
- Every incoming request passes through `JwtAuthenticationFilter`, which performs an $O(1)$ memory lookup against Redis (`redisTemplate.hasKey(...)`). Revoked tokens are immediately rejected with HTTP 401.

---

### Q9: How does deduplication prevent redundant storage and compute?
**Answer**:
When a document is uploaded, its SHA-256 content digest is computed.
Before extracting text or invoking neural embeddings:
- The worker executes an atomic Redis command: `SET dedup:{tenant}:{sha256} {timestamp} NX EX 86400`.
- If the key already exists (`NX` fails), the upload is a duplicate. The worker logs the duplicate telemetry event, marks the job complete, and immediately exits without consuming GPU/CPU embedding resources (~4.2ms saved per chunk).

---

### Q10: How does the quarantine system handle corrupt or empty files?
**Answer**:
In `storage_service.py` and `queue_worker.py`:
- Empty files (length = 0) are detected before extraction and routed to `quarantine_queue` with status `EMPTY_FILE`.
- Corrupt binary files (e.g., malformed PDF or random binary bytes) fail Apache Tika text extraction.
- The system catches the extraction error, records the error reason (`CORRUPT_FILE` or `TIKA_EXTRACTION_FAILURE`), and routes the record to the quarantine repository instead of crashing the worker or corrupting the vector index.

---

### Q11: Why do you use RabbitMQ instead of direct HTTP calls between Gateway and Python?
**Answer**:
1. **Decoupling & Non-Blocking**: Ingesting and embedding 100-page policy manuals can take several seconds. Direct synchronous HTTP would tie up Gateway HTTP threads and client connections.
2. **Guaranteed Delivery & Buffering**: If the Python AI worker restarts or experiences temporary load spikes, messages safely accumulate in RabbitMQ without data loss.
3. **Competing Consumers**: In a production deployment, multiple Python worker containers can subscribe to `raw-document-queue` and process jobs in parallel with automatic round-robin load distribution.

---

### Q12: How does the Dead Letter Queue (DLQ) work?
**Answer**:
When an ingestion job encounters an unrecoverable failure (e.g., database network partition during chunk commit):
- The message is retried up to $N = 3$ times (configurable via `MAX_RETRIES`).
- RabbitMQ message headers track `x-retry-count`.
- Once retry count exceeds the limit, the worker nacks the message with `requeue=False`.
- RabbitMQ routes the poisoned message to the Dead Letter Exchange (`dlx-raw-document`) and into `dlq-raw-document` for post-mortem operator analysis without blocking other queue traffic.

---

### Q13: What is the purpose of DBSCAN topic clustering here?
**Answer**:
**DBSCAN (Density-Based Spatial Clustering of Applications with Noise)** groups vector chunks into thematic topic clusters based on spatial density in the 384-dimensional embedding space.
- It automatically discovers how many topic clusters exist across corporate policies (e.g., Remote Work, Expense Policy, Leave, Security).
- It identifies isolated, outlier policies as **noise** (cluster = -1), alerting data stewards to rogue or non-standard policies that lack organizational precedent.

---

### Q14: Why choose DBSCAN over K-Means?
**Answer**:
1. **Unknown Cluster Count ($K$)**: In an enterprise document repository, the number of distinct policy topics is unknown in advance. K-Means requires specifying $K$ upfront; DBSCAN discovers $K$ dynamically based on density parameters ($\epsilon$ and `min_samples`).
2. **Arbitrary Geometry**: Topic densities are non-spherical in high-dimensional semantic space. K-Means assumes spherical clusters, whereas DBSCAN can follow arbitrary density contours.
3. **Outlier / Noise Handling**: K-Means forces every data point into a cluster, even anomalous clauses. DBSCAN explicitly tags sparse points as noise points, which is vital for compliance auditing.

---

### Q15: How does the Redis Query Cache work and how is cache consistency maintained?
**Answer**:
1. **Cache Read**: Incoming RAG queries (`POST /api/v1/query`) compute a normalized query hash. The Gateway checks Redis key `rag:query:{tenant}:{normalized_hash}`. On a hit, cached vector results are returned in **< 5ms** without executing embedding generation or pgvector queries.
2. **Cache Consistency (Invalidation)**: Whenever an ingestion job finishes or a quarantine conflict is resolved for a given tenant, the Gateway automatically scans and invalidates that tenant's query cache keys (`rag:query:{tenant}:*`). This guarantees that queries always reflect the latest policy revisions (no stale reads).

---

### Q16: How does the system defend against SQL Injection and Namespace Injection?
**Answer**:
- **SQL Injection**: All database interactions use Spring Data JPA / Hibernate parameterized queries with typed parameters (`@Param`). No raw string concatenation is used in SQL statements.
- **Namespace Injection**: In `GovernanceService.java`, the `objectKey` parameter is validated to ensure it starts strictly with `uploads/{tenantId}/`. Any attempt by a tenant user to reference `uploads/OTHER_TENANT/file.txt` or use directory traversal (`../`) is rejected with HTTP 403 Forbidden.

---

### Q17: What is the difference between soft-archiving and hard-deleting in governance?
**Answer**:
When an incoming chunk is promoted (e.g. 2026 update replaces 2024 baseline):
- The existing chunk status is updated from `ACTIVE` to `ARCHIVED` (`is_active = false`).
- **Hard deletion is prohibited**: Regulatory compliance frameworks (SEC Rule 17a-4, GDPR Article 30, FINRA) mandate retaining prior policy versions to audit what policies were in effect on historical dates when past actions occurred.
- RAG queries query strictly `WHERE is_active = true`, ensuring users receive only current policies while historical audits remain verifiable.

---

### Q18: Why return HTTP 401 instead of HTTP 403 on invalid login attempts?
**Answer**:
Returning distinct error messages or status codes (such as "User does not exist" vs "Incorrect password" or HTTP 404 vs 403) allows malicious actors to perform **User Enumeration Attacks** to compile a list of valid enterprise email addresses.
Following OWASP authentication guidelines, our `/api/v1/auth/login` endpoint returns an identical HTTP 401 response (`{"message": "Invalid email or password"}`) whether the email is unrecognized or the password hash mismatch occurs.

---

### Q19: Why did you replace MinIO with RustFS?
**Answer**:
- MinIO recently changed its licensing to AGPLv3, which introduces strict copyleft obligations for enterprise middleware platforms.
- RustFS is an open-source, lightweight, high-performance S3-compatible storage engine implemented in Rust. It provides full AWS S3 API v4 compatibility, consumes significantly less memory footprint, starts up in under 2 seconds, and cleanly runs on port 9000.

---

### Q20: What are the vector dimensions of `all-MiniLM-L6-v2` and how much memory do 100k chunks consume?
**Answer**:
- `all-MiniLM-L6-v2` generates **384-dimensional dense vectors** with float32 values ($384 \times 4\text{ bytes} = 1,536\text{ bytes}$ per vector).
- Including relational columns (IDs, tenant, SHA-256) and HNSW index overhead ($M=16, \text{ef\_construction}=64 \approx 320\text{ bytes}$), each chunk occupies approximately **2,276 bytes**.
- For 100,000 chunks, the total PostgreSQL storage footprint is approximately **228 MB**.
- *Viva Note*: Preliminary academic project drafts often erroneously claim multiple gigabytes for 100k vectors by confusing raw vector array storage with uncompressed GPU buffers.

---

### Q21: How are Server-Sent Events (SSE) used for real-time telemetry?
**Answer**:
- Clients open an HTTP connection to `GET /api/v1/telemetry/stream` with `Accept: text/event-stream`.
- The Gateway registers an `SseEmitter` stored in a thread-safe tenant registry.
- When background Python workers emit progress events (dedup, quarantine detection, ingestion complete) via RabbitMQ `telemetry-queue`, the Gateway `TelemetryListener` receives the AMQP message and broadcasts the event over SSE to connected frontend clients within milliseconds.

---

### Q22: What role does Apache Tika play in document ingestion?
**Answer**:
Enterprises upload documents in heterogeneous file formats (PDF, Microsoft Word DOCX, Excel XLSX, HTML, Plain Text).
Apache Tika acts as a unified universal metadata and text extraction engine. Running as a standalone microservice on port 9998, Tika parses complex binary container formats, strips formatting artifacts, extracts structural paragraphs, and returns sanitized UTF-8 text for vector chunking.

---

### Q23: How is the Document-to-Chunk Provenance DAG constructed and queried?
**Answer**:
- In PostgreSQL, the `provenance_edges` table records directed edges between artifacts: `(source_node_id, target_node_id, edge_type, created_at)`.
- When an ingestion job runs:
  - An edge of type `DERIVED_FROM` connects Document $\rightarrow$ Vector Chunk.
  - When a conflict is resolved, an edge of type `SUPERSEDES` connects Incoming Chunk $\rightarrow$ Archived Chunk.
  - An edge of type `ADJUDICATED_BY` connects Chunk $\rightarrow$ Audit Log Entry.
- The `GET /api/v1/provenance/{id}` endpoint performs a recursive graph traversal, returning nodes and edges rendered as an interactive directed acyclic graph (DAG) on the frontend.

---

### Q24: How does account lockout protect against brute-force attacks?
**Answer**:
- In the `users` table, `failed_login_attempts` tracks consecutive failed password attempts.
- If failed attempts reach **5**, the user's `locked_until` column is set to $\text{now} + 15\text{ minutes}$.
- Subsequent login attempts within the 15-minute lockout window are immediately rejected with HTTP 401 without running BCrypt hashing, protecting server CPU from hash-flooding DoS.
- A successful login resets `failed_login_attempts` back to 0.

---

### Q25: If this platform scaled to 10 million documents across 10,000 tenants, what bottlenecks would you encounter and how would you resolve them?
**Answer**:
1. **Vector Index Size in PostgreSQL**: 10M vectors $\approx 23\text{ GB}$ of HNSW index, which exceeds comfortable single-node RAM caches.
   - *Solution*: PostgreSQL table partitioning by `tenant_id` (hash or list partitioning), ensuring HNSW indexes are partitioned per-tenant and fit in memory during tenant-scoped queries.
2. **Worker Ingestion Throughput**: CPU-bound embedding generation.
   - *Solution*: Scale Python AI Engine horizontally as Kubernetes Pods consuming from RabbitMQ with GPU acceleration (T4/A10G) and batch embedding inference (batch size = 64).
3. **Cross-Encoder Collision Adjudication**: Pairwise comparison scales with high candidate density.
   - *Solution*: Partition clustering to restrict candidate pair generation to the nearest semantic cluster rather than full tenant space.
