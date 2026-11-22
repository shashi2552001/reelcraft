import os
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.ai.model_adapter import MODEL_CATALOG
from app.core.config import get_settings
from app.core.security import (
    get_current_user_id,
    resolve_safe_storage_path,
    validate_upload_metadata,
)
from app.database.session import check_database_connection
from app.schemas.api import (
    AssetCategory,
    HealthResponse,
    PresignUploadRequest,
    PresignUploadResponse,
)
from app.storage.storage_service import LocalDiskStorageBackend, S3StorageBackend, get_storage_backend
from app.workers.gpu_worker import CloudGpuWorkerManager

router = APIRouter(tags=["System & Assets"])
gpu_worker = CloudGpuWorkerManager()


@router.get("/api/v1/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    settings = get_settings()
    db_connected = await check_database_connection()
    worker_configured = gpu_worker.is_configured()
    return HealthResponse(
        status="ok",
        database_connected=db_connected,
        gpu_worker_configured=worker_configured,
        storage_backend=settings.storage_backend,
        active_model=settings.default_video_model if worker_configured else None,
        gpu_status="ready" if worker_configured else "not_configured",
    )


@router.get("/api/v1/models")
async def list_supported_models() -> dict:
    return {
        "models": [
            {
                "id": spec.id,
                "display_name": spec.display_name,
                "family": spec.family,
                "license_name": spec.license_name,
                "max_single_clip_seconds": spec.max_single_clip_seconds,
                "min_vram_gb": spec.min_vram_gb,
                "recommended_vram_gb": spec.recommended_vram_gb,
                "supports_i2v": spec.supports_i2v,
                "supports_lora": spec.supports_lora,
                "huggingface_repo": spec.huggingface_repo,
                "supported_resolutions": spec.supported_resolutions,
            }
            for spec in MODEL_CATALOG.values()
        ]
    }


@router.post("/api/v1/assets/presign-upload", response_model=PresignUploadResponse)
async def presign_asset_upload(
    payload: PresignUploadRequest,
    user_id: str = Depends(get_current_user_id),
) -> PresignUploadResponse:
    validate_upload_metadata(payload.mime_type, payload.size_bytes)
    storage = get_storage_backend()
    asset_id = str(uuid.uuid4())
    safe_name = os.path.basename(payload.file_name).replace(" ", "_")
    object_key = f"{payload.category}/{user_id}/{asset_id}_{safe_name}"

    if isinstance(storage, S3StorageBackend):
        try:
            presigned_url = storage._client().generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": storage.bucket_name,
                    "Key": object_key,
                    "ContentType": payload.mime_type,
                },
                ExpiresIn=600,
            )
            return PresignUploadResponse(
                upload_url=presigned_url,
                object_key=object_key,
                asset_id=asset_id,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"S3 storage is not configured properly: {exc}",
            ) from exc

    return PresignUploadResponse(
        upload_url="/api/v1/assets/upload",
        object_key=object_key,
        asset_id=asset_id,
    )


@router.post("/api/v1/assets/upload")
async def upload_asset_file(
    file: UploadFile = File(...),
    category: AssetCategory = Form("character_image"),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    raw = await file.read()
    validate_upload_metadata(file.content_type or "", len(raw))
    storage = get_storage_backend()
    stored = storage.save_bytes(
        category=category,
        user_id=user_id,
        filename=file.filename or "upload.bin",
        data=raw,
    )
    return {
        "object_key": stored.object_key,
        "storage_provider": stored.storage_provider,
        "url": stored.url_or_path,
        "size_bytes": len(raw),
        "mime_type": file.content_type,
    }


@router.get("/api/v1/assets/local/{object_key:path}")
async def serve_local_asset(object_key: str) -> FileResponse:
    storage = get_storage_backend()
    if not isinstance(storage, LocalDiskStorageBackend):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Local asset endpoint is disabled when STORAGE_BACKEND=s3.",
        )
    target_path = resolve_safe_storage_path(storage.base_dir, object_key)
    if not os.path.isfile(target_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested asset file was not found.",
        )
    return FileResponse(target_path)
