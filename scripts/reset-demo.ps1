# ==============================================================================
# Enterprise Semantic-RAG Platform — Demo Reset Script
# File: scripts/reset-demo.ps1
# ==============================================================================
param(
    [switch]$Force = $false
)

if (-not $Force) {
    Write-Host "This operation will permanently purge all demonstration artifacts in PostgreSQL, Redis, RabbitMQ, and RustFS S3." -ForegroundColor Yellow
    $confirm = Read-Host "Type 'CONFIRM' to execute reset"
    if ($confirm -ne "CONFIRM") {
        Write-Host "`n[ABORTED] Reset cancelled by user. No data was modified." -ForegroundColor Yellow
        exit 0
    }
}

$script = Join-Path $PSScriptRoot "reset_demo.py"
python $script
