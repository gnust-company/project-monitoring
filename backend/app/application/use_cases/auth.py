"""Use cases cho xác thực & first-run setup.

Use case không biết JWT — token do tầng presentation phát sau khi nhận User.
Mật khẩu được hash/verify qua hai callable tiêm vào (giữ domain sạch khỏi bcrypt).
"""
from collections.abc import Callable, Sequence
from uuid import uuid4

from app.application.ports import UserRepository
from app.domain.entities import User


class EmailTakenError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class SetupAlreadyDoneError(Exception):
    pass


class EmailDomainNotAllowedError(Exception):
    """Domain email không nằm trong allowlist (#5)."""

    def __init__(self, email: str, allowed: Sequence[str] = ()) -> None:
        self.email = email
        self.allowed = list(allowed)
        msg = f"Email domain not allowed: {email}"
        if self.allowed:
            msg += f". Allowed: {', '.join(self.allowed)}"
        super().__init__(msg)


class RegisterUser:
    def __init__(
        self,
        users: UserRepository,
        hasher: Callable[[str], str],
        *,
        allowed_email_domains: Sequence[str] = (),
    ) -> None:
        self._users = users
        self._hash = hasher
        self._allowed = tuple(d.strip().lower().lstrip("@") for d in allowed_email_domains if d.strip())

    async def execute(
        self, email: str, password: str, name: str, *,
        is_superuser: bool = False, enforce_email_domain: bool = True,
    ) -> User:
        # #5: chặn domain ngoài allowlist (trừ /auth/setup vì enforce_email_domain=False).
        if enforce_email_domain and self._allowed:
            domain = email.rsplit("@", 1)[-1].lower() if "@" in email else ""
            if domain not in self._allowed:
                raise EmailDomainNotAllowedError(email, self._allowed)

        if await self._users.get_by_email(email):
            raise EmailTakenError(email)
        # #26 mảng B: không còn role toàn cục — role gắn theo workspace khi vào.
        user = User(
            id=uuid4(),
            email=email,
            name=name,
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

    async def execute(self, email: str, password: str, name: str) -> User:
        if (await self._users.count()) > 0:
            raise SetupAlreadyDoneError()
        # #5: setup (admin đầu tiên) KHÔNG bị giới hạn domain.
        return await self._register.execute(
            email, password, name, is_superuser=True, enforce_email_domain=False
        )
