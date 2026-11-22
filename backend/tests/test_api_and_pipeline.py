import os
import sys

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.core.security import (  # noqa: E402
    enforce_generation_rate_limit,
    resolve_safe_storage_path,
    validate_upload_metadata,
    verify_resource_ownership,
)
from app.main import app  # noqa: E402
from app.schemas.api import GenerateVideoRequest, ScenePlanInput  # noqa: E402
from app.services.ffmpeg_service import FFmpegService  # noqa: E402

client = TestClient(app)


def test_health_endpoint_honestly_reports_unconfigured_db_and_gpu() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert isinstance(payload["database_connected"], bool)
    assert isinstance(payload["gpu_worker_configured"], bool)


def test_models_catalog_returns_supported_open_weight_models() -> None:
    response = client.get("/api/v1/models")
    assert response.status_code == 200
    data = response.json()
    model_ids = {m["id"] for m in data["models"]}
    assert "wan-2.2-ti2v-5b" in model_ids
    assert "ltx-video-0.9.7" in model_ids


def test_generate_video_request_enforces_30_to_60_seconds_and_scene_sum() -> None:
    valid_scenes = [
        ScenePlanInput(scene_number=i + 1, title=f"Scene {i + 1}", prompt="Action beat", duration_seconds=5)
        for i in range(6)
    ]
    req = GenerateVideoRequest(
        title="Test Reel",
        prompt="A cinematic alley in rain",
        compiled_prompt="Cinematic alley in rain",
        visual_style="Cinematic",
        aspect_ratio="9:16",
        total_duration_seconds=30,
        scenes=valid_scenes,
        model_id="wan-2.2-ti2v-5b",
    )
    assert req.total_duration_seconds == 30

    with pytest.raises(ValidationError):
        GenerateVideoRequest(
            title="Too Short",
            prompt="Too short prompt",
            compiled_prompt="Too short prompt",
            visual_style="Cinematic",
            aspect_ratio="9:16",
            total_duration_seconds=20,
            scenes=valid_scenes[:4],
            model_id="wan-2.2-ti2v-5b",
        )

    with pytest.raises(ValidationError):
        GenerateVideoRequest(
            title="Mismatched Sum",
            prompt="Mismatched scenes",
            compiled_prompt="Mismatched scenes",
            visual_style="Cinematic",
            aspect_ratio="9:16",
            total_duration_seconds=45,
            scenes=valid_scenes,  # sums to 30, not 45
            model_id="wan-2.2-ti2v-5b",
        )


def test_ffmpeg_normalize_command_builds_vertical_padding() -> None:
    ffmpeg = FFmpegService()
    cmd = ffmpeg.build_normalize_command("in.mp4", "out.mp4", 720, 1280, fps=24)
    assert "ffmpeg" in cmd[0]
    assert "scale=720:1280" in " ".join(cmd)
    assert "fps=24" in " ".join(cmd)


def test_path_traversal_is_blocked() -> None:
    base = os.path.abspath("./storage")
    safe = resolve_safe_storage_path(base, "character_image/user1/portrait.jpg")
    assert safe.startswith(base)

    with pytest.raises(HTTPException) as exc:
        resolve_safe_storage_path(base, "../../etc/passwd")
    assert exc.value.status_code == 400


def test_upload_metadata_validation() -> None:
    assert validate_upload_metadata("image/jpeg", 1024) == ".jpg"

    with pytest.raises(HTTPException) as bad_mime:
        validate_upload_metadata("application/x-msdownload", 1024)
    assert bad_mime.value.status_code == 400

    with pytest.raises(HTTPException) as too_large:
        validate_upload_metadata("image/png", 20 * 1024 * 1024)
    assert too_large.value.status_code == 400


def test_ownership_and_rate_limit_enforcement() -> None:
    verify_resource_ownership("user-a", "user-a")
    with pytest.raises(HTTPException) as forbidden:
        verify_resource_ownership("user-a", "user-b")
    assert forbidden.value.status_code == 403

    user = "rate-limit-test-user"
    enforce_generation_rate_limit(user, 2)
    enforce_generation_rate_limit(user, 2)
    with pytest.raises(HTTPException) as limited:
        enforce_generation_rate_limit(user, 2)
    assert limited.value.status_code == 429
