@echo off
echo ========================================================
echo Starting SkillLink Micro-Employment Platform Locally
echo ========================================================

cd /d "%~dp0"

echo [1/3] Ensuring backend virtualenv and dependencies...
if not exist "backend\venv" (
    python -m venv backend\venv
    call backend\venv\Scripts\activate.bat
    pip install -r backend\requirements.txt
)

echo [2/3] Starting Backend API Server (FastAPI + WebSockets) on http://localhost:8000...
start "SkillLink Backend" cmd /k "backend\venv\Scripts\activate.bat && cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Starting Frontend Dev Server on http://localhost:5173...
start "SkillLink Frontend" cmd /k "cd frontend && npm run dev -- --port 5173 --host"

echo ========================================================
echo SkillLink is running!
echo - Frontend: http://localhost:5173
echo - Backend API & Docs: http://localhost:8000/docs
echo - Live Engine Demo: http://localhost:5173/live-engine
echo ========================================================
