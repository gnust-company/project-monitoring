"""Use cases cho hồ sơ user — cập nhật tên/role và avatar (MinIO)."""
from uuid import uuid4

from app.application.ports import ObjectStorage, UserRepository
from app.domain.entities import User
from app.domain.value_objects import UserRole


class UpdateProfile:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self, user: User, name: str | None = None, role: UserRole | None = None) -> User:
        if name is not None:
            user.name = name
        if role is not None:
            user.role = role
        return await self._users.update(user)


class SetAvatar:
    def __init__(self, users: UserRepository, storage: ObjectStorage, bucket: str) -> None:
        self._users = users
        self._storage = storage
        self._bucket = bucket

    async def execute(self, user: User, filename: str, content_type: str, data: bytes) -> User:
        key = f"{user.id}/{uuid4().hex}-{filename}"
        url = await self._storage.put(self._bucket, key, data, content_type or "application/octet-stream")
        user.avatar_url = url
        return await self._users.update(user)
