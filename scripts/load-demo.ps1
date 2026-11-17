# ==============================================================================
# Enterprise Semantic-RAG Platform — Demo Data Loader
# File: scripts/load-demo.ps1
# ==============================================================================
param(
    [string]$GatewayUrl = "http://127.0.0.1:8080/api/v1"
)

$ErrorActionPreference = "Stop"

$script = Join-Path $PSScriptRoot "load_demo.py"
python $script $GatewayUrl
