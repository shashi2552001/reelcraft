from collections.abc import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine | None:
    global _engine, _session_factory
    settings = get_settings()
    if not settings.database_url.strip():
        return None
    if _engine is None:
        _engine = create_async_engine(
            settings.database_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return _engine


async def check_database_connection() -> bool:
    engine = get_engine()
    if engine is None:
        return False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = get_engine()
    if engine is None or _session_factory is None:
        raise RuntimeError(
            "PostgreSQL DATABASE_URL is not configured. See README.md for database setup."
        )
    async with _session_factory() as session:
        yield session
