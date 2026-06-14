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
    CreateProject,
    DeleteProjectOrRequest,
    GetProject,
    ListProjectsByOrg,
    UpdateProjectOrRequest,
)
from app.application.use_cases.attachments import (
    AddFileAttachment,
    AddLinkAttachment,
    DeleteAttachment,
    ListAttachments,
)
from app.application.use_cases.templates import GetPhaseTasks
from app.application.use_cases.users import SetAvatar, UpdateProfile
from app.core.config import get_settings
from app.core.security import decode_token, hash_password, verify_password
from app.domain.entities import Membership, Project, User
from app.infrastructure.db.session import get_session
from app.infrastructure.repositories.activity_log import SqlAlchemyActivityLogRepository
from app.infrastructure.repositories.change_requests import SqlAlchemyChangeRequestRepository
from app.infrastructure.repositories.notifications import SqlAlchemyNotificationRepository
from app.infrastructure.repositories.organizations import SqlAlchemyOrganizationRepository
from app.infrastructure.repositories.phase_blocks import SqlAlchemyPhaseBlockRepository
from app.infrastructure.repositories.projects import SqlAlchemyProjectRepository
from app.infrastructure.repositories.templates import SqlAlchemyPhaseTaskTemplateRepository
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


def get_template_repo(session: SessionDep) -> SqlAlchemyPhaseTaskTemplateRepository:
    return SqlAlchemyPhaseTaskTemplateRepository(session)


UserRepoDep = Annotated[SqlAlchemyUserRepository, Depends(get_user_repo)]
OrgRepoDep = Annotated[SqlAlchemyOrganizationRepository, Depends(get_org_repo)]
ProjectRepoDep = Annotated[SqlAlchemyProjectRepository, Depends(get_project_repo)]
ChangeRequestRepoDep = Annotated[SqlAlchemyChangeRequestRepository, Depends(get_change_request_repo)]
NotificationRepoDep = Annotated[SqlAlchemyNotificationRepository, Depends(get_notification_repo)]
BlockRepoDep = Annotated[SqlAlchemyPhaseBlockRepository, Depends(get_block_repo)]
ActivityRepoDep = Annotated[SqlAlchemyActivityLogRepository, Depends(get_activity_repo)]
TemplateRepoDep = Annotated[SqlAlchemyPhaseTaskTemplateRepository, Depends(get_template_repo)]


def get_notifier(repo: NotificationRepoDep) -> NotificationService:
    return NotificationService(repo)


NotifierDep = Annotated[NotificationService, Depends(get_notifier)]


# ─── Auth use cases ──────────────────────────────────────────────────
def register_user_uc(repo: UserRepoDep) -> RegisterUser:
    return RegisterUser(repo, hash_password)


def authenticate_user_uc(repo: UserRepoDep) -> AuthenticateUser:
    return AuthenticateUser(repo, verify_password)


def setup_status_uc(repo: UserRepoDep) -> GetSetupStatus:
    return GetSetupStatus(repo)


def setup_superuser_uc(repo: UserRepoDep) -> SetupSuperuser:
    return SetupSuperuser(repo, RegisterUser(repo, hash_password))


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
def create_org_uc(repo: OrgRepoDep) -> CreateOrganization:
    return CreateOrganization(repo)


def list_orgs_uc(repo: OrgRepoDep) -> ListOrganizations:
    return ListOrganizations(repo)


def get_org_uc(repo: OrgRepoDep) -> GetOrganization:
    return GetOrganization(repo)


def rename_org_uc(repo: OrgRepoDep) -> RenameOrganization:
    return RenameOrganization(repo)


def delete_org_uc(repo: OrgRepoDep) -> DeleteOrganization:
    return DeleteOrganization(repo)


def add_member_uc(repo: OrgRepoDep, users: UserRepoDep, notifier: NotifierDep) -> AddMember:
    return AddMember(repo, users, notifier)


def remove_member_uc(repo: OrgRepoDep, notifier: NotifierDep) -> RemoveMember:
    return RemoveMember(repo, notifier)


# ─── Project use cases ───────────────────────────────────────────────
def list_projects_uc(repo: ProjectRepoDep) -> ListProjectsByOrg:
    return ListProjectsByOrg(repo)


def get_project_uc(repo: ProjectRepoDep) -> GetProject:
    return GetProject(repo)


def create_project_uc(repo: ProjectRepoDep) -> CreateProject:
    return CreateProject(repo)


def update_project_uc(
    repo: ProjectRepoDep, crs: ChangeRequestRepoDep, orgs: OrgRepoDep, notifier: NotifierDep
) -> UpdateProjectOrRequest:
    return UpdateProjectOrRequest(repo, crs, orgs, notifier)


def delete_project_uc(
    repo: ProjectRepoDep, crs: ChangeRequestRepoDep, orgs: OrgRepoDep, notifier: NotifierDep
) -> DeleteProjectOrRequest:
    return DeleteProjectOrRequest(repo, crs, orgs, notifier)


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
    blocks: BlockRepoDep, templates: TemplateRepoDep, activity: ActivityRepoDep, notifier: NotifierDep
) -> CreatePhaseBlock:
    return CreatePhaseBlock(blocks, templates, activity, notifier)


def get_block_uc(blocks: BlockRepoDep) -> GetPhaseBlock:
    return GetPhaseBlock(blocks)


def list_blocks_uc(blocks: BlockRepoDep) -> ListPhaseBlocks:
    return ListPhaseBlocks(blocks)


def update_block_uc(
    blocks: BlockRepoDep, activity: ActivityRepoDep, notifier: NotifierDep
) -> UpdatePhaseBlock:
    return UpdatePhaseBlock(blocks, activity, notifier)


def delete_block_uc(blocks: BlockRepoDep, activity: ActivityRepoDep) -> DeletePhaseBlock:
    return DeletePhaseBlock(blocks, activity)


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


def get_phase_tasks_uc(templates: TemplateRepoDep) -> GetPhaseTasks:
    return GetPhaseTasks(templates)


# ─── Object storage (MinIO) ──────────────────────────────────────────
def get_storage() -> MinioStorage:
    return MinioStorage(get_settings())


StorageDep = Annotated[MinioStorage, Depends(get_storage)]


def _attachments_bucket() -> str:
    return get_settings().minio_bucket_attachments


def _avatars_bucket() -> str:
    return get_settings().minio_bucket_avatars


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
