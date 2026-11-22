import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    projects: Mapped[list["Project"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    stories: Mapped[list["Story"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    characters: Mapped[list["Character"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    prompts: Mapped[list["Prompt"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    generation_jobs: Mapped[list["GenerationJob"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    generated_videos: Mapped[list["GeneratedVideo"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    assets: Mapped[list["Asset"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    target_style: Mapped[str] = mapped_column(String(40), nullable=False)
    aspect_ratio: Mapped[str] = mapped_column(String(10), nullable=False)

    user: Mapped["User"] = relationship(back_populates="projects")
    stories: Mapped[list["Story"]] = relationship(back_populates="project")

    __table_args__ = (
        CheckConstraint("aspect_ratio IN ('9:16', '16:9', '1:1')", name="ck_projects_aspect_ratio"),
    )


class Story(Base, TimestampMixin):
    __tablename__ = "stories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    visual_style: Mapped[str] = mapped_column(String(40), nullable=False)
    default_aspect_ratio: Mapped[str] = mapped_column(String(10), nullable=False)

    user: Mapped["User"] = relationship(back_populates="stories")
    project: Mapped["Project | None"] = relationship(back_populates="stories")
    episodes: Mapped[list["Episode"]] = relationship(back_populates="story", cascade="all, delete-orphan")
    prompts: Mapped[list["Prompt"]] = relationship(back_populates="story")


class Episode(Base, TimestampMixin):
    __tablename__ = "episodes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    story_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    episode_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    continuity_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    previous_episode_context: Mapped[str] = mapped_column(Text, default="", nullable=False)

    story: Mapped["Story"] = relationship(back_populates="episodes")
    scenes: Mapped[list["Scene"]] = relationship(back_populates="episode", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("story_id", "episode_number", name="uq_episodes_story_number"),
        CheckConstraint("episode_number >= 1", name="ck_episodes_positive_num"),
    )


class Character(Base, TimestampMixin):
    __tablename__ = "characters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    face_and_appearance: Mapped[str] = mapped_column(Text, nullable=False)
    hairstyle: Mapped[str] = mapped_column(Text, nullable=False)
    clothing: Mapped[str] = mapped_column(Text, nullable=False)
    age_appearance: Mapped[str] = mapped_column(String(80), nullable=False)
    body_description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    personality: Mapped[str] = mapped_column(Text, default="", nullable=False)
    visual_style: Mapped[str] = mapped_column(String(40), nullable=False, index=True)

    user: Mapped["User"] = relationship(back_populates="characters")
    reference_images: Mapped[list["CharacterReferenceImage"]] = relationship(
        back_populates="character", cascade="all, delete-orphan"
    )


class Asset(Base, TimestampMixin):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_type: Mapped[str] = mapped_column(String(32), nullable=False)
    storage_provider: Mapped[str] = mapped_column(String(32), nullable=False)
    bucket_name: Mapped[str] = mapped_column(String(120), nullable=False)
    object_key: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(80), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)

    user: Mapped["User"] = relationship(back_populates="assets")

    __table_args__ = (
        CheckConstraint(
            "asset_type IN ('generated_video', 'character_image', 'reference_image', 'story_asset', 'thumbnail')",
            name="ck_assets_type",
        ),
        CheckConstraint("size_bytes >= 0", name="ck_assets_size_nonnegative"),
    )


class CharacterReferenceImage(Base, TimestampMixin):
    __tablename__ = "character_reference_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("characters.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pose_label: Mapped[str] = mapped_column(String(80), default="portrait", nullable=False)

    character: Mapped["Character"] = relationship(back_populates="reference_images")
    asset: Mapped["Asset"] = relationship()


class Scene(Base, TimestampMixin):
    __tablename__ = "scenes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    episode_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("episodes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scene_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    action_description: Mapped[str] = mapped_column(Text, nullable=False)
    camera_and_mood: Mapped[str] = mapped_column(Text, default="", nullable=False)
    compiled_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    negative_prompt: Mapped[str] = mapped_column(Text, default="", nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    aspect_ratio: Mapped[str] = mapped_column(String(10), nullable=False)

    episode: Mapped["Episode"] = relationship(back_populates="scenes")
    generation_jobs: Mapped[list["GenerationJob"]] = relationship(back_populates="scene")

    __table_args__ = (
        UniqueConstraint("episode_id", "scene_number", name="uq_scenes_episode_number"),
        CheckConstraint("scene_number >= 1", name="ck_scenes_positive_num"),
    )


class Prompt(Base, TimestampMixin):
    __tablename__ = "prompts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    story_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("stories.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    story_prompt: Mapped[str] = mapped_column(Text, default="", nullable=False)
    negative_prompt: Mapped[str] = mapped_column(Text, default="", nullable=False)
    visual_style: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    aspect_ratio: Mapped[str] = mapped_column(String(10), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=30, nullable=False)

    user: Mapped["User"] = relationship(back_populates="prompts")
    story: Mapped["Story | None"] = relationship(back_populates="prompts")


class ModelVersion(Base, TimestampMixin):
    __tablename__ = "model_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    family: Mapped[str] = mapped_column(String(80), nullable=False)
    license_name: Mapped[str] = mapped_column(String(120), nullable=False)
    checkpoint_uri: Mapped[str] = mapped_column(Text, nullable=False)
    supported_durations_json: Mapped[list[int]] = mapped_column(JSONB, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    generation_jobs: Mapped[list["GenerationJob"]] = relationship(back_populates="model_version")


class GenerationJob(Base, TimestampMixin):
    __tablename__ = "generation_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scene_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("scenes.id", ondelete="SET NULL"), nullable=True, index=True)
    model_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("model_versions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(24), default="Queued", nullable=False)
    compiled_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    negative_prompt: Mapped[str] = mapped_column(Text, default="", nullable=False)
    aspect_ratio: Mapped[str] = mapped_column(String(10), nullable=False)
    resolution_label: Mapped[str] = mapped_column(String(60), default="720p", nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    scene_plan_json: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_logs: Mapped[str | None] = mapped_column(Text, nullable=True)
    worker_node_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="generation_jobs")
    scene: Mapped["Scene | None"] = relationship(back_populates="generation_jobs")
    model_version: Mapped["ModelVersion"] = relationship(back_populates="generation_jobs")
    generated_video: Mapped["GeneratedVideo | None"] = relationship(
        back_populates="job", uselist=False, cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('Queued', 'Processing', 'Rendering', 'Completed', 'Failed', 'Cancelled')",
            name="ck_generation_jobs_status",
        ),
        CheckConstraint("duration_seconds BETWEEN 30 AND 60", name="ck_generation_jobs_duration_30_60"),
        Index("ix_generation_jobs_user_status", "user_id", "status"),
    )


class GeneratedVideo(Base, TimestampMixin):
    __tablename__ = "generated_videos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("generation_jobs.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False)
    thumbnail_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("assets.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    validated_duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    fps: Mapped[int] = mapped_column(Integer, default=24, nullable=False)

    job: Mapped["GenerationJob"] = relationship(back_populates="generated_video")
    user: Mapped["User"] = relationship(back_populates="generated_videos")
    asset: Mapped["Asset"] = relationship(foreign_keys=[asset_id])
    thumbnail_asset: Mapped["Asset | None"] = relationship(foreign_keys=[thumbnail_asset_id])
