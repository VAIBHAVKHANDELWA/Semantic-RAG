# PROGRESS.md — Capstone Task Tracker

Living document tracking the implementation and evidence across all tasks (T0.1 to T2.3).
Updated strictly after each verified commit.

| Task ID | Status | Evidence | Remaining Work |
|---|---|---|---|
| **T0.1** | ✅ DONE | Commit `d2927c0`: Untracked real `.env`, `.gitignore` configured for build artifacts/caches, `.env.example` templates added across root, Java gateway, and Python AI engine. | Secrets rotation on deployment. |
| **T0.2** | ✅ DONE | Commit `29e4e27` & `25e6390`: `docker-compose.yml` (pgvector 16, rabbitmq:3.13-management, minio, redis:7.2, apache/tika), `V1__init_schema.sql` (9 canonical tables with HNSW index & append-only trigger), `V2__seed_demo_data.sql` (135 quarantined chunks, 15 docs, 8 active chunks, 6 users, 4 tenants), `seed.py`, `RUNBOOK.md`. MinIO CORS enabled for browser PUT. | Run in live Docker environment when user launches Docker. |
| **T0.3** | ✅ DONE | Commit `e4bcd2f`: Real `POST /api/v1/auth/login` with BCrypt and JJWT; frontend `loginApi` integrated; client-side JWT secret (`VITE_JWT_SECRET`) removed; RBAC and `GLOBAL` type errors completely resolved; frontend builds with 0 errors (`tsc -b && vite build`). | E2E integration test against live backend. |
| **T0.4** | ⏳ PENDING | Java `IngestionController` rewrite, `POST /api/v1/ingest/complete`, `IngestionJob` JPA entity + repository, RabbitMQ publisher service to `raw-document-queue` with DLX/DLQ. | Implement Java models, service, controller, and frontend DirectToCloud modal wiring. |
| **T0.5** | ⏳ PENDING | Python worker rewrite: Tika extraction via REST API, Redis SHA-256 chunk deduplication, top-k PGVector search excluding same document (self-collision fix), idempotency, basic_nack on retry, telemetry publishing to `telemetry-queue`. | Implement in Python `storage_service.py`, `db_service.py`, and `queue_worker.py`. |
| **T0.6** | ⏳ PENDING | Java Governance API: `QuarantineConflict`, `ComplianceAuditLog` with SHA-256 integrity hash chaining, `ProvenanceEdge`, transaction-safe conflict resolution, `@PreAuthorize` security matrix. | Implement JPA models, repository, `GovernanceService`, and `GovernanceController`. |
| **T0.7** | ⏳ PENDING | SSE stream with 15-second heartbeat, tenant isolation, and reconnection handling. | Add heartbeat executor in `SseConnectionManager.java` and frontend EventSource handler. |
| **T0.8** | ⏳ PENDING | Frontend full API wiring: replace remaining mock fixtures with React Query clients (`/quarantine`, `/audit`, `/ingestion`, `/lineage`, `/clusters`), remove fake timer intervals, fix Qdrant log strings (F12). | Connect UI components to live REST and SSE endpoints. |
| **T1.1** | ⏳ PENDING | Deterministic NLI Cross-Encoder conflict adjudicator (DeBERTa / rule features) replacing mock verdicts; Redis adjudication cache (TTL 30 days); fix `SUPERSEDING_POLICY` typo. | Implement in `conflict_service.py`. |
| **T1.2** | ⏳ PENDING | DBSCAN clustering endpoint on Python engine (`POST /api/v1/clusters`) with PCA 2D projection; UI scatter chart reading live clusters. | Implement endpoint and chart integration. |
| **T1.3** | ⏳ PENDING | Provenance DAG: API over `provenance_edges` rendered in React Flow (`LineageGraph`). | Connect backend edges to React Flow graph. |
| **T1.4** | ⏳ PENDING | Audit verification endpoint (`GET /api/v1/audit/verify`) recomputing hash chains; tamper-evident verification indicator in UI. | Implement hash verification loop. |
| **T1.5** | ⏳ PENDING | Redis token-bucket rate limiting on Gateway (`rl:{userId}:{minute}`) and Redis metric counters (`metrics:*`). | Add rate limiting filter in Java gateway. |
| **T1.6** | ⏳ PENDING | Eliminate all remaining synthetic random intervals/mocks in `SystemLogsView` and `AiPipelineVisualizer`; drive from real SSE/metrics. | Purge mock timers. |
| **T2.1** | ⏳ PENDING | Automated test suite: TC-01 to TC-06, tenant leak tests, RBAC matrix (Table 4.2), audit tamper test, idempotency, worker crash recovery. | Write test scripts in `tests/`. |
| **T2.2** | ⏳ PENDING | Benchmark scripts & `RESULTS.md`: gateway latency, queue throughput, PGVector with/without HNSW, calibration curves, dedup savings. | Create benchmark scripts in `benchmarks/`. |
| **T2.3** | ⏳ PENDING | `docs/REPORT_FIXES.md`: complete audit of unmeasured/false claims in report, replacement text, screenshot checklist. | Write document and calibration scripts. |
