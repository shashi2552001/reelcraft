import asyncio
from datetime import datetime, timezone
import logging
import httpx

from app.core.config import get_settings
from app.schemas.api import GenerateVideoRequest, JobStatusResponse

logger = logging.getLogger("reelcraft.worker")

# Enforce 1 concurrent generation job initially to protect low-budget GPU VRAM
_CONCURRENCY_LOCK = asyncio.Semaphore(1)


class CloudGpuWorkerManager:
    """
    Coordinates single-concurrency job dispatch, timeout handling, real status
    reporting, and idle shutdown hooks with an external Cloud GPU inference node.
    """

    def __init__(self) -> None:
        self.last_activity_at: datetime | None = None

    def is_configured(self) -> bool:
        return bool(get_settings().gpu_worker_base_url.strip())

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        token = get_settings().gpu_worker_auth_token.strip()
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    async def dispatch_generation(
        self, job_id: str, payload: GenerateVideoRequest
    ) -> JobStatusResponse:
        settings = get_settings()
        worker_url = settings.gpu_worker_base_url.strip().rstrip("/")
        if not worker_url:
            return JobStatusResponse(
                job_id=job_id,
                status="Failed",
                error_message="Cloud GPU worker (GPU_WORKER_BASE_URL) is not configured yet.",
            )

        async with _CONCURRENCY_LOCK:
            self.last_activity_at = datetime.now(timezone.utc)
            try:
                async with httpx.AsyncClient(
                    timeout=float(settings.gpu_request_timeout_seconds)
                ) as client:
                    res = await client.post(
                        f"{worker_url}/render",
                        headers=self._headers(),
                        json={"job_id": job_id, **payload.model_dump()},
                    )
                    res.raise_for_status()
                    data = res.json()
                    return JobStatusResponse(
                        job_id=job_id,
                        status=data.get("status", "Queued"),
                        error_message=data.get("error_message"),
                    )
            except httpx.TimeoutException:
                logger.error("GPU worker request timed out for job %s", job_id)
                return JobStatusResponse(
                    job_id=job_id,
                    status="Failed",
                    error_message="Cloud GPU worker timed out while dispatching job.",
                )
            except Exception as exc:
                logger.exception("GPU worker dispatch failed for job %s", job_id)
                return JobStatusResponse(
                    job_id=job_id,
                    status="Failed",
                    error_message=f"Cloud GPU worker error: {exc}",
                )

    async def poll_status(self, job_id: str) -> JobStatusResponse:
        worker_url = get_settings().gpu_worker_base_url.strip().rstrip("/")
        if not worker_url:
            return JobStatusResponse(
                job_id=job_id,
                status="Failed",
                error_message="Cloud GPU worker is not configured.",
            )
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                f"{worker_url}/jobs/{job_id}",
                headers=self._headers(),
            )
            res.raise_for_status()
            data = res.json()
            return JobStatusResponse(
                job_id=job_id,
                status=data["status"],
                video_url=data.get("video_url"),
                thumbnail_url=data.get("thumbnail_url"),
                file_size_bytes=data.get("file_size_bytes"),
                validated_duration_seconds=data.get("validated_duration_seconds"),
                error_message=data.get("error_message"),
            )

    async def cancel(self, job_id: str) -> JobStatusResponse:
        worker_url = get_settings().gpu_worker_base_url.strip().rstrip("/")
        if not worker_url:
            return JobStatusResponse(
                job_id=job_id,
                status="Cancelled",
                error_message="Job cancelled locally; no GPU worker was active.",
            )
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{worker_url}/jobs/{job_id}/cancel",
                headers=self._headers(),
            )
            res.raise_for_status()
            return JobStatusResponse(job_id=job_id, status="Cancelled")

    async def shutdown_if_idle(self) -> bool:
        """Hook called by scheduler/cron to scale down idle cloud GPU containers."""
        settings = get_settings()
        worker_url = settings.gpu_worker_base_url.strip().rstrip("/")
        if not worker_url or self.last_activity_at is None:
            return False
        idle_minutes = (
            datetime.now(timezone.utc) - self.last_activity_at
        ).total_seconds() / 60.0
        if idle_minutes < settings.gpu_idle_shutdown_minutes:
            return False
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(f"{worker_url}/scale-down", headers=self._headers())
        return True
