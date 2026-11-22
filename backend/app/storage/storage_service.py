from abc import ABC, abstractmethod
from dataclasses import dataclass
import os
import uuid

from app.core.config import get_settings
from app.core.security import resolve_safe_storage_path


@dataclass
class StoredAssetRef:
    object_key: str
    storage_provider: str
    url_or_path: str


class StorageBackend(ABC):
    @abstractmethod
    def save_bytes(self, category: str, user_id: str, filename: str, data: bytes) -> StoredAssetRef:
        raise NotImplementedError

    @abstractmethod
    def get_download_url(self, object_key: str, expires_seconds: int = 900) -> str:
        raise NotImplementedError

    @abstractmethod
    def delete_object(self, object_key: str) -> None:
        raise NotImplementedError


class LocalDiskStorageBackend(StorageBackend):
    """Safe local storage for development without exposing path traversal."""

    def __init__(self, base_dir: str) -> None:
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def save_bytes(self, category: str, user_id: str, filename: str, data: bytes) -> StoredAssetRef:
        safe_name = os.path.basename(filename).replace(" ", "_")
        object_key = f"{category}/{user_id}/{uuid.uuid4()}_{safe_name}"
        target_path = resolve_safe_storage_path(self.base_dir, object_key)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "wb") as fh:
            fh.write(data)
        return StoredAssetRef(
            object_key=object_key,
            storage_provider="local",
            url_or_path=f"/api/v1/assets/local/{object_key}",
        )

    def get_download_url(self, object_key: str, expires_seconds: int = 900) -> str:
        resolve_safe_storage_path(self.base_dir, object_key)
        return f"/api/v1/assets/local/{object_key}"

    def delete_object(self, object_key: str) -> None:
        target_path = resolve_safe_storage_path(self.base_dir, object_key)
        if os.path.exists(target_path):
            os.remove(target_path)


class S3StorageBackend(StorageBackend):
    """S3-compatible object storage (Cloudflare R2, Backblaze B2, MinIO, AWS S3)."""

    def __init__(self) -> None:
        settings = get_settings()
        self.endpoint_url = settings.s3_endpoint_url
        self.region = settings.s3_region
        self.bucket_name = settings.s3_bucket_name
        self.access_key = settings.s3_access_key_id
        self.secret_key = settings.s3_secret_access_key

    def _client(self):
        if not (self.bucket_name and self.access_key and self.secret_key):
            raise RuntimeError("S3 storage credentials are not configured.")
        import boto3

        return boto3.client(
            "s3",
            endpoint_url=self.endpoint_url or None,
            region_name=self.region,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        )

    def save_bytes(self, category: str, user_id: str, filename: str, data: bytes) -> StoredAssetRef:
        safe_name = os.path.basename(filename).replace(" ", "_")
        object_key = f"{category}/{user_id}/{uuid.uuid4()}_{safe_name}"
        self._client().put_object(Bucket=self.bucket_name, Key=object_key, Body=data)
        return StoredAssetRef(
            object_key=object_key,
            storage_provider="s3",
            url_or_path=self.get_download_url(object_key),
        )

    def get_download_url(self, object_key: str, expires_seconds: int = 900) -> str:
        return self._client().generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": object_key},
            ExpiresIn=expires_seconds,
        )

    def delete_object(self, object_key: str) -> None:
        self._client().delete_object(Bucket=self.bucket_name, Key=object_key)


def get_storage_backend() -> StorageBackend:
    settings = get_settings()
    if settings.storage_backend.lower() == "s3":
        return S3StorageBackend()
    return LocalDiskStorageBackend(settings.local_storage_dir)
