# ReelCraft Studio — PostgreSQL Database Schema & ER Diagram

All 12 tables are defined in `backend/app/db/models.py` and provisioned from scratch using `docker-compose.yml` + Alembic migration `backend/alembic/versions/0001_initial_schema.py`.

## Entity Relationship Diagram

```
users (1) ──────< projects (N) ──────< stories (N)
  │                                       │
  │                                       └──< episodes (N) ──< scenes (N)
  │                                                                │
  ├──< characters (N) ──< character_reference_images (N) >── assets (1)
  │                                                                ▲
  ├──< prompts (N)                                                 │
  │                                                                │
  └──< generation_jobs (N) ───(1:1)─── generated_videos (1) ───────┘
             ▲
             │
       model_versions (1)
```

## Table Summary (12 Tables)
1. **users**: Account identity, display name, password hash placeholder, active flag.
2. **projects**: Top-level series containers (`target_style`, `aspect_ratio` check constraint).
3. **stories**: Episodic story worlds linked optionally to projects.
4. **episodes**: Numbered episodes (`uq_episodes_story_number`), continuity summary, and `previous_episode_context`.
5. **scenes**: Scene breakdowns per episode (`uq_scenes_episode_number`), compiled prompt, negative prompt, duration.
6. **characters**: Persistent character bible (face, hairstyle, clothing, age, body description, personality, visual style).
7. **character_reference_images**: Links characters to uploaded reference image `assets` with `is_primary` and `pose_label`.
8. **assets**: Stored media metadata (`asset_type` check constraint, provider, bucket, unique `object_key`, MIME type, `size_bytes`).
9. **prompts**: Saved reusable prompt templates.
10. **model_versions**: Registered open-weight model checkpoints (`wan-2.2-ti2v-5b`, `ltx-video-0.9.7`, `wan-2.2-i2v-a14b`, `hunyuan-video`).
11. **generation_jobs**: Full execution history, `scene_plan_json` (JSONB), duration check (`BETWEEN 30 AND 60`), `error_message`, `error_logs`.
12. **generated_videos**: Completed MP4 outputs with `validated_duration_ms`, pixel width/height, FPS, and asset links.

## Verify PostgreSQL Connection (`psql`)
```powershell
docker exec -it reelcraft-postgres psql -U reelcraft -d reelcraft_studio -c "\dt"
```

## Backup & Restore
```powershell
# Backup
docker exec reelcraft-postgres pg_dump -U reelcraft reelcraft_studio > reelcraft_backup.sql

# Restore
Get-Content reelcraft_backup.sql | docker exec -i reelcraft-postgres psql -U reelcraft -d reelcraft_studio
```
