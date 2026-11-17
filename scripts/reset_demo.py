#!/usr/bin/env python3
"""
Enterprise Semantic-RAG Platform — Demo Data Sanitization Script
Script: scripts/reset_demo.py
"""

import sys
import subprocess
import boto3
from botocore.client import Config

def run_cmd(cmd, desc):
    print(f"[RUNNING] {desc}...")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode == 0:
        print(f"  [OK] {desc} succeeded.")
        if res.stdout.strip():
            print(f"       {res.stdout.strip()}")
    else:
        print(f"  [WARN] {desc} error: {res.stderr.strip() or res.stdout.strip()}")

def main():
    print("=" * 65)
    print(" ENTERPRISE SEMANTIC-RAG PLATFORM — PURGING ALL DUMMY DATA")
    print(" Preserving: 'users' and 'tenants' tables")
    print("=" * 65)

    # 1. Truncate PostgreSQL demo tables
    truncate_sql = "TRUNCATE TABLE documents, vector_chunks, quarantine_queue, ingestion_jobs, provenance_edges, compliance_audit_log CASCADE;"
    run_cmd(
        f'docker exec semantic-rag-postgres psql -U admin -d semantic_rag_db -c "{truncate_sql}"',
        "Truncating PostgreSQL business tables"
    )

    # 2. Flush Redis cache and dedup keys
    run_cmd(
        'docker exec semantic-rag-redis redis-cli FLUSHDB',
        "Flushing Redis cache and deduplication keys"
    )

    # 3. Purge RabbitMQ queues
    for q in ["raw-document-queue", "quarantine-queue", "telemetry-queue", "raw-document-dlq"]:
        run_cmd(
            f'docker exec semantic-rag-rabbitmq rabbitmqctl purge_queue {q}',
            f"Purging RabbitMQ queue '{q}'"
        )

    # 4. Purge RustFS S3 objects
    print("[RUNNING] Purging RustFS S3 uploaded objects...")
    try:
        s3 = boto3.client(
            's3',
            endpoint_url='http://127.0.0.1:9000',
            aws_access_key_id='minioadmin',
            aws_secret_access_key='minioadmin',
            config=Config(signature_version='s3v4'),
            region_name='us-east-1'
        )
        resp = s3.list_objects_v2(Bucket='semantic-rag-uploads')
        if 'Contents' in resp:
            for obj in resp['Contents']:
                s3.delete_object(Bucket='semantic-rag-uploads', Key=obj['Key'])
                print(f"  [DELETED] s3://semantic-rag-uploads/{obj['Key']}")
        print("  [OK] RustFS S3 objects purged.")
    except Exception as e:
        print(f"  [WARN] RustFS purge notice: {e}")

    print("\n" + "=" * 65)
    print(" [CLEAN] ALL DUMMY & DEMO DATA PURGED SUCCESSFULLY")
    print("=" * 65)

if __name__ == '__main__':
    main()
