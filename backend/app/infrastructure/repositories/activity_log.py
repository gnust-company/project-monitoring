"""SqlAlchemy cài đặt ActivityLogRepository."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports import ActivityLogRepository
from app.domain.entities import ActivityEntry
from app.infrastructure.db.models import ActivityLogModel


def _to_entity(m: ActivityLogModel) -> ActivityEntry:
    return ActivityEntry(
        id=m.id, project_id=m.project_id, user_id=m.user_id, action=m.action,
        target=m.target, created_at=m.created_at, phase_block_id=m.phase_block_id,
    )


class SqlAlchemyActivityLogRepository(ActivityLogRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, entry: ActivityEntry) -> ActivityEntry:
        m = ActivityLogModel(
            id=entry.id, project_id=entry.project_id, phase_block_id=entry.phase_block_id,
            user_id=entry.user_id, action=entry.action, target=entry.target,
        )
        self._session.add(m)
        await self._session.flush()
        return _to_entity(m)

    async def list_by_phase(self, block_id: UUID) -> list[ActivityEntry]:
        rows = await self._session.scalars(
            select(ActivityLogModel).where(ActivityLogModel.phase_block_id == block_id)
            .order_by(ActivityLogModel.created_at.desc())
        )
        return [_to_entity(m) for m in rows]

    async def list_by_project(self, project_id: UUID) -> list[ActivityEntry]:
        rows = await self._session.scalars(
            select(ActivityLogModel).where(ActivityLogModel.project_id == project_id)
            .order_by(ActivityLogModel.created_at.desc())
        )
        return [_to_entity(m) for m in rows]
