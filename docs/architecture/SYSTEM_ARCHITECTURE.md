# ReelCraft Studio — System Architecture

## Overview
ReelCraft Studio uses a decoupled three-tier architecture designed for personal low-budget AI video creation (30–60 second vertical Instagram Reels and episodic animated stories):

```
+-----------------------------------+
|  React + TypeScript + Tailwind    |  Port 3000 (Vite SPA)
|  - Dashboard, Create Video        |  - Browser LocalStorage workspace until DB connected
|  - My Videos, Stories, Characters |  - Real /api/v1/health verification
+-----------------+-----------------+
                  | REST (JSON) + Multipart Upload
                  v
+-----------------------------------+
|  FastAPI Control Plane            |  Port 8000 (Python 3.11+)
|  - Pydantic v2 validation         |  - Rate limits, path confinement, ownership checks
|  - SQLAlchemy 2.0 + Alembic       |  - Async PostgreSQL persistence
|  - FFmpegService                  |  - Multi-clip stitching & ffprobe verification
+--------+-----------------+--------+
         |                 |
         v                 v
+-----------------+   +---------------------------------------+
| PostgreSQL 16   |   | Self-Hosted Cloud GPU Inference Node  |
| (Docker Compose)|   | (RunPod / Vast.ai / Modal)            |
| 12-Table Schema |   | - Wan 2.2 TI2V-5B / LTX-Video /       |
+-----------------+   |   Wan 2.2 I2V-A14B / HunyuanVideo     |
                      | - model/inference/runner.py           |
                      +---------------------------------------+
```

## 12-Step Generation Pipeline
1. **Creator Input**: User enters clip title, primary prompt, narrative beat, negative prompt, visual style (`3D Indian Anime`, `Cartoon`, `Realistic`, `Cinematic`, `Custom Style`), total duration (`30`, `40`, `45`, `50`, or `60` seconds), aspect ratio (`9:16`, `16:9`, `1:1`), model, and saved characters.
2. **Scene Division**: `divideDurationIntoScenes()` splits the 30–60s target duration into shorter clips matching the model's native single-clip limit (e.g., 5s per scene).
3. **Character Conditioning**: Selected character profiles (face, hairstyle, clothing, age, body description, personality) and optional reference images are compiled into every scene prompt.
4. **API Validation**: FastAPI validates `total_duration_seconds` (30–60s), verifies `sum(scene.duration_seconds) == total_duration_seconds`, and checks per-user generation rate limits.
5. **Job Persistence**: FastAPI inserts a `GenerationJob` row (`Queued`) into PostgreSQL.
6. **Single-Concurrency Lock**: `CloudGpuWorkerManager` acquires `asyncio.Semaphore(1)` to prevent out-of-memory crashes on low-budget 24 GB GPUs.
7. **Scene Inference**: `model/inference/runner.py` generates each scene clip sequentially on CUDA and calls `torch.cuda.empty_cache()` between clips.
8. **FFmpeg Normalization**: Each clip is scaled and padded cleanly to the exact target dimensions and 24 FPS.
9. **Concatenation & Audio Sync**: `FFmpegService` stitches all normalized clips into a single `.mp4` with `+faststart` metadata and optional audio track.
10. **Duration Verification**: `ffprobe` verifies the final `.mp4` duration matches the requested 30–60s target within tolerance.
11. **Thumbnail & Storage**: FFmpeg extracts a 1-second frame thumbnail; both `.mp4` and `.jpg` are saved via `LocalDiskStorageBackend` or `S3StorageBackend`.
12. **Library Delivery**: Job transitions to `Completed` with real file metadata; My Videos renders the real playable/downloadable video.
