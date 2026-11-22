import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ReelCraft Studio API"
    app_env: str = "development"
    cors_origins: str = "http://localhost:3000"
    rate_limit_generations_per_min: int = 5

    database_url: str = ""

    storage_backend: str = "local"  # "local" or "s3"
    local_storage_dir: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../storage"))

    s3_endpoint_url: str = ""
    s3_region: str = "auto"
    s3_bucket_name: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""

    gpu_worker_base_url: str = ""
    gpu_worker_auth_token: str = ""
    gpu_request_timeout_seconds: int = 600
    gpu_idle_shutdown_minutes: int = 15
    default_video_model: str = "wan-2.2-ti2v-5b"

    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
