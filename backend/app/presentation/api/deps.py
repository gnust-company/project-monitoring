"""Dependency injection cho FastAPI — session → repository → use case,
xác thực JWT (get_current_user) và guard quyền workspace."""
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.authz import can_access_workspace, can_manage_workspace
from app.application.notifications import NotificationService
from app.application.use_cases.auth import (
    AuthenticateUser,
    GetSetupStatus,
    RegisterUser,
    SetupSuperuser,
)
from app.application.use_cases.change_requests import (
    ApproveChangeRequest,
    ListPendingChangeRequests,
    RejectChangeRequest,
)
from app.application.use_cases.organizations import (
    AddMember,
    CreateOrganization,
    DeleteOrganization,
    GetOrganization,
    ListOrganizations,
    RemoveMember,
    RenameOrganization,
)
from app.application.use_cases.phase_definitions import (
    CreatePhaseDef,
    DeletePhaseDef,
    ListPhaseDefs,
    ReorderPhaseDefs,
    UpdatePhaseDef,
)
from app.application.use_cases.workspace_roles import (
    AssignMemberRole,
    CreateRole,
    DeleteRole,
    ListRoles,
    ReorderRoles,
    UpdateRole,
)
from app.application.use_cases.announcements import (
    CreateAnnouncement,
    DeleteAnnouncement,
    DismissAnnouncement,
    ListActiveAnnouncements,
    ListAllAnnouncements,
    UpdateAnnouncement,
)
from app.application.use_cases.phase_blocks import (
    AddComment,
    AddPhaseItem,
    CreatePhaseBlock,
    DeletePhaseBlock,
    DeletePhaseItem,
    GetPhaseBlock,
    ListActivity,
    ListComments,
    ListPhaseBlocks,
    UpdatePhaseBlock,
    UpdatePhaseItem,
)
from app.application.use_cases.projects import (
    ChangeProjectPic,
    CreateProject,
    DeleteProject,
    GetProject,
    ListProjectsByOrg,
    ReorderProjects,
    UpdateProject,
)
from app.application.use_cases.admin import (
    DeleteUser,
    GetAdminStats,
    ListAllUsers,
    ListAllWorkspaces,
    ResetUserPassword,
    SetSuperuser,
)
from app.application.use_cases.attachments import (
    AddFileAttachment,
    AddLinkAttachment,
    DeleteAttachment,
    ListAttachments,
)
from app.application.use_cases.users import (
    ChangePassword,
    DeleteAccount,
    SetAvatar,
    UpdateProfile,
)
from app.core.config import get_settings
from app.core.security import decode_token, hash_password, verify_password
from app.domain.entities import Membership, Project, User
from app.infrastructure.db.session import get_session
from app.infrastructure.repositories.activity_log import SqlAlchemyActivityLogRepository
from app.infrastructure.repositories.announcements import SqlAlchemyAnnouncementRepository
from app.infrastructure.repositories.change_requests import SqlAlchemyChangeRequestRepository
from app.infrastructure.repositories.notifications import SqlAlchemyNotificationRepository
from app.infrastructure.repositories.organizations import SqlAlchemyOrganizationRepository
from app.infrastructure.repositories.phase_blocks import SqlAlchemyPhaseBlockRepository
from app.infrastructure.repositories.phase_definitions import SqlAlchemyPhaseDefinitionRepository
from app.infrastructure.repositories.workspace_roles import SqlAlchemyWorkspaceRoleRepository
from app.infrastructure.repositories.projects import SqlAlchemyProjectRepository
from app.infrastructure.repositories.users import SqlAlchemyUserRepository
from app.infrastructure.storage.minio_storage import MinioStorage

SessionDep = Annotated[AsyncSession, Depends(get_session)]


# ─── Repositories ────────────────────────────────────────────────────
def get_user_repo(session: SessionDep) -> SqlAlchemyUserRepository:
    return SqlAlchemyUserRepository(session)


def get_org_repo(session: SessionDep) -> SqlAlchemyOrganizationRepository:
    return SqlAlchemyOrganizationRepository(session)


def get_project_repo(session: SessionDep) -> SqlAlchemyProjectRepository:
    return SqlAlchemyProjectRepository(session)


def get_change_request_repo(session: SessionDep) -> SqlAlchemyChangeRequestRepository:
    return SqlAlchemyChangeRequestRepository(session)


def get_notification_repo(session: SessionDep) -> SqlAlchemyNotificationRepository:
    return SqlAlchemyNotificationRepository(session)


def get_block_repo(session: SessionDep) -> SqlAlchemyPhaseBlockRepository:
    return SqlAlchemyPhaseBlockRepository(session)


def get_activity_repo(session: SessionDep) -> SqlAlchemyActivityLogRepository:
    return SqlAlchemyActivityLogRepository(session)


def get_phase_def_repo(session: SessionDep) -> SqlAlchemyPhaseDefinitionRepository:
    return SqlAlchemyPhaseDefinitionRepository(session)


def get_role_repo(session: SessionDep) -> SqlAlchemyWorkspaceRoleRepository:
    return SqlAlchemyWorkspaceRoleRepository(session)


def get_announcement_repo(session: SessionDep) -> SqlAlchemyAnnouncementRepository:
    return SqlAlchemyAnnouncementRepository(session)


UserRepoDep = Annotated[SqlAlchemyUserRepository, Depends(get_user_repo)]
OrgRepoDep = Annotated[SqlAlchemyOrganizationRepository, Depends(get_org_repo)]
ProjectRepoDep = Annotated[SqlAlchemyProjectRepository, Depends(get_project_repo)]
ChangeRequestRepoDep = Annotated[SqlAlchemyChangeRequestRepository, Depends(get_change_request_repo)]
NotificationRepoDep = Annotated[SqlAlchemyNotificationRepository, Depends(get_notification_repo)]
BlockRepoDep = Annotated[SqlAlchemyPhaseBlockRepository, Depends(get_block_repo)]
ActivityRepoDep = Annotated[SqlAlchemyActivityLogRepository, Depends(get_activity_repo)]
PhaseDefRepoDep = Annotated[SqlAlchemyPhaseDefinitionRepository, Depends(get_phase_def_repo)]
RoleRepoDep = Annotated[SqlAlchemyWorkspaceRoleRepository, Depends(get_role_repo)]
AnnouncementRepoDep = Annotated[SqlAlchemyAnnouncementRepository, Depends(get_announcement_repo)]


# ─── Object storage (MinIO) ──────────────────────────────────────────
def get_storage() -> MinioStorage:
    return MinioStorage(get_settings())


StorageDep = Annotated[MinioStorage, Depends(get_storage)]


def _attachments_bucket() -> str:
    return get_settings().minio_bucket_attachments


def _avatars_bucket() -> str:
    return get_settings().minio_bucket_avatars


def get_notifier(repo: NotificationRepoDep) -> NotificationService:
    return NotificationService(repo)


NotifierDep = Annotated[NotificationService, Depends(get_notifier)]


# ─── Auth use cases ──────────────────────────────────────────────────
def _register_factory(repo: UserRepoDep) -> RegisterUser:
    """RegisterUser kèm allowlist domain từ cấu hình (#5)."""
    return RegisterUser(repo, hash_password, allowed_email_domains=get_settings().allowed_email_domain_list)


def register_user_uc(repo: UserRepoDep) -> RegisterUser:
    return _register_factory(repo)


def authenticate_user_uc(repo: UserRepoDep) -> AuthenticateUser:
    return AuthenticateUser(repo, verify_password)


def setup_status_uc(repo: UserRepoDep) -> GetSetupStatus:
    return GetSetupStatus(repo)


def setup_superuser_uc(repo: UserRepoDep) -> SetupSuperuser:
    return SetupSuperuser(repo, _register_factory(repo))


# ─── Current user (JWT) ──────────────────────────────────────────────
_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    repo: UserRepoDep,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_token(creds.credentials)
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    try:
        user = await repo.get(UUID(user_id))
    except ValueError:
        user = None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def require_superuser(current: CurrentUser) -> User:
    """Chỉ admin toàn cục (is_superuser) — cho khu vực /admin."""
    if not current.is_superuser:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Superuser permission required")
    return current


SuperuserDep = Annotated[User, Depends(require_superuser)]


# ─── Workspace access guards ─────────────────────────────────────────
@dataclass(slots=True)
class Access:
    user: User
    membership: Membership | None


async def workspace_access(org_id: UUID, current: CurrentUser, orgs: OrgRepoDep) -> Access:
    """User phải là member (hoặc superuser) của workspace."""
    membership = await orgs.get_membership(org_id, current.id)
    if not can_access_workspace(current, membership):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")
    return Access(current, membership)


async def workspace_manage(access: Annotated[Access, Depends(workspace_access)]) -> Access:
    """Chỉ owner/superuser (đổi tên/xóa workspace, quản lý thành viên)."""
    if not can_manage_workspace(access.user, access.membership):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Owner permission required")
    return access


AccessDep = Annotated[Access, Depends(workspace_access)]
ManageDep = Annotated[Access, Depends(workspace_manage)]


# ─── Organization use cases ──────────────────────────────────────────
def create_org_uc(repo: OrgRepoDep, phases: PhaseDefRepoDep, roles: RoleRepoDep) -> CreateOrganization:
    return CreateOrganization(repo, phases, roles)


def list_orgs_uc(repo: OrgRepoDep) -> ListOrganizations:
    return ListOrganizations(repo)


def get_org_uc(repo: OrgRepoDep) -> GetOrganization:
    return GetOrganization(repo)


def rename_org_uc(repo: OrgRepoDep) -> RenameOrganization:
    return RenameOrganization(repo)


def delete_org_uc(repo: OrgRepoDep, blocks: BlockRepoDep, storage: StorageDep) -> DeleteOrganization:
    return DeleteOrganization(repo, blocks, storage, _attachments_bucket())


def add_member_uc(repo: OrgRepoDep, users: UserRepoDep, notifier: NotifierDep) -> AddMember:
    return AddMember(repo, users, notifier)


def remove_member_uc(repo: OrgRepoDep, notifier: NotifierDep) -> RemoveMember:
    return RemoveMember(repo, notifier)


# ─── Project use cases ───────────────────────────────────────────────
def list_projects_uc(repo: ProjectRepoDep) -> ListProjectsByOrg:
    return ListProjectsByOrg(repo)


def reorder_projects_uc(repo: ProjectRepoDep) -> ReorderProjects:
    return ReorderProjects(repo)


def get_project_uc(repo: ProjectRepoDep) -> GetProject:
    return GetProject(repo)


def create_project_uc(repo: ProjectRepoDep, activity: ActivityRepoDep) -> CreateProject:
    return CreateProject(repo, activity)


def update_project_uc(repo: ProjectRepoDep, activity: ActivityRepoDep) -> UpdateProject:
    return UpdateProject(repo, activity)


def delete_project_uc(
    repo: ProjectRepoDep, activity: ActivityRepoDep, blocks: BlockRepoDep, storage: StorageDep
) -> DeleteProject:
    return DeleteProject(repo, activity, blocks, storage, _attachments_bucket())


def change_project_pic_uc(repo: ProjectRepoDep, notifier: NotifierDep) -> ChangeProjectPic:
    return ChangeProjectPic(repo, notifier)


# ─── Change request use cases ────────────────────────────────────────
def list_pending_crs_uc(repo: ChangeRequestRepoDep) -> ListPendingChangeRequests:
    return ListPendingChangeRequests(repo)


def approve_cr_uc(
    repo: ChangeRequestRepoDep, projects: ProjectRepoDep, notifier: NotifierDep
) -> ApproveChangeRequest:
    return ApproveChangeRequest(repo, projects, notifier)


def reject_cr_uc(repo: ChangeRequestRepoDep, notifier: NotifierDep) -> RejectChangeRequest:
    return RejectChangeRequest(repo, notifier)


# ─── Project / block scoped access guards ────────────────────────────
@dataclass(slots=True)
class ProjectAccess:
    user: User
    membership: Membership | None
    project: Project


async def project_access(
    project_id: UUID, current: CurrentUser, orgs: OrgRepoDep, projects: ProjectRepoDep
) -> ProjectAccess:
    project = await projects.get(project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    membership = await orgs.get_membership(project.org_id, current.id)
    if not can_access_workspace(current, membership):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")
    return ProjectAccess(current, membership, project)


async def block_access(
    block_id: UUID, current: CurrentUser, orgs: OrgRepoDep,
    projects: ProjectRepoDep, blocks: BlockRepoDep,
) -> ProjectAccess:
    project_id = await blocks.get_project_id(block_id)
    if project_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Phase block not found")
    return await project_access(project_id, current, orgs, projects)


ProjectAccessDep = Annotated[ProjectAccess, Depends(project_access)]
BlockAccessDep = Annotated[ProjectAccess, Depends(block_access)]


# ─── Phase block use cases ───────────────────────────────────────────
def create_block_uc(
    blocks: BlockRepoDep, phases: PhaseDefRepoDep, activity: ActivityRepoDep, notifier: NotifierDep
) -> CreatePhaseBlock:
    return CreatePhaseBlock(blocks, phases, activity, notifier)


def get_block_uc(blocks: BlockRepoDep) -> GetPhaseBlock:
    return GetPhaseBlock(blocks)


def list_blocks_uc(blocks: BlockRepoDep) -> ListPhaseBlocks:
    return ListPhaseBlocks(blocks)


def update_block_uc(
    blocks: BlockRepoDep, activity: ActivityRepoDep, notifier: NotifierDep
) -> UpdatePhaseBlock:
    return UpdatePhaseBlock(blocks, activity, notifier)


def delete_block_uc(blocks: BlockRepoDep, activity: ActivityRepoDep, storage: StorageDep) -> DeletePhaseBlock:
    return DeletePhaseBlock(blocks, activity, storage, _attachments_bucket())


def add_item_uc(blocks: BlockRepoDep, activity: ActivityRepoDep) -> AddPhaseItem:
    return AddPhaseItem(blocks, activity)


def update_item_uc(blocks: BlockRepoDep, activity: ActivityRepoDep) -> UpdatePhaseItem:
    return UpdatePhaseItem(blocks, activity)


def delete_item_uc(blocks: BlockRepoDep, activity: ActivityRepoDep) -> DeletePhaseItem:
    return DeletePhaseItem(blocks, activity)


def add_comment_uc(blocks: BlockRepoDep, notifier: NotifierDep, activity: ActivityRepoDep) -> AddComment:
    return AddComment(blocks, notifier, activity)


def list_comments_uc(blocks: BlockRepoDep) -> ListComments:
    return ListComments(blocks)


def list_activity_uc(activity: ActivityRepoDep) -> ListActivity:
    return ListActivity(activity)


# ─── Phase definition use cases (#26 mảng A) ─────────────────────────
def list_phase_defs_uc(phases: PhaseDefRepoDep) -> ListPhaseDefs:
    return ListPhaseDefs(phases)


def create_phase_def_uc(phases: PhaseDefRepoDep) -> CreatePhaseDef:
    return CreatePhaseDef(phases)


def update_phase_def_uc(phases: PhaseDefRepoDep) -> UpdatePhaseDef:
    return UpdatePhaseDef(phases)


def delete_phase_def_uc(phases: PhaseDefRepoDep) -> DeletePhaseDef:
    return DeletePhaseDef(phases)


def reorder_phase_defs_uc(phases: PhaseDefRepoDep) -> ReorderPhaseDefs:
    return ReorderPhaseDefs(phases)


# ─── Workspace role use cases (#26 mảng B) ───────────────────────────
def list_roles_uc(roles: RoleRepoDep) -> ListRoles:
    return ListRoles(roles)


def create_role_uc(roles: RoleRepoDep) -> CreateRole:
    return CreateRole(roles)


def update_role_uc(roles: RoleRepoDep) -> UpdateRole:
    return UpdateRole(roles)


def delete_role_uc(roles: RoleRepoDep) -> DeleteRole:
    return DeleteRole(roles)


def reorder_roles_uc(roles: RoleRepoDep) -> ReorderRoles:
    return ReorderRoles(roles)


def assign_member_role_uc(repo: OrgRepoDep, roles: RoleRepoDep) -> AssignMemberRole:
    return AssignMemberRole(repo, roles)


# ─── Announcement use cases (#27) ────────────────────────────────────
def list_all_announcements_uc(repo: AnnouncementRepoDep) -> ListAllAnnouncements:
    return ListAllAnnouncements(repo)


def list_active_announcements_uc(repo: AnnouncementRepoDep) -> ListActiveAnnouncements:
    return ListActiveAnnouncements(repo)


def create_announcement_uc(repo: AnnouncementRepoDep) -> CreateAnnouncement:
    return CreateAnnouncement(repo)


def update_announcement_uc(repo: AnnouncementRepoDep) -> UpdateAnnouncement:
    return UpdateAnnouncement(repo)


def delete_announcement_uc(repo: AnnouncementRepoDep) -> DeleteAnnouncement:
    return DeleteAnnouncement(repo)


def dismiss_announcement_uc(repo: AnnouncementRepoDep) -> DismissAnnouncement:
    return DismissAnnouncement(repo)


# ─── Attachment use cases ────────────────────────────────────────────
def list_attachments_uc(blocks: BlockRepoDep) -> ListAttachments:
    return ListAttachments(blocks)


def add_link_uc(blocks: BlockRepoDep, activity: ActivityRepoDep) -> AddLinkAttachment:
    return AddLinkAttachment(blocks, activity)


def add_file_uc(blocks: BlockRepoDep, storage: StorageDep, activity: ActivityRepoDep) -> AddFileAttachment:
    return AddFileAttachment(blocks, storage, _attachments_bucket(), activity)


def delete_attachment_uc(blocks: BlockRepoDep, storage: StorageDep, activity: ActivityRepoDep) -> DeleteAttachment:
    return DeleteAttachment(blocks, storage, _attachments_bucket(), activity)


# ─── User profile use cases ──────────────────────────────────────────
def update_profile_uc(repo: UserRepoDep) -> UpdateProfile:
    return UpdateProfile(repo)


def set_avatar_uc(repo: UserRepoDep, storage: StorageDep) -> SetAvatar:
    return SetAvatar(repo, storage, _avatars_bucket())


# ─── Admin use cases (superuser-only) ────────────────────────────────
def admin_stats_uc(
    users: UserRepoDep, orgs: OrgRepoDep, projects: ProjectRepoDep, blocks: BlockRepoDep
) -> GetAdminStats:
    return GetAdminStats(users, orgs, projects, blocks)


def list_all_users_uc(users: UserRepoDep, orgs: OrgRepoDep) -> ListAllUsers:
    return ListAllUsers(users, orgs)


def list_all_workspaces_uc(
    orgs: OrgRepoDep, projects: ProjectRepoDep, users: UserRepoDep
) -> ListAllWorkspaces:
    return ListAllWorkspaces(orgs, projects, users)


def reset_password_uc(users: UserRepoDep) -> ResetUserPassword:
    return ResetUserPassword(users, hash_password)


def set_superuser_uc(users: UserRepoDep) -> SetSuperuser:
    return SetSuperuser(users)


def delete_user_uc(users: UserRepoDep, storage: StorageDep) -> DeleteUser:
    return DeleteUser(users, storage, _avatars_bucket())


# ─── Profile self-service (issue #3) ─────────────────────────────────
def change_password_uc(repo: UserRepoDep) -> ChangePassword:
    return ChangePassword(repo, verify_password, hash_password)


def delete_account_uc(repo: UserRepoDep, storage: StorageDep) -> DeleteAccount:
    return DeleteAccount(repo, storage, _avatars_bucket())
