# Enterprise Authentication & User Governance Architecture Design
## Semantic RAG Middleware — Security & RBAC Specification

---

### 1. Executive Summary & Core Security Principles

The Enterprise Semantic RAG Middleware enforces zero-trust identity management, cryptographic auditability, and strict multi-tenant isolation. Authentication is built entirely on native **Spring Security + JJWT (Java JWT)**, backed by **PostgreSQL 16 (BCrypt / pgcrypto)**, an ephemeral **Redis 7 Token Denylist**, and an append-only **Cryptographic SHA-256 Hash-Chained Audit Trail**.

Public user self-registration is strictly disallowed. All accounts are provisioned exclusively by authenticated administrators with temporary, high-entropy credentials that force immediate password rotation upon initial access.

---

### 2. Architecture & Identity Flow

```
+--------------------------------------------------------------------------------------------------+
|                                        BROWSER CLIENT (React 19 SPA)                             |
|  - In-Memory User Context (Zero-latency reactivity across UI components)                         |
|  - Tab-Scoped sessionStorage (Isolated token lifetime, survives F5, purges on tab close)         |
+--------------------------------------------------------------------------------------------------+
                                        |                             ^
                1. POST /auth/login     |                             | 4. JWT Token (mustChange=true)
                2. Temp Credentials     |                             |    User Profile & Tenant Scope
                                        v                             |
+--------------------------------------------------------------------------------------------------+
|                                    JAVA API GATEWAY (Spring Boot 3.2)                            |
|                                                                                                  |
|   +--------------------------+  +-------------------------------+  +--------------------------+  |
|   |   AuthController         |  |    JwtAuthenticationFilter    |  |    AdminUserController   |  |
|   | - Lockout Check (5 max)  |  | - Redis Denylist Check (jti)  |  | - RBAC (SYSTEM_ADMIN)    |  |
|   | - BCrypt Password Match  |  | - mustChangePassword Guard    |  | - Cross-Tenant Boundary  |  |
|   | - JJWT Token Generator   |  | - SecurityContext Injection   |  | - One-Time Temp Password |  |
|   +--------------------------+  +-------------------------------+  +--------------------------+  |
+--------------------------------------------------------------------------------------------------+
          |                                        |                                  |
          | Read / Write User                      | Verify Token                     | Hash-Chained
          | BCrypt Hashes                          | Revocation Status                | Audit Event
          v                                        v                                  v
+-------------------------------+        +--------------------+        +-------------------------------+
|     PostgreSQL (users)        |        |    Redis 7 Cache   |        |  PostgreSQL (audit_log)       |
| - failed_login_attempts       |        | Key:               |        | - prev_hash (Parent Link)     |
| - locked_until (15m lockout)  |        | denylist:jwt:{jti} |        | - integrity_hash (SHA-256)    |
| - must_change_password        |        | TTL: Token Expiry  |        | - Immutable append-only log   |
| - is_super_admin              |        +--------------------+        +-------------------------------+
+-------------------------------+
```

---

### 3. Architectural Decision: Token Storage Strategy

| Storage Mechanism | Choice | Technical Justification |
| :--- | :--- | :--- |
| **`sessionStorage` + In-Memory State** | **SELECTED** | **Tab-Level Isolation**: `sessionStorage` is strictly scoped to the active browser tab. Opening multiple tabs or switching tenants does not cause cross-tab credential contamination.<br>**Ephemeral Lifetime**: Tokens are automatically wiped when the user closes the tab, preventing token recovery from idle browser storage.<br>**Page Refresh Continuity**: Unlike pure in-memory variables, `sessionStorage` survives browser page reloads (`F5`) without logging the user out in the middle of active workflows.<br>**Zero-Latency Reactivity**: Backed by React `useState`, allowing synchronous reads without storage read bottlenecks. |
| `localStorage` | **REJECTED** | Persists indefinitely across browser restarts; vulnerable to long-term XSS extraction and causes cross-tab credential collisions during multi-tenant testing. |
| `HttpOnly Cookies` | **REJECTED** | Requires complex CSRF token orchestration across disparate microservice origins without providing native tab-level tenant isolation. |

---

### 4. Account Lockout & Anti-Enumeration Rules

1. **Anti-Enumeration Protection**:
   - Both non-existent user emails and incorrect passwords return the exact same HTTP 401 response:
     ```json
     { "error": "Invalid email or password" }
     ```
   - Prevents attackers from harvesting valid organizational email addresses.

2. **Consecutive Failure Counter & 15-Minute Lockout**:
   - Each failed password attempt increments `users.failed_login_attempts`.
   - Upon the **5th consecutive failure**, `users.locked_until` is set to `now() + 15 minutes`, and an append-only `LOGIN_LOCKOUT` audit entry is cryptographically committed.
   - Subsequent login attempts (even with the correct password) are rejected with:
     ```json
     { "error": "Account locked due to consecutive failed attempts. Try again in X minute(s)." }
     ```
   - Successful authentication resets `failed_login_attempts` to `0` and clears `locked_until`.
   - Administrators can immediately unlock an account by issuing a password reset (`POST /api/v1/admin/users/{id}/reset-password`).

---

### 5. Password Policy & Forced First-Time Rotation

1. **Complexity Rules (Enforced via Regex `^(?=.*[A-Za-z])(?=.*\\d).{10,}$`)**:
   - **Minimum Length**: At least 10 characters.
   - **Alphabetical Character**: Must contain at least one letter (`[A-Za-z]`).
   - **Numeric Character**: Must contain at least one digit (`0-9]`).
   - **Non-Identity**: The new password cannot match the existing or temporary password.

2. **Forced Password Rotation Workflow (`must_change_password = true`)**:
   - Newly provisioned accounts and administrator-reset accounts carry `must_change_password = true`.
   - The generated JWT token includes the claim `"mustChange": true`.
   - `JwtAuthenticationFilter` intercepts all incoming requests from tokens with `mustChange = true`. Any attempt to access business endpoints (e.g. `/api/v1/quarantine/*`, `/api/v1/ingest/*`, `/api/v1/admin/*`) is immediately rejected with:
     ```json
     { "error": "Forbidden: Password change required before accessing other resources" }
     ```
   - Only `POST /api/v1/auth/change-password` and `POST /api/v1/auth/logout` are permitted.
   - Upon successful password change, `must_change_password` is set to `false`, an audit record (`PASSWORD_CHANGE`) is logged, and a fresh JWT token with full access privileges is issued.

---

### 6. Ephemeral Token Revocation (Redis Denylist)

1. **Revocation Mechanism**:
   - When a user logs out via `POST /api/v1/auth/logout`, the Gateway extracts the unique JWT ID (`jti`) and the expiration timestamp (`exp`).
   - The remaining token validity is calculated: `TTL = exp - now()`.
   - A Redis key is set:
     ```redis
     SET denylist:jwt:<jti> "revoked" EX <remaining_seconds>
     ```
2. **Filter-Level Enforcement**:
   - For every incoming request, `JwtAuthenticationFilter` queries Redis:
     ```java
     Boolean isRevoked = redisTemplate.hasKey("denylist:jwt:" + jti);
     ```
   - If present, the token is rejected immediately with HTTP 401 Unauthorized, ensuring true instant token revocation without waiting for JWT expiration.

---

### 7. Multi-Tenant Administration & RBAC Boundaries

| Role | Tenant Scope | Permitted Endpoints & Capabilities | Forbidden Operations |
| :--- | :--- | :--- | :--- |
| **`SYSTEM_ADMIN` (Tenant Admin)** | **Own Tenant Only** (e.g. `HR`) | - `GET /api/v1/admin/users` (Lists users in own tenant)<br>- `POST /api/v1/admin/users` (Provisions users in own tenant)<br>- `PATCH /api/v1/admin/users/{id}` (Updates role, active state)<br>- `POST /api/v1/admin/users/{id}/reset-password` (Issues new temp password) | - Cannot create users in another tenant (`403 Forbidden`)<br>- Cannot modify or reset users in another tenant (`403 Forbidden`)<br>- Cannot disable own admin account (`400 Bad Request`) |
| **`SYSTEM_ADMIN` (Super Admin)** | **Global (All Tenants)** | - Full cross-tenant management across `HR`, `FINANCE`, `LEGAL`, `ENGINEERING`<br>- Can provision and audit users across all departments | - Cannot disable own super-admin account (`400 Bad Request`) |
| **`DATA_STEWARD` / `COMPLIANCE_AUDITOR`** | **Tenant Scope** | - Business workflows (Quarantine resolution, Document Ingestion, Lineage graph inspection) | - All `/api/v1/admin/*` endpoints strictly blocked (`403 Forbidden`) |

---

### 8. Cryptographic Hash-Chained Audit Trail

All identity and governance events write append-only records to `compliance_audit_log`. Each record is cryptographically linked to the preceding record, forming a tamper-evident blockchain-style ledger:

$$\text{integrity\_hash}_n = \text{SHA-256}\Big(\text{prev\_hash}_{n} + \text{tenant\_id} + \text{actor\_id} + \text{action} + \text{target\_id} + \text{timestamp}\Big)$$

Where $\text{prev\_hash}_n = \text{integrity\_hash}_{n-1}$ (or 64 zeros for the genesis record).

#### Audited Identity Actions:
- `USER_CREATE`: User account provisioned with initial role and department.
- `USER_UPDATE`: User role changed or status toggled (`ACTIVE` / `DISABLED`).
- `USER_PASSWORD_RESET`: Temporary password generated and forced rotation flag set.
- `LOGIN_LOCKOUT`: Account locked after 5 consecutive failed login attempts.
- `PASSWORD_CHANGE`: Permanent password chosen by user meeting security policy.
