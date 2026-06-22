"""Test harness — chạy trên Postgres test DB thật (khớp production).

- Schema dựng 1 lần/phiên bằng `Base.metadata.create_all` (sync fixture, loop riêng).
- Mỗi test chạy trong 1 transaction rồi rollback → cô lập hoàn toàn, không cần truncate.
- `client` là httpx.AsyncClient gọi thẳng ASGI app, override get_session sang session test.
"""
import asyncio
import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.infrastructure.db.models import Base
from app.infrastructure.db.session import get_session
from app.main import app

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://projecthub:projecthub@localhost:5432/projecthub_test",
)


@pytest.fixture(scope="session", autouse=True)
def _setup_schema():
    """Dựng lại schema 1 lần cho cả phiên test (loop độc lập với test loop).

    #26 (mảng A): phase mặc định nay seed theo từng workspace khi tạo org (qua API),
    không còn bảng global phase_task_templates để seed sẵn ở đây."""
    async def _rebuild():
        engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()

    asyncio.run(_rebuild())
    yield


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    """1 transaction / test, rollback ở cuối. Engine tạo trong chính loop của test."""
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    conn = await engine.connect()
    trans = await conn.begin()
    session = async_sessionmaker(bind=conn, expire_on_commit=False)()
    try:
        yield session
    finally:
        await session.close()
        await trans.rollback()
        await conn.close()
        await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncClient:
    """ASGI client dùng chung session test (mọi request thấy cùng transaction)."""
    async def _override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = _override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def auth(token: str) -> dict[str, str]:
    """Header Authorization tiện dùng trong test."""
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
def make_user(client: AsyncClient):
    """Factory: đăng ký 1 user → trả (token, user_dict)."""
    async def _make(email: str, role: str = "PM", password: str = "pw123456", name: str | None = None):
        # #26 mảng B: đăng ký KHÔNG còn role toàn cục. Tham số `role` giữ lại cho tương
        # thích chữ ký test cũ nhưng bị bỏ qua (role nay theo workspace).
        resp = await client.post("/api/v1/auth/register", json={
            "email": email, "password": password, "name": name or email.split("@")[0],
        })
        assert resp.status_code == 201, resp.text
        data = resp.json()
        return data["accessToken"], data["user"]

    return _make
