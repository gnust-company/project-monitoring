"""Use cases cho Project — PIC permissions (#11), bỏ approval queue.

PIC = người tạo (project cho đổi PIC trong detail; phase PIC = người tạo).
Chỉ PIC (hoặc superuser) mới sửa/xóa metadata project. Owner workspace được đổi PIC.
"""
from dataclasses import dataclass
from datetime import date
from typing import Any
from uuid import UUID, uuid4

from app.application.authz import can_edit_project, effective_project_pic
from app.application.notifications import NotificationService
from app.application.ports import ProjectRepository
from app.domain.entities import Membership, Project, User
from app.domain.value_objects import ProjectStatus


class ProjectNotFoundError(Exception):
    pass


class ProjectForbiddenError(Exception):
    """Actor không phải PIC/superuser → không được sửa/xóa/đổi PIC."""


@dataclass(slots=True)
class CreateProjectInput:
    org_id: UUID
    name: str
    description: str
    start_date: date
    created_by: UUID
    target_date: date | None = None  # #20: không bắt buộc
    status: ProjectStatus = ProjectStatus.ON_TRACK
    pic_user_id: UUID | None = None  # #11: mặc định = created_by


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
    # #20: target_date có thể là None (xóa ngày kết thúc) hoặc ISO string.
    if "target_date" in payload:
        v = payload["target_date"]
        project.target_date = date.fromisoformat(v) if v else None
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
            status=data.status, start_date=data.start_date, created_by=data.created_by,
            pic_user_id=data.pic_user_id or data.created_by,
            target_date=data.target_date, progress=0,
        )
        return await self._projects.create(project)


class UpdateProject:
    """Sửa metadata project — chỉ PIC (hiệu dụng)/superuser (#11)."""

    def __init__(self, projects: ProjectRepository) -> None:
        self._projects = projects

    async def execute(self, project_id: UUID, payload: dict[str, Any], actor: User) -> Project:
        project = await self._projects.get(project_id)
        if project is None:
            raise ProjectNotFoundError(str(project_id))
        if not can_edit_project(actor, project):
            raise ProjectForbiddenError(
                "Chỉ PIC (hoặc admin) mới được sửa dự án này"
            )
        return await self._projects.update(_apply_updates(project, payload))


class DeleteProject:
    """Xóa project — chỉ PIC (hiệu dụng)/superuser (#11)."""

    def __init__(self, projects: ProjectRepository) -> None:
        self._projects = projects

    async def execute(self, project_id: UUID, actor: User) -> None:
        project = await self._projects.get(project_id)
        if project is None:
            raise ProjectNotFoundError(str(project_id))
        if not can_edit_project(actor, project):
            raise ProjectForbiddenError(
                "Chỉ PIC (hoặc admin) mới được xóa dự án này"
            )
        await self._projects.delete(project_id)


class ChangeProjectPic:
    """Đổi PIC project — PIC hiện tại, owner workspace, hoặc superuser."""

    def __init__(self, projects: ProjectRepository, notifier: NotificationService) -> None:
        self._projects = projects
        self._notifier = notifier

    async def execute(
        self, project_id: UUID, new_pic_id: UUID, actor: User, membership: Membership | None,
    ) -> Project:
        project = await self._projects.get(project_id)
        if project is None:
            raise ProjectNotFoundError(str(project_id))

        is_owner = (
            actor.is_superuser
            or (membership is not None and membership.role == membership.role.OWNER)
        )
        if not (is_owner or effective_project_pic(project) == str(actor.id)):
            raise ProjectForbiddenError("Bạn không có quyền đổi PIC dự án này")

        project.pic_user_id = new_pic_id
        updated = await self._projects.update(project)
        if new_pic_id != actor.id:
            await self._notifier.notify(
                new_pic_id, "project_pic_changed",
                f"Bạn được chỉ định làm PIC dự án {project.name}",
                org_id=project.org_id, project_id=project.id,
            )
        return updated
