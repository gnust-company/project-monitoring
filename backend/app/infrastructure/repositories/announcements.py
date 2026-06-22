"""SqlAlchemy cài đặt AnnouncementRepository (#27)."""
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports import AnnouncementRepository
from app.domain.entities import Announcement
from app.infrastructure.db.models import AnnouncementDismissalModel, AnnouncementModel


def _to_entity(m: AnnouncementModel) -> Announcement:
    return Announcement(
        id=m.id, title=m.title, body=m.body,
        starts_at=m.starts_at, ends_at=m.ends_at,
        created_by=m.created_by, created_at=m.created_at, updated_at=m.updated_at,
    )


class SqlAlchemyAnnouncementRepository(AnnouncementRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, a: Announcement) -> Announcement:
        m = AnnouncementModel(
            id=a.id, title=a.title, body=a.body,
            starts_at=a.starts_at, ends_at=a.ends_at, created_by=a.created_by,
        )
        self._session.add(m)
        await self._session.flush()
        await self._session.refresh(m)
        return _to_entity(m)

    async def get(self, announcement_id: UUID) -> Announcement | None:
        m = await self._session.get(AnnouncementModel, announcement_id)
        return _to_entity(m) if m else None

    async def list_all(self) -> list[Announcement]:
        rows = await self._session.scalars(
            select(AnnouncementModel).order_by(AnnouncementModel.starts_at.desc())
        )
        return [_to_entity(m) for m in rows]

    async def list_active(self, user_id: UUID, now: datetime) -> list[Announcement]:
        # Đang trong time-range VÀ chưa bị user ẩn (dismissed_until còn hiệu lực).
        dismissed = (
            select(AnnouncementDismissalModel.announcement_id)
            .where(
                AnnouncementDismissalModel.user_id == user_id,
                AnnouncementDismissalModel.dismissed_until > now,
            )
        )
        rows = await self._session.scalars(
            select(AnnouncementModel)
            .where(
                AnnouncementModel.starts_at <= now,
                AnnouncementModel.ends_at >= now,
                AnnouncementModel.id.not_in(dismissed),
            )
            .order_by(AnnouncementModel.starts_at.desc())
        )
        return [_to_entity(m) for m in rows]

    async def update(self, a: Announcement) -> Announcement:
        m = await self._session.get(AnnouncementModel, a.id)
        if m is None:
            raise ValueError("announcement not found")
        m.title = a.title
        m.body = a.body
        if a.starts_at is not None:
            m.starts_at = a.starts_at
        if a.ends_at is not None:
            m.ends_at = a.ends_at
        await self._session.flush()
        await self._session.refresh(m)
        return _to_entity(m)

    async def delete(self, announcement_id: UUID) -> bool:
        m = await self._session.get(AnnouncementModel, announcement_id)
        if m is None:
            return False
        await self._session.delete(m)
        return True

    async def dismiss(
        self, announcement_id: UUID, user_id: UUID, scope: str, dismissed_until: datetime
    ) -> None:
        # Upsert: dismiss lại cùng announcement thì cập nhật scope + hạn ẩn mới.
        stmt = pg_insert(AnnouncementDismissalModel).values(
            announcement_id=announcement_id, user_id=user_id,
            scope=scope, dismissed_until=dismissed_until,
        ).on_conflict_do_update(
            index_elements=["announcement_id", "user_id"],
            set_={"scope": scope, "dismissed_until": dismissed_until},
        )
        await self._session.execute(stmt)
