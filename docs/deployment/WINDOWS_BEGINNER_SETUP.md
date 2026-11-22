# Windows Beginner Setup Guide (VS Code + PowerShell)

Follow these exact steps to run ReelCraft Studio on a fresh Windows computer starting from zero.

## Step 1: Install Required Tools
1. **Node.js 20 LTS**: Install from https://nodejs.org
2. **Python 3.11+**: Install from https://python.org (check **"Add Python to PATH"** during setup)
3. **Docker Desktop**: Install from https://docker.com (used to run PostgreSQL 16 cleanly without manual installers)
4. **FFmpeg**: Install in PowerShell with `winget install Gyan.FFmpeg`, then restart VS Code.

## Step 2: Configure Environment Files
Open VS Code Terminal (PowerShell) in the project root folder:

```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
```

Open `backend\.env` and change `POSTGRES_PASSWORD="CHANGE_ME_STRONG_PASSWORD"` to your own password, and update `DATABASE_URL` to use that exact same password.

## Step 3: Start PostgreSQL 16 From Scratch
```powershell
docker compose up -d
```

Verify PostgreSQL is healthy:
```powershell
docker ps
```

## Step 4: Set Up & Migrate the Python Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
```

Run backend tests:
```powershell
pytest
```

Start the FastAPI server (keep this terminal open):
```powershell
uvicorn app.main:app --reload --port 8000
```

## Step 5: Start the React Frontend
Open a **second** PowerShell terminal in the project root:
```powershell
npm install
npm run dev
```

Open `http://localhost:3000` in your browser, go to **Settings**, set Backend API Base URL to `http://localhost:8000`, and click **Test Backend Connection**. You should see **Backend Connected**.

## Step 6: Connect a Cloud GPU Worker (When Ready to Render MP4s)
1. Rent an RTX 4090 (24 GB VRAM) pod on RunPod or Vast.ai.
2. Copy `model/inference/runner.py` and `backend/app/services/ffmpeg_service.py` to the GPU pod and install PyTorch + Diffusers + FFmpeg.
3. Expose your GPU worker endpoint and paste its URL into `GPU_WORKER_BASE_URL` in `backend\.env`.
4. Restart `uvicorn` so ReelCraft Studio dispatches real 30–60 second multi-scene video renders!
