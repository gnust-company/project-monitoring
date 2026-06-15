"""Use cases cho khu vực quản trị (chỉ superuser) — thống kê toàn hệ thống,
liệt kê user/workspace kèm số liệu, và reset mật khẩu user.

Use case không biết bcrypt: hàm hash được tiêm vào (giữ domain/application sạch).
"""
from collections.abc import Callable
from dataclasses import dataclass, field
from uuid import UUID

from app.application.ports import (
    OrganizationRepository,
    PhaseBlockRepository,
    ProjectRepository,
    UserRepository,
)
from app.domain.entities import Organization, User
from app.domain.value_objects import WorkspaceRole


class UserNotFoundError(Exception):
    pass


class CannotModifySelfError(Exception):
    """Admin không được tự đổi quyền superuser của chính mình (tránh tự khóa)."""
    pass


@dataclass(slots=True)
class AdminStats:
    user_count: int
    superuser_count: int
    workspace_count: int
    project_count: int
    phase_block_count: int


@dataclass(slots=True)
class AdminUserInfo:
    user: User
    workspace_count: int  # số workspace user tham gia


@dataclass(slots=True)
class AdminWorkspaceInfo:
    org: Organization
    member_count: int
    project_count: int
    owners: list[User] = field(default_factory=list)


class GetAdminStats:
    def __init__(
        self,
        users: UserRepository,
        orgs: OrganizationRepository,
        projects: ProjectRepository,
        blocks: PhaseBlockRepository,
    ) -> None:
        self._users = users
        self._orgs = orgs
        self._projects = projects
        self._blocks = blocks

    async def execute(self) -> AdminStats:
        all_users = await self._users.list_all()
        return AdminStats(
            user_count=len(all_users),
            superuser_count=sum(1 for u in all_users if u.is_superuser),
            workspace_count=len(await self._orgs.list_all()),
            project_count=await self._projects.count_all(),
            phase_block_count=await self._blocks.count_all(),
        )


class ListAllUsers:
    def __init__(self, users: UserRepository, orgs: OrganizationRepository) -> None:
        self._users = users
        self._orgs = orgs

    async def execute(self) -> list[AdminUserInfo]:
        users = await self._users.list_all()
        memberships = await self._orgs.list_all_memberships()
        ws_count: dict[UUID, int] = {}
        for m in memberships:
            ws_count[m.user_id] = ws_count.get(m.user_id, 0) + 1
        return [AdminUserInfo(user=u, workspace_count=ws_count.get(u.id, 0)) for u in users]


class ListAllWorkspaces:
    def __init__(
        self, orgs: OrganizationRepository, projects: ProjectRepository, users: UserRepository
    ) -> None:
        self._orgs = orgs
        self._projects = projects
        self._users = users

    async def execute(self) -> list[AdminWorkspaceInfo]:
        orgs = await self._orgs.list_all()
        memberships = await self._orgs.list_all_memberships()
        project_counts = await self._projects.count_by_org()
        users_by_id = {u.id: u for u in await self._users.list_all()}

        owner_ids: dict[UUID, list[UUID]] = {}
        for m in memberships:
            if m.role == WorkspaceRole.OWNER:
                owner_ids.setdefault(m.org_id, []).append(m.user_id)

        return [
            AdminWorkspaceInfo(
                org=o,
                member_count=len(o.member_ids),
                project_count=project_counts.get(o.id, 0),
                owners=[users_by_id[uid] for uid in owner_ids.get(o.id, []) if uid in users_by_id],
            )
            for o in orgs
        ]


class ResetUserPassword:
    """Đặt lại mật khẩu cho 1 user (thao tác nhạy cảm — FE phải confirm trước)."""

    def __init__(self, users: UserRepository, hasher: Callable[[str], str]) -> None:
        self._users = users
        self._hash = hasher

    async def execute(self, user_id: UUID, new_password: str) -> None:
        if not await self._users.set_password(user_id, self._hash(new_password)):
            raise UserNotFoundError(str(user_id))


class SetSuperuser:
    """Cấp hoặc thu hồi quyền admin toàn cục cho 1 user.

    Chặn việc tự đổi quyền của chính mình → luôn còn ít nhất 1 superuser
    (người đang thao tác) và admin không tự khóa nhầm.
    """

    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self, acting_user_id: UUID, target_user_id: UUID, value: bool) -> None:
        if acting_user_id == target_user_id:
            raise CannotModifySelfError()
        if not await self._users.set_superuser(target_user_id, value):
            raise UserNotFoundError(str(target_user_id))
