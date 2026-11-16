-- V6: Expand quarantine_queue verdict_type and status constraints for extraction failures and DLQ
ALTER TABLE quarantine_queue DROP CONSTRAINT IF EXISTS quarantine_queue_verdict_type_check;

ALTER TABLE quarantine_queue ADD CONSTRAINT quarantine_queue_verdict_type_check 
    CHECK (verdict_type IN (
        'CONTRADICTORY', 
        'SUPERSEDING_POLICY', 
        'PARTIAL_UPDATE', 
        'CLEAN_APPEND', 
        'EXTRACTION_FAILED', 
        'EMPTY_FILE', 
        'CORRUPT_FILE', 
        'SUSPICIOUS_FILE'
    ));

-- Allow QUARANTINED status on documents table
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_status_check 
    CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'ARCHIVED', 'QUARANTINED'));

-- Allow FAILED_DLQ and QUARANTINED status on ingestion_jobs table
ALTER TABLE ingestion_jobs DROP CONSTRAINT IF EXISTS ingestion_jobs_status_check;
ALTER TABLE ingestion_jobs ADD CONSTRAINT ingestion_jobs_status_check 
    CHECK (status IN ('UPLOAD_PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'FAILED_DLQ', 'QUARANTINED'));
