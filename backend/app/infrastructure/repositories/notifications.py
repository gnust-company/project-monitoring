"""SqlAlchemy cài đặt NotificationRepository."""
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports import NotificationRepository
from app.domain.entities import Notification
from app.infrastructure.db.models import NotificationModel


def _to_entity(m: NotificationModel) -> Notification:
    return Notification(
        id=m.id, user_id=m.user_id, type=m.type, title=m.title, body=m.body,
        org_id=m.org_id, project_id=m.project_id, phase_block_id=m.phase_block_id,
        change_request_id=m.change_request_id, read=m.read, created_at=m.created_at,
    )


class SqlAlchemyNotificationRepository(NotificationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, n: Notification) -> Notification:
        m = NotificationModel(
            id=n.id, user_id=n.user_id, type=n.type, title=n.title, body=n.body,
            org_id=n.org_id, project_id=n.project_id, phase_block_id=n.phase_block_id,
            change_request_id=n.change_request_id, read=n.read,
        )
        self._session.add(m)
        await self._session.flush()
        return _to_entity(m)

    async def list_for_user(self, user_id: UUID, *, unread_only: bool = False) -> list[Notification]:
        stmt = select(NotificationModel).where(NotificationModel.user_id == user_id)
        if unread_only:
            stmt = stmt.where(NotificationModel.read.is_(False))
        stmt = stmt.order_by(NotificationModel.created_at.desc())
        rows = await self._session.scalars(stmt)
        return [_to_entity(m) for m in rows]

    async def count_unread(self, user_id: UUID) -> int:
        return await self._session.scalar(
            select(func.count()).select_from(NotificationModel).where(
                NotificationModel.user_id == user_id, NotificationModel.read.is_(False)
            )
        ) or 0

    async def mark_read(self, notification_id: UUID, user_id: UUID) -> bool:
        result = await self._session.execute(
            update(NotificationModel)
            .where(NotificationModel.id == notification_id, NotificationModel.user_id == user_id)
            .values(read=True)
        )
        return result.rowcount > 0

    async def mark_all_read(self, user_id: UUID) -> int:
        result = await self._session.execute(
            update(NotificationModel)
            .where(NotificationModel.user_id == user_id, NotificationModel.read.is_(False))
            .values(read=True)
        )
        return result.rowcount
