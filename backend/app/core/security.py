from collections import defaultdict, deque
import os
import secrets
import time
from fastapi import Header, HTTPException, status

ALLOWED_UPLOAD_MIME_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
}
MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

# In-memory sliding-window generation rate limiter (per user)
_RATE_BUCKETS: dict[str, deque[float]] = defaultdict(deque)


def get_current_user_id(
    x_reelcraft_user: str | None = Header(default=None, alias="X-ReelCraft-User"),
) -> str:
    """
    Personal-use user identity resolver.
    Replace with JWT / OAuth verification when enabling multi-user access.
    """
    candidate = (x_reelcraft_user or "personal-owner").strip()
    if not candidate or len(candidate) > 64:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identity header.",
        )
    return candidate


def verify_resource_ownership(resource_owner_id: str, current_user_id: str) -> None:
    if not secrets.compare_digest(resource_owner_id, current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access or modify this resource.",
        )


def enforce_generation_rate_limit(user_id: str, max_per_minute: int) -> None:
    now = time.monotonic()
    bucket = _RATE_BUCKETS[user_id]
    while bucket and (now - bucket[0]) > 60.0:
        bucket.popleft()
    if len(bucket) >= max_per_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Generation rate limit reached ({max_per_minute} jobs per minute). Please wait briefly.",
        )
    bucket.append(now)


def resolve_safe_storage_path(base_dir: str, relative_key: str) -> str:
    """Prevent path traversal by ensuring resolved path remains inside base_dir."""
    norm_base = os.path.abspath(base_dir)
    clean_rel = relative_key.lstrip("/\\")
    resolved = os.path.abspath(os.path.join(norm_base, clean_rel))
    if not (resolved == norm_base or resolved.startswith(norm_base + os.sep)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid storage object path.",
        )
    return resolved


def validate_upload_metadata(mime_type: str, size_bytes: int) -> str:
    if mime_type not in ALLOWED_UPLOAD_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Allowed types: PNG, JPEG, WebP, MP4.",
        )
    if size_bytes <= 0 or size_bytes > MAX_IMAGE_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be between 1 byte and 10 MB.",
        )
    return ALLOWED_UPLOAD_MIME_TYPES[mime_type]
