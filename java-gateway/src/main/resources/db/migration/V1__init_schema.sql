-- Flyway Migration V1: Semantic RAG Governance Target Data Layer
-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table (Real authentication with BCrypt password hashes)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL CHECK (role IN ('DATA_STEWARD', 'SYSTEM_ADMIN', 'COMPLIANCE_AUDITOR')),
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);

-- 3. Ingestion Jobs Table
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    uploaded_by VARCHAR(64),
    object_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('UPLOAD_PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
    chunk_total INT DEFAULT 0,
    chunks_committed INT DEFAULT 0,
    chunks_quarantined INT DEFAULT 0,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_tenant ON ingestion_jobs(tenant_id, created_at DESC);

-- 4. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    job_id VARCHAR(64) REFERENCES ingestion_jobs(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(32) DEFAULT '1.0',
    effective_date VARCHAR(64),
    status VARCHAR(32) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'ARCHIVED')),
    content_sha256 VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_status ON documents(tenant_id, status);

-- 5. Clean Vector Index Table (vector_chunks)
CREATE TABLE IF NOT EXISTS vector_chunks (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT DEFAULT 0,
    doc_name VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    chunk_text TEXT NOT NULL,
    embedding vector(384) NOT NULL,
    status VARCHAR(32) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'SUPERSEDED')),
    superseded_by VARCHAR(64),
    content_sha256 VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vector_chunks_tenant_status ON vector_chunks (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_vector_chunks_doc_chunk ON vector_chunks (document_id, chunk_index);

-- Real HNSW Index on pgvector embeddings
CREATE INDEX IF NOT EXISTS idx_vector_chunks_hnsw ON vector_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- 6. Quarantine Queue Table (Flagged Policy Collisions)
CREATE TABLE IF NOT EXISTS quarantine_queue (
    id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) REFERENCES ingestion_jobs(id) ON DELETE SET NULL,
    document_id VARCHAR(64) REFERENCES documents(id) ON DELETE CASCADE,
    existing_document VARCHAR(255),
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    similarity_score FLOAT NOT NULL,
    verdict_type VARCHAR(64) NOT NULL CHECK (verdict_type IN ('CONTRADICTORY', 'SUPERSEDING_POLICY', 'PARTIAL_UPDATE', 'CLEAN_APPEND')),
    contradiction_explanation TEXT NOT NULL,
    verdict_confidence FLOAT DEFAULT 0.95,
    existing_chunk_id VARCHAR(64),
    existing_chunk_text TEXT,
    incoming_chunk_text TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROMOTED_INCOMING', 'KEEP_EXISTING', 'REJECT_INCOMING', 'MANUALLY_MERGED')),
    resolved_by VARCHAR(64),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_action VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quarantine_tenant_status ON quarantine_queue (tenant_id, status);

-- 7. Compliance Audit Log Table (Cryptographically chained tamper-evident log)
CREATE TABLE IF NOT EXISTS compliance_audit_log (
    id VARCHAR(64) PRIMARY KEY,
    prev_hash VARCHAR(64),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actor_name VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    action VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    integrity_hash VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_time ON compliance_audit_log(tenant_id, timestamp ASC);

-- Enforce append-only integrity: prohibit UPDATE and DELETE operations
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'compliance_audit_log is append-only: updates and deletes are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_update_delete_audit ON compliance_audit_log;
CREATE TRIGGER trg_no_update_delete_audit
BEFORE UPDATE OR DELETE ON compliance_audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- 8. Provenance Lineage Edges Table (Backed by React Flow DAG)
CREATE TABLE IF NOT EXISTS provenance_edges (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    from_chunk_id VARCHAR(64) NOT NULL,
    to_chunk_id VARCHAR(64) NOT NULL,
    relation VARCHAR(64) NOT NULL CHECK (relation IN ('SUPERSEDES', 'CONTRADICTS', 'PARTIAL_UPDATE_OF', 'DERIVED_FROM')),
    created_by_conflict_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provenance_edges_tenant ON provenance_edges(tenant_id);

-- 9. Telemetry Metrics Table
CREATE TABLE IF NOT EXISTS telemetry_metrics (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    metric VARCHAR(64) NOT NULL,
    value FLOAT NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_tenant_metric ON telemetry_metrics(tenant_id, metric, recorded_at DESC);
