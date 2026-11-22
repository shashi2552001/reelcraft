"""
ReelCraft Studio — Cloud GPU Inference Runner
=============================================
Executes open-weight video generation scene-by-scene on a CUDA GPU node
(e.g., RunPod RTX 4090 / Vast.ai), cleans up VRAM between clips, and stitches
the resulting clips into a single 30-60 second MP4 using FFmpegService.

Requires a CUDA GPU host with PyTorch + Diffusers + FFmpeg installed.
"""

from dataclasses import dataclass
import gc
import os
import sys
import tempfile
from typing import Any

# Allow importing backend FFmpegService when running from repo root
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKEND_DIR = os.path.join(REPO_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.ai.model_adapter import get_model_spec, resolve_target_dimensions  # noqa: E402
from app.services.ffmpeg_service import FFmpegService, RenderedVideoMetadata  # noqa: E402


@dataclass
class SceneRenderTask:
    scene_number: int
    title: str
    prompt: str
    duration_seconds: int


@dataclass
class InferenceRequest:
    job_id: str
    model_id: str
    aspect_ratio: str
    resolution_id: str
    total_duration_seconds: int
    negative_prompt: str
    scenes: list[SceneRenderTask]
    reference_image_path: str | None = None
    output_dir: str = "./storage/renders"
    fps: int = 24
    num_inference_steps: int = 30
    guidance_scale: float = 6.0


def _clear_cuda_cache() -> None:
    gc.collect()
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
    except ImportError:
        pass


def _load_pipeline(model_repo: str, use_i2v: bool) -> Any:
    """
    Lazy-load Hugging Face Diffusers pipeline only on the Cloud GPU host.
    Raises a clear RuntimeError if CUDA/Diffusers are not installed locally.
    """
    try:
        import torch
        from diffusers import DiffusionPipeline
    except ImportError as exc:
        raise RuntimeError(
            "PyTorch and Hugging Face Diffusers must be installed on the Cloud GPU node "
            "to run model/inference/runner.py."
        ) from exc

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU device not detected. Run this script on your Cloud GPU worker.")

    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    pipe = DiffusionPipeline.from_pretrained(model_repo, torch_dtype=dtype)
    pipe.enable_model_cpu_offload()
    if use_i2v and hasattr(pipe, "vae"):
        pipe.vae.enable_tiling()
    return pipe


def render_multi_scene_video(req: InferenceRequest) -> RenderedVideoMetadata:
    spec = get_model_spec(req.model_id)
    if spec is None:
        raise ValueError(f"Unknown model_id: {req.model_id}")

    scene_sum = sum(s.duration_seconds for s in req.scenes)
    if scene_sum != req.total_duration_seconds:
        raise ValueError(
            f"Scene durations sum to {scene_sum}s, expected {req.total_duration_seconds}s."
        )

    width, height = resolve_target_dimensions(req.model_id, req.aspect_ratio, req.resolution_id)
    use_i2v = bool(req.reference_image_path and spec.supports_i2v and os.path.isfile(req.reference_image_path))

    pipe = _load_pipeline(spec.huggingface_repo, use_i2v=use_i2v)
    ffmpeg = FFmpegService()

    from diffusers.utils import export_to_video, load_image

    ref_image = load_image(req.reference_image_path) if use_i2v and req.reference_image_path else None
    os.makedirs(req.output_dir, exist_ok=True)
    final_output = os.path.join(req.output_dir, f"{req.job_id}.mp4")

    with tempfile.TemporaryDirectory(prefix=f"reelcraft_job_{req.job_id}_") as tmpdir:
        clip_paths: list[str] = []
        for scene in sorted(req.scenes, key=lambda item: item.scene_number):
            num_frames = max(16, scene.duration_seconds * req.fps + 1)
            kwargs: dict[str, Any] = {
                "prompt": scene.prompt,
                "negative_prompt": req.negative_prompt,
                "width": width,
                "height": height,
                "num_frames": num_frames,
                "num_inference_steps": req.num_inference_steps,
                "guidance_scale": req.guidance_scale,
            }
            if ref_image is not None:
                kwargs["image"] = ref_image

            result = pipe(**kwargs)
            frames = result.frames[0]
            clip_path = os.path.join(tmpdir, f"scene_{scene.scene_number:02d}.mp4")
            export_to_video(frames, clip_path, fps=req.fps)
            clip_paths.append(clip_path)
            _clear_cuda_cache()

        return ffmpeg.stitch_and_validate(
            clip_paths=clip_paths,
            output_path=final_output,
            expected_duration_seconds=req.total_duration_seconds,
            target_width=width,
            target_height=height,
            fps=req.fps,
        )
