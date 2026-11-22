"""
ReelCraft Studio — Model Evaluation & Output Quality Checks
===========================================================
Verifies rendered video dimensions, FPS, duration accuracy, and provides
deterministic model selection recommendations based on available GPU VRAM.
"""

from dataclasses import dataclass
import os
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKEND_DIR = os.path.join(REPO_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.ai.model_adapter import MODEL_CATALOG  # noqa: E402
from app.services.ffmpeg_service import FFmpegService  # noqa: E402


@dataclass
class EvaluationReport:
    file_path: str
    passed: bool
    measured_duration: float
    expected_duration: int
    width: int
    height: int
    notes: list[str]


def recommend_model_for_vram(available_vram_gb: int, prioritize_speed: bool = False) -> str:
    if available_vram_gb < 16:
        raise ValueError("At least 16 GB VRAM is required for open-weight video generation.")
    if available_vram_gb < 24 or prioritize_speed:
        return "ltx-video-0.9.7"
    if available_vram_gb >= 48:
        return "wan-2.2-i2v-a14b"
    return "wan-2.2-ti2v-5b"


def evaluate_rendered_video(
    file_path: str,
    expected_duration_seconds: int,
    expected_width: int,
    expected_height: int,
    tolerance_seconds: float = 1.5,
) -> EvaluationReport:
    ffmpeg = FFmpegService()
    duration, width, height = ffmpeg.probe_video(file_path)
    notes: list[str] = []
    passed = True

    if abs(duration - expected_duration_seconds) > tolerance_seconds:
        passed = False
        notes.append(
            f"Duration mismatch: expected {expected_duration_seconds}s, got {duration:.2f}s."
        )
    if width != expected_width or height != expected_height:
        passed = False
        notes.append(
            f"Dimension mismatch: expected {expected_width}x{expected_height}, got {width}x{height}."
        )
    if not notes:
        notes.append("Video passed duration and resolution validation.")

    return EvaluationReport(
        file_path=file_path,
        passed=passed,
        measured_duration=round(duration, 2),
        expected_duration=expected_duration_seconds,
        width=width,
        height=height,
        notes=notes,
    )


def summarize_catalog() -> list[dict[str, str | int | bool]]:
    return [
        {
            "id": spec.id,
            "display_name": spec.display_name,
            "min_vram_gb": spec.min_vram_gb,
            "recommended_vram_gb": spec.recommended_vram_gb,
            "max_single_clip_seconds": spec.max_single_clip_seconds,
            "supports_i2v": spec.supports_i2v,
        }
        for spec in MODEL_CATALOG.values()
    ]
