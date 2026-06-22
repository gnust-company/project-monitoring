"""SqlAlchemy cài đặt UserRepository."""
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports import UserRepository
from app.domain.entities import User
from app.infrastructure.db.models import UserModel


def _to_entity(m: UserModel) -> User:
    return User(
        id=m.id,
        email=m.email,
        name=m.name,
        avatar_url=m.avatar_url,
        is_superuser=m.is_superuser,
        created_at=m.created_at,
    )


class SqlAlchemyUserRepository(UserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, user_id: UUID) -> User | None:
        m = await self._session.get(UserModel, user_id)
        return _to_entity(m) if m else None

    async def get_by_email(self, email: str) -> User | None:
        m = await self._session.scalar(select(UserModel).where(UserModel.email == email))
        return _to_entity(m) if m else None

    async def get_password_hash(self, user_id: UUID) -> str | None:
        return await self._session.scalar(
            select(UserModel.password_hash).where(UserModel.id == user_id)
        )

    async def create(self, user: User, password_hash: str) -> User:
        m = UserModel(
            id=user.id,
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            is_superuser=user.is_superuser,
            password_hash=password_hash,
        )
        self._session.add(m)
        await self._session.flush()
        return _to_entity(m)

    async def update(self, user: User) -> User:
        m = await self._session.get(UserModel, user.id)
        if m is None:
            raise LookupError(f"User {user.id} not found")
        m.name = user.name
        m.avatar_url = user.avatar_url
        await self._session.flush()
        return _to_entity(m)

    async def update_password(self, user_id: UUID, password_hash: str) -> None:
        m = await self._session.get(UserModel, user_id)
        if m is None:
            raise LookupError(f"User {user_id} not found")
        m.password_hash = password_hash
        await self._session.flush()

    async def delete(self, user_id: UUID) -> None:
        m = await self._session.get(UserModel, user_id)
        if m is not None:
            await self._session.delete(m)
            await self._session.flush()

    async def list_all(self) -> list[User]:
        rows = await self._session.scalars(select(UserModel).order_by(UserModel.created_at))
        return [_to_entity(m) for m in rows]

    async def count(self) -> int:
        return await self._session.scalar(select(func.count()).select_from(UserModel)) or 0

    async def set_password(self, user_id: UUID, password_hash: str) -> bool:
        m = await self._session.get(UserModel, user_id)
        if m is None:
            return False
        m.password_hash = password_hash
        await self._session.flush()
        return True

    async def set_superuser(self, user_id: UUID, value: bool) -> bool:
        m = await self._session.get(UserModel, user_id)
        if m is None:
            return False
        m.is_superuser = value
        await self._session.flush()
        return True
