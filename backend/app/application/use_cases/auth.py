"""Use cases cho xác thực & first-run setup.

Use case không biết JWT — token do tầng presentation phát sau khi nhận User.
Mật khẩu được hash/verify qua hai callable tiêm vào (giữ domain sạch khỏi bcrypt).
"""
from collections.abc import Callable
from uuid import uuid4

from app.application.ports import UserRepository
from app.domain.entities import User
from app.domain.value_objects import UserRole


class EmailTakenError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class SetupAlreadyDoneError(Exception):
    pass


class RegisterUser:
    def __init__(self, users: UserRepository, hasher: Callable[[str], str]) -> None:
        self._users = users
        self._hash = hasher

    async def execute(
        self, email: str, password: str, name: str, role: UserRole, *, is_superuser: bool = False
    ) -> User:
        if await self._users.get_by_email(email):
            raise EmailTakenError(email)
        user = User(
            id=uuid4(),
            email=email,
            name=name,
            role=role,
            avatar_url=None,
            is_superuser=is_superuser,
        )
        return await self._users.create(user, self._hash(password))


class AuthenticateUser:
    def __init__(self, users: UserRepository, verifier: Callable[[str, str], bool]) -> None:
        self._users = users
        self._verify = verifier

    async def execute(self, email: str, password: str) -> User:
        user = await self._users.get_by_email(email)
        if user is None:
            raise InvalidCredentialsError(email)
        hashed = await self._users.get_password_hash(user.id)
        if not hashed or not self._verify(password, hashed):
            raise InvalidCredentialsError(email)
        return user


class GetSetupStatus:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self) -> bool:
        """needsSetup = chưa có user nào."""
        return (await self._users.count()) == 0


class SetupSuperuser:
    """Tạo tài khoản đầu tiên (toàn quyền). Chỉ chạy được khi DB chưa có user."""

    def __init__(self, users: UserRepository, register: RegisterUser) -> None:
        self._users = users
        self._register = register

    async def execute(self, email: str, password: str, name: str, role: UserRole) -> User:
        if (await self._users.count()) > 0:
            raise SetupAlreadyDoneError()
        return await self._register.execute(
            email, password, name, role, is_superuser=True
        )
