"""Use cases cho Project — ví dụ wiring chuẩn của Clean Architecture.

Use case nhận port qua constructor (DI), thao tác trên domain entities,
không biết gì về FastAPI hay SQLAlchemy.
"""
from dataclasses import dataclass
from datetime import date
from uuid import UUID, uuid4

from app.application.ports import ProjectRepository
from app.domain.entities import Project
from app.domain.value_objects import ProjectStatus


class ProjectNotFoundError(Exception):
    pass


@dataclass(slots=True)
class CreateProjectInput:
    org_id: UUID
    name: str
    description: str
    start_date: date
    target_date: date
    created_by: UUID
    status: ProjectStatus = ProjectStatus.ON_TRACK


class ListProjectsByOrg:
    def __init__(self, projects: ProjectRepository) -> None:
        self._projects = projects

    async def execute(self, org_id: UUID) -> list[Project]:
        return await self._projects.list_by_org(org_id)


class GetProject:
    def __init__(self, projects: ProjectRepository) -> None:
        self._projects = projects

    async def execute(self, project_id: UUID) -> Project:
        project = await self._projects.get(project_id)
        if project is None:
            raise ProjectNotFoundError(str(project_id))
        return project


class CreateProject:
    def __init__(self, projects: ProjectRepository) -> None:
        self._projects = projects

    async def execute(self, data: CreateProjectInput) -> Project:
        project = Project(
            id=uuid4(),
            org_id=data.org_id,
            name=data.name,
            description=data.description,
            status=data.status,
            start_date=data.start_date,
            target_date=data.target_date,
            progress=0,
            created_by=data.created_by,
        )
        return await self._projects.create(project)
