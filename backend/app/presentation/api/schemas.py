"""Pydantic DTOs — JSON shape khớp docs/API_CONTRACT.md (camelCase).

DTO chỉ sống ở tầng presentation; chuyển đổi sang/từ domain entity tại router.
"""
from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel

from app.domain.entities import User
from app.domain.value_objects import (
    ChangeRequestAction,
    ChangeRequestStatus,
    DevPhase,
    PhaseItemKind,
    PhaseTag,
    ProjectStatus,
    UserRole,
)


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ─── Auth & User ─────────────────────────────────────────────────────
class UserOut(CamelModel):
    id: UUID
    email: str
    name: str
    role: UserRole
    avatar: str | None = None      # map từ domain.avatar_url
    is_superuser: bool = False

    @classmethod
    def from_entity(cls, u: User) -> "UserOut":
        return cls(
            id=u.id, email=u.email, name=u.name, role=u.role,
            avatar=u.avatar_url, is_superuser=u.is_superuser,
        )


class RegisterIn(CamelModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=255)
    role: UserRole


class LoginIn(CamelModel):
    email: EmailStr
    password: str


class TokenOut(CamelModel):
    access_token: str
    user: UserOut


class SetupStatusOut(CamelModel):
    needs_setup: bool


class ProfileUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    role: UserRole | None = None


# ─── Admin (superuser-only) ──────────────────────────────────────────
class AdminStatsOut(CamelModel):
    user_count: int
    superuser_count: int
    workspace_count: int
    project_count: int
    phase_block_count: int


class AdminUserOut(CamelModel):
    id: UUID
    email: str
    name: str
    role: UserRole
    avatar: str | None = None
    is_superuser: bool = False
    created_at: datetime | None = None
    workspace_count: int = 0


class AdminWorkspaceOut(CamelModel):
    id: UUID
    name: str
    created_at: datetime | None = None
    member_count: int = 0
    project_count: int = 0
    owners: list[UserOut] = []


class ResetPasswordIn(CamelModel):
    new_password: str = Field(min_length=6, max_length=128)


class SetSuperuserIn(CamelModel):
    is_superuser: bool


class PasswordChange(CamelModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)



# ─── Organizations / Workspace ───────────────────────────────────────
class OrganizationOut(CamelModel):
    id: UUID
    name: str
    members: list[UserOut] = []
    my_role: str | None = None  # cấp quyền của user hiện tại trong workspace (owner|member)


class OrgCreate(CamelModel):
    name: str = Field(min_length=1, max_length=255)


class OrgRename(CamelModel):
    name: str = Field(min_length=1, max_length=255)


class MemberAdd(CamelModel):
    email: EmailStr


# ─── Change requests (approval queue) ────────────────────────────────
class ChangeRequestOut(CamelModel):
    id: UUID
    org_id: UUID
    project_id: UUID
    requested_by: UUID | None = None
    action: ChangeRequestAction
    payload: dict[str, Any] = {}
    status: ChangeRequestStatus
    reviewed_by: UUID | None = None
    created_at: datetime | None = None
    resolved_at: datetime | None = None


# ─── Notifications ───────────────────────────────────────────────────
class NotificationOut(CamelModel):
    id: UUID
    type: str
    title: str
    body: str = ""
    org_id: UUID | None = None
    project_id: UUID | None = None
    phase_block_id: UUID | None = None
    change_request_id: UUID | None = None
    read: bool = False
    created_at: datetime | None = None


class UnreadCountOut(CamelModel):
    count: int


# ─── Project ─────────────────────────────────────────────────────────
class ProjectOut(CamelModel):
    id: UUID
    org_id: UUID
    name: str
    description: str
    status: ProjectStatus
    start_date: date
    target_date: date | None = None  # #20: optional
    progress: int
    created_by: UUID
    pic_user_id: UUID | None = None  # #11: PIC (mặc định = created_by)
    created_at: datetime | None = None


class ProjectCreate(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""
    start_date: date
    target_date: date | None = None  # #20: không bắt buộc
    status: ProjectStatus = ProjectStatus.ON_TRACK


class ProjectUpdate(CamelModel):
    name: str | None = None
    description: str | None = None
    status: ProjectStatus | None = None
    start_date: date | None = None
    target_date: date | None = None  # #20: None = xóa ngày kết thúc
    progress: int | None = Field(default=None, ge=0, le=100)


class ProjectPicUpdate(CamelModel):
    """Đổi PIC project (#11)."""
    pic_user_id: UUID


# ─── Phase items ─────────────────────────────────────────────────────
class PhaseItemOut(CamelModel):
    id: UUID
    text: str
    done: bool
    role: UserRole | None = None


class PhaseItemCreate(CamelModel):
    kind: PhaseItemKind
    text: str = Field(min_length=1)
    role: UserRole | None = None


class PhaseItemUpdate(CamelModel):
    text: str | None = None
    done: bool | None = None
    role: UserRole | None = None
    position: int | None = None


class PhaseItemSeed(CamelModel):
    """Item gửi kèm khi tạo phase (FE chủ động thay vì để BE seed từ template)."""
    text: str
    role: UserRole | None = None
    done: bool = False


# ─── Comments ────────────────────────────────────────────────────────
class CommentOut(CamelModel):
    id: UUID
    author_id: UUID | None = None
    content: str
    created_at: datetime | None = None


class CommentCreate(CamelModel):
    content: str = Field(min_length=1)


# ─── Attachments ─────────────────────────────────────────────────────
class AttachmentOut(CamelModel):
    id: UUID
    kind: str
    file_name: str
    url: str
    uploaded_by: UUID | None = None
    uploaded_at: datetime | None = None


class LinkAttachmentCreate(CamelModel):
    kind: str = "link"
    file_name: str = Field(min_length=1)
    url: str = Field(min_length=1)


# ─── Activity (changelog) ────────────────────────────────────────────
class ActivityOut(CamelModel):
    id: UUID
    project_id: UUID
    phase_block_id: UUID | None = None
    user_id: UUID | None = None
    action: str
    target: str = ""
    created_at: datetime | None = None


# ─── Phase blocks ────────────────────────────────────────────────────
class PhaseBlockOut(CamelModel):
    id: UUID
    project_id: UUID
    phase_type: DevPhase
    tag: PhaseTag
    title: str
    description: str
    start_date: date
    end_date: date
    actual_end_date: date | None = None
    display_row: int | None = None
    created_by: UUID
    assignee: UUID | None = None  # #13: chỉ là note; PIC phase = created_by
    participant_ids: list[UUID] = []
    progress_pct: int = 0
    checklist: list[PhaseItemOut] = []
    outcomes: list[PhaseItemOut] = []
    # đầy đủ chỉ ở endpoint detail
    comments: list[CommentOut] | None = None
    attachments: list[AttachmentOut] | None = None

    @classmethod
    def from_entity(cls, b, *, full: bool = False) -> "PhaseBlockOut":
        checklist = [PhaseItemOut.model_validate(i) for i in b.items
                     if i.kind == PhaseItemKind.CHECKLIST]
        outcomes = [PhaseItemOut.model_validate(i) for i in b.items
                    if i.kind == PhaseItemKind.OUTCOME]
        return cls(
            id=b.id, project_id=b.project_id, phase_type=b.phase_type, tag=b.tag,
            title=b.title, description=b.description, start_date=b.start_date, end_date=b.end_date,
            actual_end_date=b.actual_end_date, display_row=b.display_row, created_by=b.created_by,
            assignee=b.assignee, participant_ids=b.participant_ids, progress_pct=b.progress_pct,
            checklist=checklist, outcomes=outcomes,
            comments=[CommentOut.model_validate(c) for c in b.comments] if full else None,
            attachments=[AttachmentOut.model_validate(a) for a in b.attachments] if full else None,
        )


class PhaseBlockCreate(CamelModel):
    phase_type: DevPhase
    title: str = Field(min_length=1, max_length=255)
    start_date: date
    end_date: date
    tag: PhaseTag = PhaseTag.TODO
    description: str = ""
    assignee: UUID | None = None
    actual_end_date: date | None = None
    display_row: int | None = None
    participant_ids: list[UUID] = []
    checklist: list[PhaseItemSeed] | None = None
    outcomes: list[PhaseItemSeed] | None = None


class PhaseBlockUpdate(CamelModel):
    title: str | None = None
    description: str | None = None
    tag: PhaseTag | None = None
    phase_type: DevPhase | None = None
    start_date: date | None = None
    end_date: date | None = None
    actual_end_date: date | None = None
    display_row: int | None = None
    assignee: UUID | None = None
    participant_ids: list[UUID] | None = None
