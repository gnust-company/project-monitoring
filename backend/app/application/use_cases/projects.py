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
from app.application.ports import (
    ActivityLogRepository,
    ObjectStorage,
    PhaseBlockRepository,
    ProjectRepository,
)
from app.application.use_cases.storage_cleanup import purge_object_urls
from app.domain.entities import ActivityEntry, Membership, Project, User
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


class ReorderProjects:
    """#31: sắp lại thứ tự hiển thị dự án trong workspace (dùng chung cả org).
    Quyền owner-only được chốt ở router (ManageDep)."""

    def __init__(self, projects: ProjectRepository) -> None:
        self._projects = projects

    async def execute(self, org_id: UUID, ordered_ids: list[UUID]) -> list[Project]:
        return await self._projects.reorder(org_id, ordered_ids)


class GetProject:
    def __init__(self, projects: ProjectRepository) -> None:
        self._projects = projects

    async def execute(self, project_id: UUID) -> Project:
        project = await self._projects.get(project_id)
        if project is None:
            raise ProjectNotFoundError(str(project_id))
        return project


class CreateProject:
    def __init__(self, projects: ProjectRepository, activity: ActivityLogRepository) -> None:
        self._projects = projects
        self._activity = activity

    async def execute(self, data: CreateProjectInput) -> Project:
        project = Project(
            id=uuid4(), org_id=data.org_id, name=data.name, description=data.description,
            status=data.status, start_date=data.start_date, created_by=data.created_by,
            pic_user_id=data.pic_user_id or data.created_by,
            target_date=data.target_date, progress=0,
        )
        created = await self._projects.create(project)
        # #26: log cấp workspace (project_id=None để chỉ hiện ở nhật ký Overview,
        # không lẫn vào feed vận hành Dashboard — giống "deleted project").
        await self._activity.add(ActivityEntry(
            id=uuid4(), org_id=created.org_id, project_id=None, user_id=data.created_by,
            action="created project", target=created.name, created_at=None,
        ))
        return created


class UpdateProject:
    """Sửa metadata project — chỉ PIC (hiệu dụng)/superuser (#11)."""

    def __init__(self, projects: ProjectRepository, activity: ActivityLogRepository) -> None:
        self._projects = projects
        self._activity = activity

    async def execute(self, project_id: UUID, payload: dict[str, Any], actor: User) -> Project:
        project = await self._projects.get(project_id)
        if project is None:
            raise ProjectNotFoundError(str(project_id))
        if not can_edit_project(actor, project):
            raise ProjectForbiddenError(
                "Chỉ PIC (hoặc admin) mới được sửa dự án này"
            )
        old_name = project.name
        updated = await self._projects.update(_apply_updates(project, payload))
        # #26: đổi tên dự án là sự kiện cấp workspace → log vào nhật ký Overview
        # (project_id=None để không lẫn vào feed vận hành Dashboard).
        if "name" in payload and updated.name != old_name:
            await self._activity.add(ActivityEntry(
                id=uuid4(), org_id=updated.org_id, project_id=None, user_id=actor.id,
                action="renamed project", target=f"{old_name} → {updated.name}", created_at=None,
            ))
        return updated


class DeleteProject:
    """Xóa project — chỉ PIC (hiệu dụng)/superuser (#11). #14: ghi changelog cấp
    workspace (kèm lý do) trước khi xóa để bản ghi còn lại."""

    def __init__(
        self, projects: ProjectRepository, activity: ActivityLogRepository,
        blocks: PhaseBlockRepository, storage: ObjectStorage, attachments_bucket: str,
    ) -> None:
        self._projects = projects
        self._activity = activity
        self._blocks = blocks
        self._storage = storage
        self._bucket = attachments_bucket

    async def execute(self, project_id: UUID, actor: User, reason: str | None = None) -> None:
        project = await self._projects.get(project_id)
        if project is None:
            raise ProjectNotFoundError(str(project_id))
        if not can_edit_project(actor, project):
            raise ProjectForbiddenError(
                "Chỉ PIC (hoặc admin) mới được xóa dự án này"
            )
        target = f"{project.name} — lý do: {reason.strip()}" if reason and reason.strip() else project.name
        await self._activity.add(ActivityEntry(
            id=uuid4(), org_id=project.org_id, project_id=None, user_id=actor.id,
            action="deleted project", target=target, created_at=None,
        ))
        # #21: gom URL file của mọi phase trong dự án TRƯỚC khi xóa (cascade).
        file_urls = await self._blocks.file_attachment_urls_by_project(project_id)
        await self._projects.delete(project_id)
        await purge_object_urls(self._storage, self._bucket, file_urls)


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
