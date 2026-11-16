# Comprehensive End-to-End Test Scenarios

This document outlines the end-to-end (E2E) verification scenarios for the Semantic-RAG multi-tenant platform. All scenarios are automated in `tests/test_e2e_scenarios.py`.

---

## Scenario 1: Happy-Path Ingest & Query Retrieval
* **Actors:** `DATA_STEWARD` (HR Tenant)
* **Goal:** Verify end-to-end ingestion of a valid text/PDF document, presigned S3 upload, Apache Tika extraction, vector embedding generation, pgvector insertion, and subsequent retrieval.
* **Flow:**
  1. Login as `hr_steward@enterprise.com`.
  2. Call `POST /api/v1/ingest/initiate` to obtain an S3 presigned PUT URL and `jobId`.
  3. Upload document content directly to MinIO via `PUT {presigned_url}`.
  4. Call `POST /api/v1/ingest/complete` with `jobId`, `tenantId: HR`, and `objectKey`.
  5. Python queue worker receives message from `raw-document-queue`, invokes Tika extraction, partitions text into 500-char chunks, computes 384-dimensional dense vectors, checks pgvector for collisions (< 0.85 threshold), and commits chunks to `vector_chunks` with status `ACTIVE`.
  6. Job status transitions to `COMPLETED`.
* **Expected Result:** HTTP 200/201 across all steps, active chunk written to PostgreSQL `vector_chunks`, and job marked `COMPLETED`.

---

## Scenario 2: Deduplication on Repeated Upload
* **Actors:** `DATA_STEWARD` (HR Tenant)
* **Goal:** Verify that redundant documents or duplicate text chunks are pruned by Redis atomic deduplication rather than creating duplicate embeddings.
* **Flow:**
  1. Ingest clean chunk with SHA-256 hash $H_1$ for tenant `HR`.
  2. First check `dedup:HR:H1` via Redis `SETNX` returns True (key newly set).
  3. Ingest identical chunk with SHA-256 hash $H_1$ again for tenant `HR`.
  4. Second check `dedup:HR:H1` returns False (already exists).
  5. Processing pipeline skips vector generation and increments `metrics:dedup_pruned:total`.
* **Expected Result:** Chunk is not duplicated in `vector_chunks`; Redis metric `metrics:dedup_pruned:total` increments.

---

## Scenario 3: Corrupt or Empty File Quarantine
* **Actors:** `DATA_STEWARD` (Legal Tenant)
* **Goal:** Verify unreadable, corrupt, or empty (0-byte) documents are not silently dropped, but cleanly quarantined with explicit audit trails.
* **Flow:**
  1. Upload malformed binary file or empty document.
  2. Tika extraction fails or yields 0 characters.
  3. Storage service captures error or empty text condition.
  4. Database service creates document record with `status: QUARANTINED` and inserts entry into `quarantine_queue` with `verdict_type: CORRUPT_FILE` or `EMPTY_FILE` and exact diagnostic explanation.
  5. Ingestion job is updated to `status: QUARANTINED`.
  6. Redis metric `metrics:quarantined_total` increments.
* **Expected Result:** Ingestion job marked `QUARANTINED`, `quarantine_queue` row has pending status with explicit explanation, no unhandled worker crash.

---

## Scenario 4: Role-Based Access Control (RBAC) Enforcement
* **Actors:** `COMPLIANCE_AUDITOR` (Legal Tenant), `DATA_STEWARD` (HR Tenant)
* **Goal:** Verify least-privilege role boundaries across data modification, conflict resolution, and admin user management.
* **Flow:**
  1. Login as `legal_auditor@enterprise.com`.
  2. Attempt `POST /api/v1/ingest/initiate` -> Expected: HTTP 403 Forbidden.
  3. Attempt `POST /api/v1/quarantine/{id}/resolve` -> Expected: HTTP 403 Forbidden (Auditor is read-only).
  4. Attempt `GET /api/v1/admin/users` -> Expected: HTTP 403 Forbidden (Only SYSTEM_ADMIN).
  5. Login as `hr_steward@enterprise.com`.
  6. Attempt `GET /api/v1/admin/users` -> Expected: HTTP 403 Forbidden.
* **Expected Result:** Strict HTTP 403 Forbidden returned for all unauthorized operations.

---

## Scenario 5: Multi-Tenant Data Isolation Guard
* **Actors:** `DATA_STEWARD` (Finance Tenant) vs `DATA_STEWARD` (HR Tenant)
* **Goal:** Verify strict tenant partitioning so that users cannot inspect, query, or resolve documents/conflicts belonging to another tenant.
* **Flow:**
  1. Login as `finance_steward@enterprise.com` (Tenant: `FINANCE`).
  2. Query `GET /api/v1/quarantine/pending`.
  3. Verify returned list contains only `FINANCE` conflicts and 0 items from `HR` or `LEGAL`.
  4. Attempt `POST /api/v1/quarantine/{hr_conflict_id}/resolve` using Finance JWT.
  5. Gateway rejects cross-tenant modification with HTTP 403 Forbidden or 404 Not Found.
* **Expected Result:** Zero cross-tenant data leakage.

---

## Scenario 6: Expired, Tampered, and Denylisted Token Rejection
* **Actors:** Unauthenticated / Malicious Client
* **Goal:** Verify cryptographic JWT validation, token tampering defense, and instant logout denylisting.
* **Flow:**
  1. Submit request with expired JWT -> Expected: HTTP 401 Unauthorized.
  2. Modify payload of a valid JWT (tampering claims) -> Expected: HTTP 401 Unauthorized (`SignatureException`).
  3. Login as valid user, receive JWT with unique `jti`.
  4. Call `POST /api/v1/auth/logout` -> JTI added to Redis key `bl:{jti}` with remaining TTL.
  5. Subsequent request with the same JWT -> Expected: HTTP 401 Unauthorized (`Token revoked`).
* **Expected Result:** All invalid, tampered, expired, or logged-out tokens immediately rejected with HTTP 401.

---

## Scenario 7: Account Lockout on Repeated Failures
* **Actors:** Malicious Attacker
* **Goal:** Prevent credential stuffing and brute-force attacks via 5-attempt threshold with 15-minute lockout and anti-enumeration.
* **Flow:**
  1. Submit 5 consecutive incorrect passwords for `test_lockout@enterprise.com`.
  2. All 5 attempts return generic `"Invalid email or password"` (preventing account enumeration).
  3. Sixth attempt (even with the correct password) returns `"Account is locked due to multiple failed login attempts. Try again in 15 minutes."` (HTTP 423 or 401 with lockout message).
  4. Verify PostgreSQL `users.locked_until` is populated with timestamp 15 minutes in future.
  5. Verify audit log contains `LOGIN_LOCKOUT` event with cryptographic hash chaining.
* **Expected Result:** Account securely locked, generic messages preserve confidentiality, and security audit log records tamper-evident incident.
