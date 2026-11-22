# ReelCraft Studio — Backend, PostgreSQL & Storage Setup Guide (From Zero)

This directory contains the decoupled FastAPI backend, SQLAlchemy 2.0 models, Alembic migrations, S3-compatible storage service, and Cloud GPU worker adapter. Nothing in here runs automatically until you provision PostgreSQL, object storage, and a GPU worker.

---

## 1. Create a New PostgreSQL Database From Scratch

You have two low-budget options when ready:

### Option A: Local PostgreSQL (Free for Development)
1. Install PostgreSQL 16+ locally (or run via Docker):
   ```bash
   docker run --name reelcraft-pg \
     -e POSTGRES_USER=reelcraft \
     -e POSTGRES_PASSWORD=CHOOSE_A_STRONG_PASSWORD \
     -e POSTGRES_DB=reelcraft_studio \
     -p 5432:5432 -d postgres:16
   ```

### Option B: Managed Serverless PostgreSQL (Free Tier / Low Budget)
Create a new database on Neon, Supabase, or Google Cloud SQL (PostgreSQL 16), create a dedicated database named `reelcraft_studio`, and copy the connection string.

---

## 2. Configure Environment Credentials Securely

Never hardcode passwords or commit `.env` files to Git.

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your actual credentials:
- `DATABASE_URL="postgresql+asyncpg://<USER>:<PASSWORD>@<HOST>:5432/reelcraft_studio"`
- `JWT_SECRET_KEY` (generate via `openssl rand -hex 32`)
- `CORS_ORIGINS="http://localhost:3000"`

---

## 3. Install Python Dependencies & Run Alembic Migrations

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Export DATABASE_URL or load .env, then apply the 12-table initial migration:
export $(grep -v '^#' .env | xargs)
alembic upgrade head
```

This creates all 12 tables with primary keys, foreign keys, indexes, check constraints, and timestamps:
- `users`, `projects`, `stories`, `episodes`, `characters`, `character_reference_images`, `scenes`, `prompts`, `model_versions`, `generation_jobs`, `generated_videos`, `assets`.

---

## 4. Configure S3-Compatible Storage

For low-budget personal use, **Cloudflare R2** (10 GB free, $0 egress) or **Backblaze B2** is recommended:
1. Create a private bucket (e.g. `reelcraft-studio-assets`).
2. Generate an S3 API token with read/write permissions scoped only to that bucket.
3. Add `S3_ENDPOINT_URL`, `S3_BUCKET_NAME`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` to `backend/.env`.
4. Configure bucket CORS to allow `PUT` requests from your frontend origin so presigned character image uploads work directly without exposing credentials.

---

## 5. Run the FastAPI Backend & Connect the Frontend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Then open **ReelCraft Studio -> Settings -> Studio & Local Data**, enter `http://localhost:8000` in **FastAPI Backend Connection**, and click **Save & Test /health**.
