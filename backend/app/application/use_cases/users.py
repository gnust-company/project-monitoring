"""Use cases cho hồ sơ user — cập nhật tên/role, avatar (MinIO),
đổi mật khẩu, xóa tài khoản, và quản trị người dùng (superuser)."""
from collections.abc import Callable
from uuid import uuid4

from app.application.ports import ObjectStorage, UserRepository
from app.application.use_cases.storage_cleanup import purge_object_urls
from app.domain.entities import User
from app.domain.value_objects import UserRole


class InvalidPasswordError(Exception):
    """Mật khẩu hiện tại không đúng."""


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


class ChangePassword:
    def __init__(
        self,
        users: UserRepository,
        verifier: Callable[[str, str], bool],
        hasher: Callable[[str], str],
    ) -> None:
        self._users = users
        self._verify = verifier
        self._hash = hasher

    async def execute(self, user: User, current_password: str, new_password: str) -> None:
        hashed = await self._users.get_password_hash(user.id)
        if not hashed or not self._verify(current_password, hashed):
            raise InvalidPasswordError("Mật khẩu hiện tại không đúng")
        await self._users.update_password(user.id, self._hash(new_password))


class DeleteAccount:
    def __init__(self, users: UserRepository, storage: ObjectStorage, avatars_bucket: str) -> None:
        self._users = users
        self._storage = storage
        self._bucket = avatars_bucket

    async def execute(self, user: User) -> None:
        await self._users.delete(user.id)
        # #21: xóa avatar trên MinIO (avatar_url có thể None → purge bỏ qua).
        await purge_object_urls(self._storage, self._bucket, [user.avatar_url or ""])
