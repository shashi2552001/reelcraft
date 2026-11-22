from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, model_validator

VisualStyle = Literal["3D Indian Anime", "Cartoon", "Realistic", "Cinematic", "Custom Style"]
AspectRatio = Literal["9:16", "16:9", "1:1"]
JobStatus = Literal["Queued", "Processing", "Rendering", "Completed", "Failed", "Cancelled"]
AssetCategory = Literal["generated_video", "character_image", "reference_image", "story_asset", "thumbnail"]


class HealthResponse(BaseModel):
    status: str
    database_connected: bool
    gpu_worker_configured: bool
    storage_backend: str
    active_model: str | None = None
    gpu_status: str | None = None


class ProjectCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    description: str = Field(default="", max_length=4000)
    target_style: VisualStyle
    aspect_ratio: AspectRatio


class ProjectResponse(ProjectCreate):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime


class StoryCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=5, max_length=4000)
    project_id: str | None = None
    visual_style: VisualStyle
    default_aspect_ratio: AspectRatio
    character_ids: list[str] = Field(default_factory=list)


class StoryResponse(StoryCreate):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime


class CharacterCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=2000)
    face_and_appearance: str = Field(min_length=2, max_length=1000)
    hairstyle: str = Field(min_length=2, max_length=500)
    clothing: str = Field(min_length=2, max_length=1000)
    age_appearance: str = Field(min_length=2, max_length=80)
    body_description: str = Field(default="", max_length=500)
    personality: str = Field(default="", max_length=500)
    reference_image_url: str = Field(default="", max_length=2000)
    visual_style: VisualStyle
    associated_story_ids: list[str] = Field(default_factory=list)


class CharacterResponse(CharacterCreate):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime


class SceneCreate(BaseModel):
    story_id: str
    episode_id: str
    scene_number: int = Field(ge=1, le=100)
    title: str = Field(min_length=1, max_length=200)
    action_description: str = Field(min_length=4, max_length=4000)
    camera_and_mood: str = Field(default="", max_length=1000)
    compiled_prompt: str = Field(min_length=4, max_length=12000)
    negative_prompt: str = Field(default="", max_length=2000)
    duration_seconds: int = Field(ge=2, le=10)
    aspect_ratio: AspectRatio
    character_ids: list[str] = Field(default_factory=list)


class SceneResponse(SceneCreate):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime


class ScenePlanInput(BaseModel):
    scene_number: int = Field(ge=1, le=20)
    title: str = Field(min_length=1, max_length=200)
    prompt: str = Field(min_length=2, max_length=4000)
    duration_seconds: int = Field(ge=2, le=10)


class GenerateVideoRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    prompt: str = Field(min_length=4, max_length=4000)
    story_prompt: str = Field(default="", max_length=2000)
    negative_prompt: str = Field(default="", max_length=2000)
    compiled_prompt: str = Field(min_length=4, max_length=12000)
    visual_style: VisualStyle
    custom_style_note: str | None = Field(default=None, max_length=500)
    aspect_ratio: AspectRatio
    resolution_id: str = Field(default="", max_length=60)
    resolution_label: str = Field(default="720p", max_length=60)
    total_duration_seconds: int = Field(ge=30, le=60)
    scenes: list[ScenePlanInput] = Field(min_length=1, max_length=20)
    model_id: str = Field(min_length=2, max_length=80)
    story_id: str | None = None
    episode_id: str | None = None
    scene_id: str | None = None
    character_ids: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_scene_durations_sum(self) -> "GenerateVideoRequest":
        total = sum(scene.duration_seconds for scene in self.scenes)
        if total != self.total_duration_seconds:
            raise ValueError(
                f"Scene durations sum to {total}s, which must match total_duration_seconds ({self.total_duration_seconds}s)."
            )
        return self


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    video_url: str | None = None
    thumbnail_url: str | None = None
    file_size_bytes: int | None = None
    validated_duration_seconds: float | None = None
    error_message: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class VideoRecordResponse(BaseModel):
    video_id: str
    job_id: str
    owner_id: str
    title: str
    duration_seconds: float
    aspect_ratio: AspectRatio
    visual_style: VisualStyle
    resolution_label: str
    video_url: str
    thumbnail_url: str | None = None
    file_size_bytes: int
    story_id: str | None = None
    created_at: datetime


class PresignUploadRequest(BaseModel):
    file_name: str = Field(min_length=1, max_length=255)
    mime_type: str = Field(min_length=3, max_length=80)
    size_bytes: int = Field(gt=0, le=10_485_760)
    category: AssetCategory


class PresignUploadResponse(BaseModel):
    upload_url: str
    object_key: str
    asset_id: str
