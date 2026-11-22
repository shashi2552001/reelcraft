from collections.abc import AsyncGenerator
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.model_adapter import MODEL_CATALOG
from app.database.session import get_engine, get_db_session
from app.db.models import ModelVersion, User


def resolve_user_uuid(user_id: str) -> uuid.UUID:
    """Resolve a UUID string or personal workspace slug into a deterministic UUID."""
    try:
        return uuid.UUID(user_id)
    except ValueError:
        return uuid.uuid5(uuid.NAMESPACE_DNS, f"reelcraft:{user_id}")


def parse_uuid(value: str, label: str = "ID") -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {label} format; expected UUID.",
        ) from exc


async def get_required_db_session() -> AsyncGenerator[AsyncSession, None]:
    if get_engine() is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "PostgreSQL database is not configured yet. Copy backend/.env.example to "
                "backend/.env, run 'docker compose up -d', and run 'alembic upgrade head'."
            ),
        )
    try:
        async for session in get_db_session():
            yield session
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to connect to PostgreSQL database: {exc}",
        ) from exc


async def ensure_user_exists(session: AsyncSession, raw_user_id: str) -> User:
    user_uuid = resolve_user_uuid(raw_user_id)
    existing = await session.get(User, user_uuid)
    if existing is not None:
        return existing
    user = User(
        id=user_uuid,
        email=f"{raw_user_id}@local.reelcraft",
        display_name=raw_user_id,
        password_hash="!personal-workspace-account!",
        is_active=True,
    )
    session.add(user)
    await session.flush()
    return user


async def ensure_model_version(session: AsyncSession, model_id: str) -> ModelVersion:
    spec = MODEL_CATALOG.get(model_id)
    if spec is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video model '{model_id}'. Query GET /api/v1/models for valid options.",
        )
    stmt = select(ModelVersion).where(ModelVersion.slug == spec.id)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing is not None:
        return existing

    model_row = ModelVersion(
        slug=spec.id,
        display_name=spec.display_name,
        family=spec.family,
        license_name=spec.license_name,
        checkpoint_uri=spec.huggingface_repo,
        supported_durations_json=[30, 40, 45, 50, 60],
        is_active=True,
    )
    session.add(model_row)
    await session.flush()
    return model_row
