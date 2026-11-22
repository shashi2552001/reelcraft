from dataclasses import dataclass


@dataclass(frozen=True)
class ModelAdapterSpec:
    id: str
    display_name: str
    family: str
    license_name: str
    max_single_clip_seconds: int
    min_vram_gb: int
    recommended_vram_gb: int
    supports_i2v: bool
    supports_lora: bool
    supported_resolutions: list[dict[str, str | int]]
    huggingface_repo: str


MODEL_CATALOG: dict[str, ModelAdapterSpec] = {
    "wan-2.2-ti2v-5b": ModelAdapterSpec(
        id="wan-2.2-ti2v-5b",
        display_name="Wan 2.2 TI2V-5B (Recommended Low-Budget)",
        family="Alibaba Tongyi Wan2.2",
        license_name="Apache 2.0",
        max_single_clip_seconds=5,
        min_vram_gb=24,
        recommended_vram_gb=24,
        supports_i2v=True,
        supports_lora=True,
        huggingface_repo="Wan-AI/Wan2.2-TI2V-5B",
        supported_resolutions=[
            {"id": "wan5b-720-916", "label": "720p Vertical (720x1280)", "width": 720, "height": 1280, "aspect_ratio": "9:16"},
            {"id": "wan5b-480-916", "label": "480p Fast Draft (480x832)", "width": 480, "height": 832, "aspect_ratio": "9:16"},
            {"id": "wan5b-720-169", "label": "720p Widescreen (1280x720)", "width": 1280, "height": 720, "aspect_ratio": "16:9"},
            {"id": "wan5b-720-11", "label": "720p Square (720x720)", "width": 720, "height": 720, "aspect_ratio": "1:1"},
        ],
    ),
    "ltx-video-0.9.7": ModelAdapterSpec(
        id="ltx-video-0.9.7",
        display_name="LTX-Video (Fast Iteration)",
        family="Lightricks LTX-Video",
        license_name="Open Weights (Apache 2.0 / Community)",
        max_single_clip_seconds=5,
        min_vram_gb=16,
        recommended_vram_gb=24,
        supports_i2v=True,
        supports_lora=True,
        huggingface_repo="Lightricks/LTX-Video",
        supported_resolutions=[
            {"id": "ltx-704-916", "label": "HD Vertical (704x1216)", "width": 704, "height": 1216, "aspect_ratio": "9:16"},
            {"id": "ltx-512-916", "label": "512p Draft (512x896)", "width": 512, "height": 896, "aspect_ratio": "9:16"},
            {"id": "ltx-704-169", "label": "HD Widescreen (1216x704)", "width": 1216, "height": 704, "aspect_ratio": "16:9"},
            {"id": "ltx-704-11", "label": "HD Square (768x768)", "width": 768, "height": 768, "aspect_ratio": "1:1"},
        ],
    ),
    "wan-2.2-i2v-a14b": ModelAdapterSpec(
        id="wan-2.2-i2v-a14b",
        display_name="Wan 2.2 I2V-A14B (High-Detail MoE)",
        family="Alibaba Tongyi Wan2.2 MoE",
        license_name="Apache 2.0",
        max_single_clip_seconds=5,
        min_vram_gb=24,
        recommended_vram_gb=48,
        supports_i2v=True,
        supports_lora=True,
        huggingface_repo="Wan-AI/Wan2.2-I2V-A14B",
        supported_resolutions=[
            {"id": "wana14b-720-916", "label": "720p Vertical (720x1280)", "width": 720, "height": 1280, "aspect_ratio": "9:16"},
            {"id": "wana14b-480-916", "label": "480p Vertical (480x832)", "width": 480, "height": 832, "aspect_ratio": "9:16"},
            {"id": "wana14b-720-169", "label": "720p Widescreen (1280x720)", "width": 1280, "height": 720, "aspect_ratio": "16:9"},
            {"id": "wana14b-720-11", "label": "720p Square (720x720)", "width": 720, "height": 720, "aspect_ratio": "1:1"},
        ],
    ),
    "hunyuan-video": ModelAdapterSpec(
        id="hunyuan-video",
        display_name="HunyuanVideo (13B Cinematic)",
        family="Tencent Hunyuan",
        license_name="Tencent Hunyuan Community License",
        max_single_clip_seconds=5,
        min_vram_gb=24,
        recommended_vram_gb=48,
        supports_i2v=True,
        supports_lora=True,
        huggingface_repo="tencent/HunyuanVideo",
        supported_resolutions=[
            {"id": "hy-720-916", "label": "720p Vertical (720x1280)", "width": 720, "height": 1280, "aspect_ratio": "9:16"},
            {"id": "hy-720-169", "label": "720p Widescreen (1280x720)", "width": 1280, "height": 720, "aspect_ratio": "16:9"},
            {"id": "hy-720-11", "label": "720p Square (720x720)", "width": 720, "height": 720, "aspect_ratio": "1:1"},
        ],
    ),
}


def get_model_spec(model_id: str) -> ModelAdapterSpec | None:
    return MODEL_CATALOG.get(model_id)


def resolve_target_dimensions(model_id: str, aspect_ratio: str, resolution_id: str = "") -> tuple[int, int]:
    spec = MODEL_CATALOG.get(model_id)
    if spec:
        for res in spec.supported_resolutions:
            if res["id"] == resolution_id:
                return int(res["width"]), int(res["height"])
        for res in spec.supported_resolutions:
            if res["aspect_ratio"] == aspect_ratio:
                return int(res["width"]), int(res["height"])
    if aspect_ratio == "16:9":
        return 1280, 720
    if aspect_ratio == "1:1":
        return 720, 720
    return 720, 1280
