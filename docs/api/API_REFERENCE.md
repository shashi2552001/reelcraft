# ReelCraft Studio — FastAPI Reference

Start the backend server on port `8000` and open interactive Swagger docs at:
`http://localhost:8000/docs`

## System & Assets
- `GET /api/v1/health` — Checks real PostgreSQL connectivity (`SELECT 1`), GPU worker configuration, and storage backend.
- `GET /api/v1/models` — Lists supported open-weight models, VRAM requirements, and per-aspect-ratio resolutions.
- `POST /api/v1/assets/upload` — Uploads validated PNG/JPEG/WebP/MP4 files (max 10 MB) to local or S3 storage.
- `POST /api/v1/assets/presign-upload` — Issues safe upload instructions or S3 presigned PUT URLs.
- `GET /api/v1/assets/local/{object_key}` — Serves local assets safely with path-traversal confinement.

## Studio Resources (PostgreSQL Required)
- `POST /api/v1/projects` / `GET /api/v1/projects` / `GET /api/v1/projects/{project_id}`
- `POST /api/v1/stories` / `GET /api/v1/stories` / `GET /api/v1/stories/{story_id}`
- `POST /api/v1/characters` / `GET /api/v1/characters` / `PUT /api/v1/characters/{character_id}` / `DELETE /api/v1/characters/{character_id}`
- `POST /api/v1/scenes` / `GET /api/v1/scenes`

## Video Generation & Library (PostgreSQL + Cloud GPU Required)
- `POST /api/v1/generations` — Enforces rate limits, validates 30–60s scene duration sums, saves job, and dispatches to Cloud GPU.
- `GET /api/v1/generations/{job_id}` — Returns current status or polls the GPU worker and registers completed MP4 outputs.
- `POST /api/v1/generations/{job_id}/retry` — Retries a `Failed` or `Cancelled` job.
- `POST /api/v1/generations/{job_id}/cancel` — Cancels an active job.
- `GET /api/v1/videos` / `GET /api/v1/videos/{video_id}` / `DELETE /api/v1/videos/{video_id}`
