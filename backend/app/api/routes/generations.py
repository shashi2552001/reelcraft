from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.model_adapter import resolve_target_dimensions
from app.api.dependencies import (
    ensure_model_version,
    ensure_user_exists,
    get_required_db_session,
    parse_uuid,
    resolve_user_uuid,
)
from app.core.config import get_settings
from app.core.security import (
    enforce_generation_rate_limit,
    get_current_user_id,
    verify_resource_ownership,
)
from app.db.models import Asset, GeneratedVideo, GenerationJob, Scene
from app.schemas.api import (
    GenerateVideoRequest,
    JobStatusResponse,
    ScenePlanInput,
    VideoRecordResponse,
)
from app.storage.storage_service import get_storage_backend
from app.workers.gpu_worker import CloudGpuWorkerManager

router = APIRouter(tags=["Video Generations & Library"])
gpu_worker = CloudGpuWorkerManager()


@router.post("/api/v1/generations", response_model=JobStatusResponse)
async def submit_video_generation(
    payload: GenerateVideoRequest,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> JobStatusResponse:
    settings = get_settings()
    enforce_generation_rate_limit(user_id, settings.rate_limit_generations_per_min)

    if not gpu_worker.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Cloud GPU worker is not configured yet. Start your GPU inference node and "
                "set GPU_WORKER_BASE_URL in backend/.env before submitting video jobs."
            ),
        )

    user = await ensure_user_exists(session, user_id)
    model_version = await ensure_model_version(session, payload.model_id)

    scene_uuid = parse_uuid(payload.scene_id, "scene_id") if payload.scene_id else None
    if scene_uuid is not None:
        scene = await session.get(Scene, scene_uuid)
        if scene is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked scene not found.")

    job_id = uuid.uuid4()
    job = GenerationJob(
        id=job_id,
        user_id=user.id,
        scene_id=scene_uuid,
        model_version_id=model_version.id,
        status="Queued",
        compiled_prompt=payload.compiled_prompt,
        negative_prompt=payload.negative_prompt,
        aspect_ratio=payload.aspect_ratio,
        resolution_label=payload.resolution_label,
        duration_seconds=payload.total_duration_seconds,
        scene_plan_json=[s.model_dump() for s in payload.scenes],
        started_at=datetime.now(timezone.utc),
    )
    session.add(job)
    await session.commit()

    worker_result = await gpu_worker.dispatch_generation(job_id=str(job.id), payload=payload)
    job.status = worker_result.status
    job.error_message = worker_result.error_message
    if worker_result.status in ("Failed", "Cancelled", "Completed"):
        job.completed_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(job)

    return JobStatusResponse(
        job_id=str(job.id),
        status=job.status,  # type: ignore[arg-type]
        video_url=worker_result.video_url,
        thumbnail_url=worker_result.thumbnail_url,
        file_size_bytes=worker_result.file_size_bytes,
        validated_duration_seconds=worker_result.validated_duration_seconds,
        error_message=job.error_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.get("/api/v1/generations/{job_id}", response_model=JobStatusResponse)
async def get_generation_status(
    job_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> JobStatusResponse:
    owner_uuid = resolve_user_uuid(user_id)
    stmt = (
        select(GenerationJob)
        .options(
            selectinload(GenerationJob.generated_video).selectinload(GeneratedVideo.asset),
            selectinload(GenerationJob.generated_video).selectinload(GeneratedVideo.thumbnail_asset),
            selectinload(GenerationJob.model_version),
        )
        .where(GenerationJob.id == parse_uuid(job_id, "job_id"))
    )
    job = (await session.execute(stmt)).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation job not found.")
    verify_resource_ownership(str(job.user_id), str(owner_uuid))

    if job.status in ("Queued", "Processing", "Rendering") and gpu_worker.is_configured():
        polled = await gpu_worker.poll_status(str(job.id))
        job.status = polled.status
        job.error_message = polled.error_message
        if polled.status == "Completed" and polled.video_url and job.generated_video is None:
            video_asset = Asset(
                user_id=job.user_id,
                asset_type="generated_video",
                storage_provider="external" if polled.video_url.startswith("http") else "local",
                bucket_name="reelcraft-studio",
                object_key=polled.video_url,
                mime_type="video/mp4",
                size_bytes=polled.file_size_bytes or 0,
            )
            session.add(video_asset)
            await session.flush()

            thumb_asset_id = None
            if polled.thumbnail_url:
                thumb_asset = Asset(
                    user_id=job.user_id,
                    asset_type="thumbnail",
                    storage_provider="external" if polled.thumbnail_url.startswith("http") else "local",
                    bucket_name="reelcraft-studio",
                    object_key=polled.thumbnail_url,
                    mime_type="image/jpeg",
                    size_bytes=0,
                )
                session.add(thumb_asset)
                await session.flush()
                thumb_asset_id = thumb_asset.id

            width, height = resolve_target_dimensions(
                job.model_version.slug if job.model_version else "wan-2.2-ti2v-5b",
                job.aspect_ratio,
            )
            validated_sec = polled.validated_duration_seconds or float(job.duration_seconds)
            video_record = GeneratedVideo(
                job_id=job.id,
                user_id=job.user_id,
                asset_id=video_asset.id,
                thumbnail_asset_id=thumb_asset_id,
                title=f"ReelCraft Render {str(job.id)[:8]}",
                duration_seconds=job.duration_seconds,
                validated_duration_ms=int(validated_sec * 1000),
                width=width,
                height=height,
                fps=24,
            )
            session.add(video_record)
            job.completed_at = datetime.now(timezone.utc)
        elif polled.status in ("Failed", "Cancelled"):
            job.completed_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(job)

    video = job.generated_video
    return JobStatusResponse(
        job_id=str(job.id),
        status=job.status,  # type: ignore[arg-type]
        video_url=video.asset.object_key if video and video.asset else None,
        thumbnail_url=video.thumbnail_asset.object_key if video and video.thumbnail_asset else None,
        file_size_bytes=video.asset.size_bytes if video and video.asset else None,
        validated_duration_seconds=(
            round(video.validated_duration_ms / 1000.0, 2) if video else None
        ),
        error_message=job.error_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.post("/api/v1/generations/{job_id}/cancel", response_model=JobStatusResponse)
async def cancel_generation_job(
    job_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> JobStatusResponse:
    owner_uuid = resolve_user_uuid(user_id)
    job = await session.get(GenerationJob, parse_uuid(job_id, "job_id"))
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation job not found.")
    verify_resource_ownership(str(job.user_id), str(owner_uuid))

    result = await gpu_worker.cancel(str(job.id))
    job.status = "Cancelled"
    job.error_message = result.error_message
    job.completed_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(job)

    return JobStatusResponse(
        job_id=str(job.id),
        status="Cancelled",
        error_message=job.error_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.post("/api/v1/generations/{job_id}/retry", response_model=JobStatusResponse)
async def retry_generation_job(
    job_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> JobStatusResponse:
    settings = get_settings()
    enforce_generation_rate_limit(user_id, settings.rate_limit_generations_per_min)
    owner_uuid = resolve_user_uuid(user_id)

    stmt = (
        select(GenerationJob)
        .options(selectinload(GenerationJob.model_version))
        .where(GenerationJob.id == parse_uuid(job_id, "job_id"))
    )
    job = (await session.execute(stmt)).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation job not found.")
    verify_resource_ownership(str(job.user_id), str(owner_uuid))

    if job.status not in ("Failed", "Cancelled"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Only Failed or Cancelled jobs can be retried (current status: {job.status}).",
        )
    if not gpu_worker.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloud GPU worker is not configured yet.",
        )

    scenes_input = [
        ScenePlanInput(**item)
        for item in (job.scene_plan_json or [])
    ] or [
        ScenePlanInput(
            scene_number=1,
            title="Full Video",
            prompt=job.compiled_prompt,
            duration_seconds=job.duration_seconds,
        )
    ]

    retry_payload = GenerateVideoRequest(
        title=f"Retry {str(job.id)[:8]}",
        prompt=job.compiled_prompt,
        story_prompt="",
        negative_prompt=job.negative_prompt,
        compiled_prompt=job.compiled_prompt,
        visual_style="Cinematic",
        aspect_ratio=job.aspect_ratio,  # type: ignore[arg-type]
        resolution_label=job.resolution_label,
        total_duration_seconds=job.duration_seconds,
        scenes=scenes_input,
        model_id=job.model_version.slug if job.model_version else settings.default_video_model,
    )

    worker_result = await gpu_worker.dispatch_generation(job_id=str(job.id), payload=retry_payload)
    job.status = worker_result.status
    job.error_message = worker_result.error_message
    job.completed_at = None
    await session.commit()
    await session.refresh(job)

    return JobStatusResponse(
        job_id=str(job.id),
        status=job.status,  # type: ignore[arg-type]
        error_message=job.error_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.get("/api/v1/videos", response_model=list[VideoRecordResponse])
async def list_videos(
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> list[VideoRecordResponse]:
    owner_uuid = resolve_user_uuid(user_id)
    stmt = (
        select(GeneratedVideo)
        .options(
            selectinload(GeneratedVideo.asset),
            selectinload(GeneratedVideo.thumbnail_asset),
            selectinload(GeneratedVideo.job),
        )
        .where(GeneratedVideo.user_id == owner_uuid)
        .order_by(GeneratedVideo.created_at.desc())
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [
        VideoRecordResponse(
            video_id=str(v.id),
            job_id=str(v.job_id),
            owner_id=str(v.user_id),
            title=v.title,
            duration_seconds=round(v.validated_duration_ms / 1000.0, 2),
            aspect_ratio=v.job.aspect_ratio if v.job else "9:16",  # type: ignore[arg-type]
            visual_style="Cinematic",
            resolution_label=v.job.resolution_label if v.job else f"{v.width}x{v.height}",
            video_url=v.asset.object_key if v.asset else "",
            thumbnail_url=v.thumbnail_asset.object_key if v.thumbnail_asset else None,
            file_size_bytes=v.asset.size_bytes if v.asset else 0,
            created_at=v.created_at,
        )
        for v in rows
    ]


@router.get("/api/v1/videos/{video_id}", response_model=VideoRecordResponse)
async def get_video(
    video_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> VideoRecordResponse:
    owner_uuid = resolve_user_uuid(user_id)
    stmt = (
        select(GeneratedVideo)
        .options(
            selectinload(GeneratedVideo.asset),
            selectinload(GeneratedVideo.thumbnail_asset),
            selectinload(GeneratedVideo.job),
        )
        .where(GeneratedVideo.id == parse_uuid(video_id, "video_id"))
    )
    video = (await session.execute(stmt)).scalar_one_or_none()
    if video is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")
    verify_resource_ownership(str(video.user_id), str(owner_uuid))

    return VideoRecordResponse(
        video_id=str(video.id),
        job_id=str(video.job_id),
        owner_id=str(video.user_id),
        title=video.title,
        duration_seconds=round(video.validated_duration_ms / 1000.0, 2),
        aspect_ratio=video.job.aspect_ratio if video.job else "9:16",  # type: ignore[arg-type]
        visual_style="Cinematic",
        resolution_label=video.job.resolution_label if video.job else f"{video.width}x{video.height}",
        video_url=video.asset.object_key if video.asset else "",
        thumbnail_url=video.thumbnail_asset.object_key if video.thumbnail_asset else None,
        file_size_bytes=video.asset.size_bytes if video.asset else 0,
        created_at=video.created_at,
    )


@router.delete("/api/v1/videos/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(
    video_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> None:
    owner_uuid = resolve_user_uuid(user_id)
    stmt = (
        select(GeneratedVideo)
        .options(selectinload(GeneratedVideo.asset))
        .where(GeneratedVideo.id == parse_uuid(video_id, "video_id"))
    )
    video = (await session.execute(stmt)).scalar_one_or_none()
    if video is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")
    verify_resource_ownership(str(video.user_id), str(owner_uuid))

    if video.asset and not video.asset.object_key.startswith("http"):
        storage = get_storage_backend()
        try:
            storage.delete_object(video.asset.object_key)
        except Exception:
            pass

    await session.delete(video)
    await session.commit()
