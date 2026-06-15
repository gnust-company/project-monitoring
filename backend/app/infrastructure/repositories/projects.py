"""Cài đặt ProjectRepository bằng SQLAlchemy — mẫu tham chiếu cho các repo khác."""
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports import ProjectRepository
from app.domain.entities import Project
from app.infrastructure.db.models import ProjectModel


def _to_entity(m: ProjectModel) -> Project:
    return Project(
        id=m.id,
        org_id=m.org_id,
        name=m.name,
        description=m.description,
        status=m.status,
        start_date=m.start_date,
        target_date=m.target_date,
        progress=m.progress,
        created_by=m.created_by,
        created_at=m.created_at,
    )


class SqlAlchemyProjectRepository(ProjectRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, project_id: UUID) -> Project | None:
        m = await self._session.get(ProjectModel, project_id)
        return _to_entity(m) if m else None

    async def list_by_org(self, org_id: UUID) -> list[Project]:
        result = await self._session.scalars(
            select(ProjectModel).where(ProjectModel.org_id == org_id).order_by(ProjectModel.created_at)
        )
        return [_to_entity(m) for m in result]

    async def count_all(self) -> int:
        return await self._session.scalar(select(func.count()).select_from(ProjectModel)) or 0

    async def count_by_org(self) -> dict[UUID, int]:
        rows = await self._session.execute(
            select(ProjectModel.org_id, func.count()).group_by(ProjectModel.org_id)
        )
        return {org_id: count for org_id, count in rows.all()}

    async def create(self, project: Project) -> Project:
        m = ProjectModel(
            id=project.id,
            org_id=project.org_id,
            name=project.name,
            description=project.description,
            status=project.status,
            start_date=project.start_date,
            target_date=project.target_date,
            progress=project.progress,
            created_by=project.created_by,
        )
        self._session.add(m)
        await self._session.flush()
        return _to_entity(m)

    async def update(self, project: Project) -> Project:
        m = await self._session.get(ProjectModel, project.id)
        if m is None:
            raise LookupError(f"Project {project.id} not found")
        m.name = project.name
        m.description = project.description
        m.status = project.status
        m.start_date = project.start_date
        m.target_date = project.target_date
        m.progress = project.progress
        await self._session.flush()
        return _to_entity(m)

    async def delete(self, project_id: UUID) -> None:
        await self._session.execute(delete(ProjectModel).where(ProjectModel.id == project_id))
