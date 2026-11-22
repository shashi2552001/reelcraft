# ReelCraft Studio

A personal, beginner-friendly AI video creation studio for producing **30–60 second vertical Instagram Reels (9:16)**, episodic animated stories, 3D Indian Anime, Cartoon, and Cinematic videos using **self-hosted open-weight video models** (`Wan 2.2 TI2V-5B`, `LTX-Video`, `Wan 2.2 I2V-A14B`, `HunyuanVideo`).

Everything is built for starting from **zero existing infrastructure** (no pre-existing database, backend server, or GPU required until you are ready).

## Project Structure
- `src/` — React + TypeScript + Tailwind CSS v4 studio interface (Dashboard, Create Video, My Videos, My Stories, Characters, Prompt Library, Settings, Help).
- `backend/` — FastAPI API, SQLAlchemy 2.0 ORM, Alembic migrations (12 PostgreSQL tables), FFmpeg multi-clip stitcher, storage service, and Cloud GPU worker client.
- `model/` — Cloud GPU inference runner (`inference/runner.py`), Phase 2 character LoRA prep (`training/lora_prep.py`), and MP4 evaluation harness (`evaluation/benchmark.py`).
- `docs/` — Architecture, 12-table ER diagram, API reference, and Windows beginner setup guide.
- `docker-compose.yml` — One-command PostgreSQL 16 database setup.

## Quick Start on Windows (PowerShell)

```powershell
# 1. Copy environment templates and set your own POSTGRES_PASSWORD in backend\.env
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env

# 2. Start a fresh PostgreSQL 16 database
docker compose up -d

# 3. Install backend packages, run migrations, and start FastAPI
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

In a second PowerShell terminal in the project root:

```powershell
# 4. Install frontend dependencies and run ReelCraft Studio UI
npm install
npm run dev
```

Then open `http://localhost:3000`. Use **Help** inside the app or `docs/deployment/WINDOWS_BEGINNER_SETUP.md` for full Cloud GPU connection instructions.
