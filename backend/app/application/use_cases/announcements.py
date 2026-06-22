"""Use cases #27 — kênh thông báo từ admin.

CRUD announcement = superuser (enforce ở router). `ListActive` + `Dismiss` cho mọi
user đã đăng nhập. Hạn ẩn ("hôm nay" / "tuần này") tính theo UTC cho nhất quán với
phần còn lại của backend.
"""
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from app.application.ports import AnnouncementRepository
from app.domain.entities import Announcement

DISMISS_SCOPES = ("day", "week")


class AnnouncementNotFoundError(Exception):
    pass


class InvalidAnnouncementError(Exception):
    """time-range không hợp lệ (starts_at >= ends_at) hoặc thiếu trường."""


class InvalidDismissScopeError(Exception):
    """scope ẩn không phải 'day' | 'week'."""


def _validate_window(starts_at: datetime | None, ends_at: datetime | None) -> None:
    if starts_at is None or ends_at is None:
        raise InvalidAnnouncementError("Cần cả thời điểm bắt đầu và kết thúc")
    if starts_at >= ends_at:
        raise InvalidAnnouncementError("Thời điểm bắt đầu phải trước kết thúc")


def _dismiss_until(scope: str, now: datetime) -> datetime:
    """Hạn ẩn: 'day' → hết hôm nay (00:00 ngày mai); 'week' → hết tuần này (00:00 thứ Hai kế)."""
    if scope not in DISMISS_SCOPES:
        raise InvalidDismissScopeError(scope)
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if scope == "day":
        return midnight + timedelta(days=1)
    # week: dồn về 00:00 thứ Hai kế tiếp (Mon=0)
    return midnight + timedelta(days=7 - now.weekday())


class ListAllAnnouncements:
    """Admin xem toàn bộ (cả hết hạn / chưa tới) để quản lý."""

    def __init__(self, repo: AnnouncementRepository) -> None:
        self._repo = repo

    async def execute(self) -> list[Announcement]:
        return await self._repo.list_all()


class ListActiveAnnouncements:
    """User thấy thông báo đang trong time-range và chưa tự ẩn."""

    def __init__(self, repo: AnnouncementRepository) -> None:
        self._repo = repo

    async def execute(self, user_id: UUID, now: datetime | None = None) -> list[Announcement]:
        return await self._repo.list_active(user_id, now or datetime.now(timezone.utc))


class CreateAnnouncement:
    def __init__(self, repo: AnnouncementRepository) -> None:
        self._repo = repo

    async def execute(self, payload: dict[str, Any], created_by: UUID) -> Announcement:
        starts_at = payload.get("starts_at")
        ends_at = payload.get("ends_at")
        _validate_window(starts_at, ends_at)
        return await self._repo.create(Announcement(
            id=uuid4(), title=payload["title"], body=payload.get("body") or "",
            starts_at=starts_at, ends_at=ends_at, created_by=created_by,
        ))


class UpdateAnnouncement:
    def __init__(self, repo: AnnouncementRepository) -> None:
        self._repo = repo

    async def execute(self, announcement_id: UUID, payload: dict[str, Any]) -> Announcement:
        existing = await self._repo.get(announcement_id)
        if existing is None:
            raise AnnouncementNotFoundError(str(announcement_id))
        if "title" in payload and payload["title"]:
            existing.title = payload["title"]
        if "body" in payload:
            existing.body = payload["body"] or ""
        if "starts_at" in payload and payload["starts_at"] is not None:
            existing.starts_at = payload["starts_at"]
        if "ends_at" in payload and payload["ends_at"] is not None:
            existing.ends_at = payload["ends_at"]
        _validate_window(existing.starts_at, existing.ends_at)
        return await self._repo.update(existing)


class DeleteAnnouncement:
    def __init__(self, repo: AnnouncementRepository) -> None:
        self._repo = repo

    async def execute(self, announcement_id: UUID) -> None:
        if not await self._repo.delete(announcement_id):
            raise AnnouncementNotFoundError(str(announcement_id))


class DismissAnnouncement:
    """User ẩn 1 thông báo trong hôm nay / tuần này."""

    def __init__(self, repo: AnnouncementRepository) -> None:
        self._repo = repo

    async def execute(
        self, announcement_id: UUID, user_id: UUID, scope: str, now: datetime | None = None
    ) -> None:
        now = now or datetime.now(timezone.utc)
        until = _dismiss_until(scope, now)
        if await self._repo.get(announcement_id) is None:
            raise AnnouncementNotFoundError(str(announcement_id))
        await self._repo.dismiss(announcement_id, user_id, scope, until)
