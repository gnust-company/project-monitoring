"""SqlAlchemy cài đặt ActivityLogRepository."""
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports import ActivityLogRepository
from app.domain.entities import ActivityEntry
from app.infrastructure.db.models import ActivityLogModel, ProjectModel


def _to_entity(m: ActivityLogModel) -> ActivityEntry:
    return ActivityEntry(
        id=m.id, project_id=m.project_id, org_id=m.org_id, user_id=m.user_id, action=m.action,
        target=m.target, created_at=m.created_at, phase_block_id=m.phase_block_id,
    )


class SqlAlchemyActivityLogRepository(ActivityLogRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, entry: ActivityEntry) -> ActivityEntry:
        m = ActivityLogModel(
            id=entry.id, project_id=entry.project_id, org_id=entry.org_id,
            phase_block_id=entry.phase_block_id,
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

    async def list_recent_for_org(self, org_id: UUID, limit: int = 50) -> list[ActivityEntry]:
        """#26: toàn bộ hoạt động của workspace cho Dashboard — gồm sự kiện vận hành
        (thuộc dự án của org) lẫn sự kiện vòng đời dự án (org_id set, project_id NULL
        sau khi xóa). outerjoin để giữ cả dòng project_id=NULL."""
        rows = await self._session.scalars(
            select(ActivityLogModel)
            .outerjoin(ProjectModel, ActivityLogModel.project_id == ProjectModel.id)
            .where(or_(ProjectModel.org_id == org_id, ActivityLogModel.org_id == org_id))
            .order_by(ActivityLogModel.created_at.desc())
            .limit(limit)
        )
        return [_to_entity(m) for m in rows]
