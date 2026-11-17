# Semantic-RAG System Architecture & Service Connections

This document details every service-to-service connection, port, protocol, authentication mechanism, and data flow within the enterprise Semantic-RAG multi-tenant platform.

---

## 1. High-Level Topology & Connection Matrix

| Source Service | Target Service | Port | Protocol | Authentication Method | Purpose / Data Flow |
|---|---|---|---|---|---|
| **Frontend (React)** | Java Gateway | `8080` | HTTP / JSON | Bearer JWT (`Authorization: Bearer <token>`) | REST API: Auth, Ingest ticket & completion, Quarantine review, Admin user management |
| **Frontend (React)** | Java Gateway | `8080` | HTTP / SSE | Bearer JWT via `?token=` query param on EventSource | Real-time Server-Sent Events (`/api/v1/telemetry/stream`) for ingest & conflict events |
| **Frontend (React)** | RustFS (S3) | `9000` | HTTP | S3 Presigned URL (AWS SigV4 query params) | Direct-to-cloud raw document upload (`PUT /semantic-rag-uploads/{key}`) |
| **Java Gateway** | PostgreSQL | `5432` | TCP (PostgreSQL wire) | Username/Password (`admin:adminpassword`) | JPA/Hibernate: Tenants, Users, Ingestion Jobs, Quarantine, Audit Logs, Vector Chunks |
| **Java Gateway** | Redis | `6379` | TCP (RESP) | None / Password (configurable) | JWT revocation denylist (`token:denylist:{jti}`), Token-bucket rate limiting (`rl:{user}:{minute}`) |
| **Java Gateway** | RabbitMQ | `5672` | AMQP 0-9-1 | Plain credentials (`admin:adminpassword`) | Dispatches ingestion job payloads to `raw-document-queue` |
| **Java Gateway** | Python AI Engine | `8000` | HTTP / JSON | Internal network / Tenant ID in payload | Ad-hoc clustering calls (`POST /api/v1/clusters`) and RAG retrieval queries |
| **Python AI Engine** | RabbitMQ | `5672` | AMQP 0-9-1 | Plain credentials (`admin:adminpassword`) | Consumes `raw-document-queue` (prefetch=5), publishes dead letters to `raw-document-dlq` via DLX |
| **Python AI Engine** | RustFS (S3) | `9000` | HTTP (S3 API) | AWS Access Key / Secret Key | Boto3 downloads raw binary documents using object key |
| **Python AI Engine** | Apache Tika | `9998` | HTTP REST | Anonymous (Internal network) | `PUT /tika` with octet-stream body; receives extracted plain text + metadata |
| **Python AI Engine** | PostgreSQL / pgvector | `5432` | TCP (PostgreSQL wire) | Username/Password (`admin:adminpassword`) | PgVector cosine collision search (`vector_chunks`), chunk insertion, quarantine routing |
| **Python AI Engine** | Redis | `6379` | TCP (RESP) | None / Password (configurable) | Deduplication (`dedup:{tenant}:{sha256}`), Telemetry counters (`metrics:*`), NLI cache |
| **Python AI Engine** | Hugging Face Hub | `443` | HTTPS | Anonymous / Optional `HF_TOKEN` | Downloads `all-MiniLM-L6-v2` and `DeBERTa-v3-small` weights on startup (cached in `~/.cache`) |

---

## 2. Detailed Data Flow Walkthroughs

### 2.1 Direct-to-Cloud Document Ingestion Pipeline
```
[Client / Browser]
     │
     │ 1. GET /api/v1/ingest/upload-ticket?fileName={name} [Auth: Bearer JWT]
     ▼
[Java Gateway (8080)]
     │ Generates RustFS S3 presigned PUT URL with expiry (900s)
     │ (No DB row created yet; job is initiated only after binary lands in storage)
     ▼
[Client / Browser]
     │
     │ 2. PUT {presigned_url} (raw file binary) [Auth: SigV4 query param]
     ▼
[RustFS S3 (9000)]
     │ Persists raw object into bucket 'semantic-rag-uploads' under uploads/{tenant}/
     │
[Client / Browser]
     │
     │ 3. POST /api/v1/ingest/complete {objectKey, fileName} [Auth: Bearer JWT]
     ▼
[Java Gateway (8080)]
     │ Validates tenant ownership and objectKey namespace prefix (uploads/{tenant}/)
     │ Creates IngestionJob row in PostgreSQL (status: QUEUED)
     │ Invalidates tenant RAG query cache in Redis ('rag:query:{tenant}:*')
     │ Publishes AMQP message {jobId, tenantId, objectKey} to RabbitMQ 'raw-document-queue'
     ▼
[RabbitMQ (5672): raw-document-queue]
     │
     │ 4. AMQP Consume (QoS prefetch: 5)
     ▼
[Python AI Engine (8000: QueueWorker)]
     │ 5. S3 get_object(bucket, objectKey) -> [RustFS S3]
     │ 6. PUT /tika (raw bytes) -> [Apache Tika (9998)] -> Plain text + Latency
     │ 7. LangChain RecursiveCharacterTextSplitter -> Chunks (500 chars, 50 overlap)
     │ 8. Redis SETNX dedup:{tenant}:{sha256} -> [Redis (6379)] (Skip duplicates)
     │ 9. SentenceTransformer('all-MiniLM-L6-v2') -> 384-dimensional vector embedding
     │ 10. Cosine distance collision query -> [PostgreSQL / pgvector (5432)]
     │     ├── If similarity >= 0.85: Run DeBERTa NLI Cross-Encoder -> Insert quarantine_queue
     │     └── If similarity < 0.85: Insert vector_chunks (status: ACTIVE)
     │ 11. Update ingestion_jobs (status: COMPLETED) -> [PostgreSQL (5432)]
     │ 12. AMQP basic_ack
     ▼
[SSE Notification -> Java Gateway (/api/v1/telemetry/stream) -> Browser UI]
```

### 2.2 Dead-Letter Queue (DLQ) & Error Quarantine Flow
```
[RabbitMQ: raw-document-queue]
     │ (Message delivered with x-death headers)
     ▼
[Python AI Engine: QueueWorker]
     │
     ├── Case A: Corrupt or 0-byte document from Tika/RustFS
     │     ├── Insert documents record (status: QUARANTINED)
     │     ├── Insert quarantine_queue record (verdict: EMPTY_FILE or CORRUPT_FILE)
     │     ├── Update ingestion_jobs (status: QUARANTINED)
     │     ├── Increment Redis metrics:quarantined_total
     │     └── basic_ack (quarantined cleanly without retry thrashing)
     │
     └── Case B: Unhandled processing exception (DB crash, network blip)
           ├── Attempt count < MAX_RETRIES (3):
           │     └── basic_nack(requeue=True) -> message retried
           └── Attempt count >= MAX_RETRIES (3):
                 ├── Update ingestion_jobs (status: FAILED_DLQ)
                 ├── Increment Redis metrics:dlq_total
                 └── basic_nack(requeue=False) -> RabbitMQ routes to raw-document-dlx -> raw-document-dlq
```

### 2.3 Authentication, Session Revocation & Rate Limiting
```
[Client / Browser]
     │
     │ POST /api/v1/auth/login {email, password}
     ▼
[Java Gateway: AuthController]
     │ 1. Fetch user from PostgreSQL (checks active=true, locked_until)
     │ 2. If locked_until > now: Return 401 Unauthorized ("Account locked due to consecutive failed attempts...")
     │ 3. BCrypt.checkpw(password, password_hash):
     │      ├── Mismatch: Increment failed_login_attempts. If >= 5, set locked_until = now + 15m.
     │      │             Write AuditLog (LOGIN_FAILURE). Return 401 Unauthorized (Anti-enumeration).
     │      └── Match: Reset failed_login_attempts = 0, update last_login_at.
     │                 Generate signed JJWT with claims {sub, tenant, role, jti, mustChangePassword, isSuperAdmin}.
     │                 Write AuditLog (LOGIN_SUCCESS).
     │                 Return {token, user, mustChangePassword}.
     ▼
[Incoming Protected Requests]
     │ Header: Authorization: Bearer <jwt> (or ?token= on /api/v1/telemetry/stream)
     ▼
[Java Gateway: JwtAuthenticationFilter]
     │ 1. Validate signature & expiration
     │ 2. Extract jti; Query Redis key 'token:denylist:{jti}' -> If exists, return 401 Unauthorized
     │ 3. If mustChangePassword=true and URI != '/api/v1/auth/change-password' -> Return 403 Forbidden
     │ 4. Check Redis rate limit key 'rl:{userId}:{minute}' -> If count > 120, return 429 Too Many Requests
     │ 5. Populate Spring SecurityContext with UserDetails & Authorities
     ▼
[Controller Layer (@PreAuthorize enforcement)]
```

---

## 3. Port & Network Security Boundary

All backend services run inside internal Docker bridge networks (`major_default` Compose network), except for user-accessible ports:

| Service Name | Container / Host Port | Exposure | Network Boundary |
|---|---|---|---|
| **Vite Frontend** | `5173` | Public / Localhost | Browser Host Access |
| **Java Gateway** | `8080` | Public / Localhost | Edge Gateway for REST/SSE APIs |
| **Python AI Engine** | `8000` | Localhost | AI Microservice & Vector Worker |
| **PostgreSQL + pgvector** | `5432` | Localhost | Database Layer |
| **Redis Cache** | `6379` | Localhost | In-Memory Token Denylist & Metrics |
| **RabbitMQ Broker** | `5672` (AMQP), `15672` (UI) | Localhost | Message Broker |
| **RustFS S3** | `9000` (API), `9001` (Console) | Localhost | S3-Compatible Object Storage |
| **Apache Tika Server** | `9998` | Localhost | Headless Document Extraction Engine |
