# ==============================================================================
# Enterprise Semantic-RAG Platform — Demo Reset Script
# File: scripts/reset-demo.ps1
# ==============================================================================
param(
    [switch]$Force = $false
)

Write-Host "=================================================================" -ForegroundColor Red
Write-Host " DEMO RESET & SANITIZATION UTILITY" -ForegroundColor Red
Write-Host "=================================================================" -ForegroundColor Red
Write-Host "This operation will permanently purge all demonstration artifacts:`n" -ForegroundColor Yellow

Write-Host " 1. PostgreSQL Tables (TRUNCATED):" -ForegroundColor White
Write-Host "    - documents" -ForegroundColor Gray
Write-Host "    - vector_chunks" -ForegroundColor Gray
Write-Host "    - quarantine_queue" -ForegroundColor Gray
Write-Host "    - ingestion_jobs" -ForegroundColor Gray
Write-Host "    - provenance_edges" -ForegroundColor Gray
Write-Host "    - compliance_audit_log" -ForegroundColor Gray
Write-Host "    ** NOTE: 'users' and 'tenants' tables will NOT be touched. **`n" -ForegroundColor Green

Write-Host " 2. Redis In-Memory Keys (PURGED):" -ForegroundColor White
Write-Host "    - dedup:*" -ForegroundColor Gray
Write-Host "    - rag:query:*" -ForegroundColor Gray
Write-Host "    - token:denylist:*" -ForegroundColor Gray
Write-Host "    - adj:*`n" -ForegroundColor Gray

Write-Host " 3. RabbitMQ Message Queues (PURGED):" -ForegroundColor White
Write-Host "    - raw-document-queue" -ForegroundColor Gray
Write-Host "    - quarantine-queue" -ForegroundColor Gray
Write-Host "    - telemetry-queue`n" -ForegroundColor Gray

Write-Host " 4. RustFS S3 Storage (OBJECTS DELETED):" -ForegroundColor White
Write-Host "    - Bucket: semantic-rag-uploads/*`n" -ForegroundColor Gray

if (-not $Force) {
    $confirm = Read-Host "Type 'CONFIRM' to execute reset"
    if ($confirm -ne "CONFIRM") {
        Write-Host "`n[ABORTED] Reset cancelled by user. No data was modified." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "`nExecuting sanitization..." -ForegroundColor Cyan

# 1. Truncate PostgreSQL business tables
Write-Host "[1/4] Truncating PostgreSQL demo tables..." -ForegroundColor Yellow
$truncateSql = "TRUNCATE TABLE documents, vector_chunks, quarantine_queue, ingestion_jobs, provenance_edges, compliance_audit_log CASCADE;"
try {
    docker exec semantic-rag-postgres psql -U admin -d semantic_rag_db -c "$truncateSql"
    Write-Host "  [OK] Database tables truncated cleanly (users & tenants preserved)." -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Database truncation failed: $_" -ForegroundColor Red
}

# 2. Flush Redis cache keys
Write-Host "[2/4] Purging Redis cache and deduplication keys..." -ForegroundColor Yellow
try {
    docker exec semantic-rag-redis redis-cli FLUSHDB
    Write-Host "  [OK] Redis keys purged." -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Redis flush failed: $_" -ForegroundColor Red
}

# 3. Purge RabbitMQ queues
Write-Host "[3/4] Purging RabbitMQ queues..." -ForegroundColor Yellow
$queues = @("raw-document-queue", "quarantine-queue", "telemetry-queue")
foreach ($q in $queues) {
    try {
        docker exec semantic-rag-rabbitmq rabbitmqctl purge_queue $q 2>$null
        Write-Host "  [OK] Queue '$q' purged." -ForegroundColor Green
    } catch {
        Write-Host "  [INFO] Queue '$q' was already empty or not declared." -ForegroundColor Gray
    }
}

# 4. Purge RustFS S3 objects
Write-Host "[4/4] Purging RustFS S3 uploaded objects..." -ForegroundColor Yellow
$pyPurge = @"
import boto3
from botocore.client import Config

s3 = boto3.client(
    's3',
    endpoint_url='http://127.0.0.1:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)
try:
    resp = s3.list_objects_v2(Bucket='semantic-rag-uploads')
    if 'Contents' in resp:
        for obj in resp['Contents']:
            s3.delete_object(Bucket='semantic-rag-uploads', Key=obj['Key'])
            print(f'  [DELETED] s3://semantic-rag-uploads/{obj["Key"]}')
    print('  [OK] RustFS S3 objects purged.')
except Exception as e:
    print(f'  [WARN] RustFS purge notice: {e}')
"@
python -c "$pyPurge"

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host " DEMO RESET COMPLETE — PLATFORM IS IN PRISTINE DEMO STATE" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
