# ==============================================================================
# Enterprise Semantic-RAG Platform — Demo Data Loader
# File: scripts/load-demo.ps1
# ==============================================================================
param(
    [string]$GatewayUrl = "http://127.0.0.1:8080/api/v1",
    [switch]$FullCorpus = $false
)

$ErrorActionPreference = "Stop"

$script = Join-Path $PSScriptRoot "load_demo.py"
if ($FullCorpus) {
    python $script $GatewayUrl --full
} else {
    python $script $GatewayUrl
}
