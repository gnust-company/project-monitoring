"""Use cases cho Project — gồm luồng duyệt (approval queue) cho member."""
from dataclasses import dataclass
from datetime import date
from typing import Any
from uuid import UUID, uuid4

from app.application.authz import can_edit_project_directly
from app.application.notifications import NotificationService
from app.application.ports import (
    ChangeRequestRepository,
    OrganizationRepository,
    ProjectRepository,
)
from app.domain.entities import ChangeRequest, Membership, Project, User
from app.domain.value_objects import ChangeRequestAction, ProjectStatus


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


def _apply_updates(project: Project, payload: dict[str, Any]) -> Project:
    """Áp dụng các thay đổi (JSON-friendly: ngày dạng ISO string) vào entity."""
    if "name" in payload:
        project.name = payload["name"]
    if "description" in payload:
        project.description = payload["description"]
    if "status" in payload:
        project.status = ProjectStatus(payload["status"])
    if "progress" in payload:
        project.progress = payload["progress"]
    if payload.get("start_date"):
        project.start_date = date.fromisoformat(payload["start_date"])
    if payload.get("target_date"):
        project.target_date = date.fromisoformat(payload["target_date"])
    return project


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
            id=uuid4(), org_id=data.org_id, name=data.name, description=data.description,
            status=data.status, start_date=data.start_date, target_date=data.target_date,
            progress=0, created_by=data.created_by,
        )
        return await self._projects.create(project)


class UpdateProjectOrRequest:
    """Owner/superuser sửa trực tiếp; member tạo ChangeRequest chờ duyệt."""

    def __init__(
        self, projects: ProjectRepository, change_requests: ChangeRequestRepository,
        orgs: OrganizationRepository, notifier: NotificationService,
    ) -> None:
        self._projects = projects
        self._crs = change_requests
        self._orgs = orgs
        self._notifier = notifier

    async def execute(
        self, project_id: UUID, payload: dict[str, Any], actor: User, membership: Membership | None
    ) -> tuple[Project | None, ChangeRequest | None]:
        project = await self._projects.get(project_id)
        if project is None:
            raise ProjectNotFoundError(str(project_id))

        if can_edit_project_directly(actor, membership):
            return await self._projects.update(_apply_updates(project, payload)), None

        cr = await self._crs.create(ChangeRequest(
            id=uuid4(), org_id=project.org_id, project_id=project_id,
            requested_by=actor.id, action=ChangeRequestAction.UPDATE_PROJECT, payload=payload,
        ))
        await self._notify_owners(project, actor, cr.id, "sửa")
        return None, cr

    async def _notify_owners(self, project: Project, actor: User, cr_id: UUID, verb: str) -> None:
        owners = [o for o in await self._orgs.list_owner_ids(project.org_id) if o != actor.id]
        await self._notifier.notify_many(
            owners, "change_request_created",
            f"{actor.name} yêu cầu {verb} dự án {project.name}",
            org_id=project.org_id, project_id=project.id, change_request_id=cr_id,
        )


class DeleteProjectOrRequest:
    def __init__(
        self, projects: ProjectRepository, change_requests: ChangeRequestRepository,
        orgs: OrganizationRepository, notifier: NotificationService,
    ) -> None:
        self._projects = projects
        self._crs = change_requests
        self._orgs = orgs
        self._notifier = notifier

    async def execute(
        self, project_id: UUID, actor: User, membership: Membership | None
    ) -> ChangeRequest | None:
        project = await self._projects.get(project_id)
        if project is None:
            raise ProjectNotFoundError(str(project_id))

        if can_edit_project_directly(actor, membership):
            await self._projects.delete(project_id)
            return None

        cr = await self._crs.create(ChangeRequest(
            id=uuid4(), org_id=project.org_id, project_id=project_id,
            requested_by=actor.id, action=ChangeRequestAction.DELETE_PROJECT, payload={},
        ))
        owners = [o for o in await self._orgs.list_owner_ids(project.org_id) if o != actor.id]
        await self._notifier.notify_many(
            owners, "change_request_created",
            f"{actor.name} yêu cầu xóa dự án {project.name}",
            org_id=project.org_id, project_id=project.id, change_request_id=cr.id,
        )
        return cr
