"""Async engine & session factory — SQLAlchemy 2.0 + asyncpg."""
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

engine = create_async_engine(get_settings().database_url, echo=False, pool_pre_ping=True)

async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: 1 request = 1 session = 1 transaction."""
    async with async_session_factory() as session:
        async with session.begin():
            yield session
