# ==============================================================================
# Enterprise Semantic-RAG Platform — Stack Startup Script
# File: scripts/start-all.ps1
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " STARTING ENTERPRISE SEMANTIC-RAG GOVERNANCE PLATFORM" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$Root = Resolve-Path "$PSScriptRoot\.."
$JavaHome = "C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot"

# 1. Start Docker Infrastructure
Write-Host "`n[1/5] Checking Docker Compose infrastructure containers..." -ForegroundColor Yellow
Push-Location $Root
try {
    docker compose up -d
    Write-Host "[OK] Docker containers launched (postgres, rabbitmq, redis, rustfs, tika)." -ForegroundColor Green
} catch {
    Write-Error "Failed to start Docker Compose infrastructure: $_"
}
Pop-Location

# 2. Start Java Gateway (Port 8080)
Write-Host "`n[2/5] Launching Java Gateway (Spring Boot 3.2, Java 21) on port 8080..." -ForegroundColor Yellow
$GatewayCmd = "`$env:JAVA_HOME = '$JavaHome'; `$env:Path = `"`$env:JAVA_HOME\bin;`$env:Path`"; cd '$Root\java-gateway'; mvn spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $GatewayCmd -WindowStyle Normal

# 3. Start Python AI Engine (Port 8000)
Write-Host "`n[3/5] Launching Python AI Engine (FastAPI, PyTorch, Uvicorn) on port 8000..." -ForegroundColor Yellow
$PythonCmd = "cd '$Root\python-ai-engine'; python -u -m uvicorn main:app --port 8000 --host 0.0.0.0"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $PythonCmd -WindowStyle Normal

# 4. Start Vite Frontend (Port 5173)
Write-Host "`n[4/5] Launching Vite Frontend on port 5173..." -ForegroundColor Yellow
$FrontendCmd = "cd '$Root'; npm run dev -- --host 0.0.0.0"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCmd -WindowStyle Normal

# 5. Health Check Polling
Write-Host "`n[5/5] Polling service health status..." -ForegroundColor Yellow

function Test-Endpoint {
    param([string]$Url, [string]$Name, [int]$TimeoutSeconds = 60)
    $startTime = Get-Date
    while (((Get-Date) - $startTime).TotalSeconds -lt $TimeoutSeconds) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
                Write-Host "  -> [READY] $Name is UP ($Url)" -ForegroundColor Green
                return $true
            }
        } catch {}
        Start-Sleep -Seconds 2
    }
    Write-Host "  -> [TIMEOUT] $Name did not respond within $TimeoutSeconds seconds ($Url)" -ForegroundColor Red
    return $false
}

$pyOk = Test-Endpoint -Url "http://127.0.0.1:8000/health" -Name "Python AI Engine" -TimeoutSeconds 30
$gwOk = Test-Endpoint -Url "http://127.0.0.1:8080/api/v1/health" -Name "Java Gateway" -TimeoutSeconds 90
$feOk = Test-Endpoint -Url "http://127.0.0.1:5173" -Name "Vite Frontend" -TimeoutSeconds 20

Write-Host "`n=================================================================" -ForegroundColor Cyan
if ($pyOk -and $gwOk -and $feOk) {
    Write-Host " ALL SERVICES ARE UP AND READY FOR DEMO!" -ForegroundColor Green
    Write-Host " - Frontend UI:        http://127.0.0.1:5173" -ForegroundColor White
    Write-Host " - Java Gateway API:   http://127.0.0.1:8080/api/v1" -ForegroundColor White
    Write-Host " - Python AI Engine:   http://127.0.0.1:8000" -ForegroundColor White
    Write-Host " - RabbitMQ UI:        http://127.0.0.1:15672 (guest/guest)" -ForegroundColor White
    Write-Host " - RustFS Console:     http://127.0.0.1:9001" -ForegroundColor White
} else {
    Write-Host " STACK STARTED WITH WARNINGS - CHECK CONSOLES" -ForegroundColor Red
}
Write-Host "=================================================================" -ForegroundColor Cyan
