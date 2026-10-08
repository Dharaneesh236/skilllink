# SkillLink Local Startup Script for PowerShell
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting SkillLink Micro-Employment Platform Locally" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Start backend process
Write-Host "Starting Backend API (FastAPI) on http://localhost:8000..." -ForegroundColor Green
$backendJob = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$Root\backend'; .\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload" -PassThru

# 2. Start frontend process
Write-Host "Starting Frontend (Vite) on http://localhost:5173..." -ForegroundColor Green
$frontendJob = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$Root\frontend'; npm run dev -- --port 5173 --host" -PassThru

Write-Host "SkillLink services initiated successfully!" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "- Backend API: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "- Live Engine: http://localhost:5173/live-engine" -ForegroundColor Yellow
