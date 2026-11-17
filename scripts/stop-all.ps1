# ==============================================================================
# Enterprise Semantic-RAG Platform — Stack Teardown Script
# File: scripts/stop-all.ps1
# ==============================================================================
param(
    [switch]$IncludeInfra = $false
)

Write-Host "=================================================================" -ForegroundColor Yellow
Write-Host " STOPPING ENTERPRISE SEMANTIC-RAG APPLICATION SERVICES" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Yellow

$Root = Resolve-Path "$PSScriptRoot\.."

# Function to stop process listening on a specific TCP port
function Stop-ProcessByPort {
    param([int]$Port, [string]$ServiceName)
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $pidToKill = $conn.OwningProcess
                Write-Host "  -> Terminating $ServiceName (PID: $pidToKill) on port $Port..." -ForegroundColor Cyan
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            }
            Write-Host "  [OK] $ServiceName stopped." -ForegroundColor Green
        } else {
            Write-Host "  [INFO] $ServiceName is not currently running on port $Port." -ForegroundColor Gray
        }
    } catch {
        Write-Host "  [WARN] Could not stop process on port $Port: $_" -ForegroundColor Yellow
    }
}

# 1. Stop Vite Frontend (:5173)
Stop-ProcessByPort -Port 5173 -ServiceName "Vite Frontend"

# 2. Stop Python AI Engine (:8000)
Stop-ProcessByPort -Port 8000 -ServiceName "Python AI Engine"

# 3. Stop Java Gateway (:8080)
Stop-ProcessByPort -Port 8080 -ServiceName "Java Gateway"

# 4. Optional: Stop Docker Infrastructure
if ($IncludeInfra) {
    Write-Host "`nStopping Docker Compose containers..." -ForegroundColor Yellow
    Push-Location $Root
    docker compose stop
    Pop-Location
    Write-Host "[OK] Docker containers stopped." -ForegroundColor Green
} else {
    Write-Host "`n[INFO] Docker containers left running. Use -IncludeInfra to stop containers as well." -ForegroundColor Gray
}

Write-Host "`n=================================================================" -ForegroundColor Yellow
Write-Host " TEARDOWN COMPLETE" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Yellow
