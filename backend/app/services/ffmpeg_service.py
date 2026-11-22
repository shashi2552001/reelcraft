from dataclasses import dataclass
import json
import os
import shutil
import subprocess
import tempfile


@dataclass
class RenderedVideoMetadata:
    output_path: str
    thumbnail_path: str | None
    duration_seconds: float
    width: int
    height: int
    file_size_bytes: int


class FFmpegPipelineError(RuntimeError):
    pass


class FFmpegService:
    """
    Handles clip normalization, concatenation, optional audio sync, thumbnail
    extraction, and ffprobe final duration validation (30-60 seconds).
    """

    def is_available(self) -> bool:
        return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None

    def probe_video(self, file_path: str) -> tuple[float, int, int]:
        if not os.path.exists(file_path):
            raise FFmpegPipelineError(f"Video file not found: {file_path}")
        if not shutil.which("ffprobe"):
            raise FFmpegPipelineError("ffprobe binary is not installed on this host.")

        cmd = [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height:format=duration",
            "-of",
            "json",
            file_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            raise FFmpegPipelineError(f"ffprobe failed: {result.stderr.strip()}")

        parsed = json.loads(result.stdout)
        duration = float(parsed.get("format", {}).get("duration", 0.0))
        streams = parsed.get("streams", [])
        width = int(streams[0].get("width", 0)) if streams else 0
        height = int(streams[0].get("height", 0)) if streams else 0
        return duration, width, height

    def build_normalize_command(
        self,
        input_path: str,
        output_path: str,
        width: int,
        height: int,
        fps: int = 24,
    ) -> list[str]:
        vf = (
            f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,fps={fps},format=yuv420p"
        )
        return [
            "ffmpeg",
            "-y",
            "-i",
            input_path,
            "-vf",
            vf,
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-an",
            output_path,
        ]

    def stitch_and_validate(
        self,
        clip_paths: list[str],
        output_path: str,
        expected_duration_seconds: int,
        target_width: int,
        target_height: int,
        fps: int = 24,
        audio_track_path: str | None = None,
        tolerance_seconds: float = 1.5,
    ) -> RenderedVideoMetadata:
        if not clip_paths:
            raise FFmpegPipelineError("At least one rendered clip is required for stitching.")
        if not self.is_available():
            raise FFmpegPipelineError("FFmpeg and ffprobe must be installed to assemble videos.")

        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

        with tempfile.TemporaryDirectory(prefix="reelcraft_ffmpeg_") as tmpdir:
            normalized_paths: list[str] = []
            for idx, clip in enumerate(clip_paths):
                norm_out = os.path.join(tmpdir, f"norm_{idx:03d}.mp4")
                norm_cmd = self.build_normalize_command(
                    clip, norm_out, target_width, target_height, fps=fps
                )
                res = subprocess.run(norm_cmd, capture_output=True, text=True, check=False)
                if res.returncode != 0:
                    raise FFmpegPipelineError(f"Clip normalization failed: {res.stderr.strip()}")
                normalized_paths.append(norm_out)

            concat_list_path = os.path.join(tmpdir, "concat.txt")
            with open(concat_list_path, "w", encoding="utf-8") as fh:
                for p in normalized_paths:
                    escaped = p.replace("'", "'\\''")
                    fh.write(f"file '{escaped}'\n")

            concat_cmd = [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                concat_list_path,
            ]
            if audio_track_path and os.path.exists(audio_track_path):
                concat_cmd.extend(["-i", audio_track_path, "-shortest", "-c:a", "aac"])

            concat_cmd.extend(["-c:v", "copy", "-movflags", "+faststart", output_path])
            stitch_res = subprocess.run(concat_cmd, capture_output=True, text=True, check=False)
            if stitch_res.returncode != 0:
                raise FFmpegPipelineError(f"FFmpeg concat failed: {stitch_res.stderr.strip()}")

        actual_duration, actual_w, actual_h = self.probe_video(output_path)
        if abs(actual_duration - expected_duration_seconds) > tolerance_seconds:
            raise FFmpegPipelineError(
                f"Duration validation failed: expected ~{expected_duration_seconds}s, "
                f"measured {actual_duration:.2f}s."
            )

        thumb_path = os.path.splitext(output_path)[0] + "_thumb.jpg"
        thumb_cmd = [
            "ffmpeg",
            "-y",
            "-ss",
            "00:00:01",
            "-i",
            output_path,
            "-frames:v",
            "1",
            thumb_path,
        ]
        thumb_res = subprocess.run(thumb_cmd, capture_output=True, text=True, check=False)
        final_thumb = thumb_path if thumb_res.returncode == 0 and os.path.exists(thumb_path) else None

        return RenderedVideoMetadata(
            output_path=output_path,
            thumbnail_path=final_thumb,
            duration_seconds=round(actual_duration, 2),
            width=actual_w,
            height=actual_h,
            file_size_bytes=os.path.getsize(output_path),
        )
