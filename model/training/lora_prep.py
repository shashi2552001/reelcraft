"""
ReelCraft Studio — Phase 2 Character LoRA Dataset Preparation
=============================================================
Prepares clean image-caption pairs from a character's reference folder for
future LoRA fine-tuning on open-weight video/image backbones.
"""

from dataclasses import dataclass
import json
import os

SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}


@dataclass
class TrainingSample:
    image_path: str
    caption: str


def build_character_lora_manifest(
    character_name: str,
    trigger_token: str,
    style_label: str,
    appearance_summary: str,
    source_dir: str,
    manifest_out_path: str,
) -> list[TrainingSample]:
    if not os.path.isdir(source_dir):
        raise FileNotFoundError(f"Character image folder not found: {source_dir}")

    samples: list[TrainingSample] = []
    for entry in sorted(os.listdir(source_dir)):
        ext = os.path.splitext(entry)[1].lower()
        if ext not in SUPPORTED_IMAGE_EXTS:
            continue
        img_path = os.path.abspath(os.path.join(source_dir, entry))
        caption = (
            f"{trigger_token}, {character_name}, {style_label} style, {appearance_summary}"
        ).strip()
        samples.append(TrainingSample(image_path=img_path, caption=caption))

    if not samples:
        raise ValueError(f"No valid PNG/JPG/WebP images found in {source_dir}")

    os.makedirs(os.path.dirname(os.path.abspath(manifest_out_path)), exist_ok=True)
    with open(manifest_out_path, "w", encoding="utf-8") as fh:
        for sample in samples:
            fh.write(json.dumps({"image": sample.image_path, "caption": sample.caption}) + "\n")

    return samples
