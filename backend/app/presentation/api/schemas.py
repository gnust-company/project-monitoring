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
    PhaseItemKind,
    PhaseTag,
    ProjectStatus,
)


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ─── Auth & User ─────────────────────────────────────────────────────
class UserOut(CamelModel):
    id: UUID
    email: str
    name: str
    avatar: str | None = None      # map từ domain.avatar_url
    is_superuser: bool = False
    job_role: str | None = None    # #26 mảng B: code role công việc trong workspace (khi list theo org)

    @classmethod
    def from_entity(cls, u: User, job_role: str | None = None) -> "UserOut":
        return cls(
            id=u.id, email=u.email, name=u.name,
            avatar=u.avatar_url, is_superuser=u.is_superuser, job_role=job_role,
        )


class RegisterIn(CamelModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=255)


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
    description: str = ""  # #26: mô tả workspace
    members: list[UserOut] = []
    my_role: str | None = None  # cấp quyền của user hiện tại trong workspace (owner|member)


class OrgCreate(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""  # #26


class OrgRename(CamelModel):
    # #26: PATCH cập nhật name và/hoặc description (gửi field nào cập nhật field đó).
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None


class MemberAdd(CamelModel):
    email: EmailStr


# ─── Workspace roles (#26 mảng B — role công việc per-workspace) ──────
class WorkspaceRoleOut(CamelModel):
    id: UUID
    org_id: UUID
    code: str
    name: str
    color: str = "gray"
    position: int = 0


class RoleCreate(CamelModel):
    code: str | None = Field(default=None, max_length=32)
    name: str = Field(min_length=1, max_length=255)
    color: str | None = Field(default=None, max_length=32)


class RoleUpdate(CamelModel):
    code: str | None = Field(default=None, max_length=32)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    color: str | None = Field(default=None, max_length=32)
    position: int | None = None


class RoleReorderIn(CamelModel):
    ordered_ids: list[UUID]


class MemberRoleUpdate(CamelModel):
    role: str | None = None  # code workspace role (None = bỏ role)


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


# ─── Announcement (#27) ──────────────────────────────────────────────
class AnnouncementOut(CamelModel):
    id: UUID
    title: str
    body: str = ""
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    created_by: UUID | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AnnouncementCreate(CamelModel):
    title: str
    body: str = ""
    starts_at: datetime
    ends_at: datetime


class AnnouncementUpdate(CamelModel):
    title: str | None = None
    body: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class AnnouncementDismissIn(CamelModel):
    scope: str  # 'day' | 'week'


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
    created_by: UUID | None = None  # SET NULL khi người tạo bị xóa (#21 audit)
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
    role: str | None = None  # #26 mảng B: code workspace role


class PhaseItemCreate(CamelModel):
    kind: PhaseItemKind
    text: str = Field(min_length=1)
    role: str | None = None  # #26 mảng B: code workspace role


class PhaseItemUpdate(CamelModel):
    text: str | None = None
    done: bool | None = None
    role: str | None = None  # #26 mảng B: code workspace role
    position: int | None = None


class PhaseItemSeed(CamelModel):
    """Item gửi kèm khi tạo phase (FE chủ động thay vì để BE seed từ template)."""
    text: str
    role: str | None = None  # #26 mảng B: code workspace role
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
    outcome_item_id: UUID | None = None
    uploaded_by: UUID | None = None
    uploaded_at: datetime | None = None


class LinkAttachmentCreate(CamelModel):
    kind: str = "link"
    file_name: str = Field(min_length=1)
    url: str = Field(min_length=1)
    outcome_item_id: UUID | None = None


# ─── Activity (changelog) ────────────────────────────────────────────
class ActivityOut(CamelModel):
    id: UUID
    project_id: UUID | None = None  # #26: None với sự kiện cấp workspace (dự án đã bị xóa)
    phase_block_id: UUID | None = None
    user_id: UUID | None = None
    action: str
    target: str = ""
    created_at: datetime | None = None


# ─── Phase definitions (#26 mảng A — phase động per-workspace) ────────
class PhaseDefItemOut(CamelModel):
    id: UUID
    kind: PhaseItemKind
    text: str
    role: str | None = None  # #26 mảng B: code workspace role
    position: int = 0


class PhaseDefinitionOut(CamelModel):
    id: UUID
    org_id: UUID
    code: str
    name: str
    full_name: str = ""
    description: str = ""
    color: str = "gray"
    position: int = 0
    checklist: list[PhaseDefItemOut] = []
    outcomes: list[PhaseDefItemOut] = []

    @classmethod
    def from_entity(cls, p) -> "PhaseDefinitionOut":
        chk = [PhaseDefItemOut.model_validate(i) for i in p.items if i.kind == PhaseItemKind.CHECKLIST]
        out = [PhaseDefItemOut.model_validate(i) for i in p.items if i.kind == PhaseItemKind.OUTCOME]
        return cls(
            id=p.id, org_id=p.org_id, code=p.code, name=p.name, full_name=p.full_name,
            description=p.description, color=p.color, position=p.position,
            checklist=chk, outcomes=out,
        )


class PhaseDefItemIn(CamelModel):
    text: str = Field(min_length=1)
    role: str | None = None  # #26 mảng B: code workspace role


class PhaseDefCreate(CamelModel):
    code: str | None = Field(default=None, max_length=32)
    name: str = Field(min_length=1, max_length=255)
    full_name: str = ""
    description: str = ""
    color: str = "gray"
    checklist: list[PhaseDefItemIn] = []
    outcomes: list[PhaseDefItemIn] = []


class PhaseDefUpdate(CamelModel):
    code: str | None = Field(default=None, max_length=32)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    full_name: str | None = None
    description: str | None = None
    color: str | None = None
    position: int | None = None
    checklist: list[PhaseDefItemIn] | None = None
    outcomes: list[PhaseDefItemIn] | None = None


class PhaseReorderIn(CamelModel):
    ordered_ids: list[UUID]


# ─── Phase blocks ────────────────────────────────────────────────────
class PhaseBlockOut(CamelModel):
    id: UUID
    project_id: UUID
    phase_type: str  # #26: code của phase definition (per-org)
    tag: PhaseTag
    title: str
    description: str
    start_date: date
    end_date: date
    actual_end_date: date | None = None
    display_row: int | None = None
    created_by: UUID | None = None  # SET NULL khi người tạo bị xóa (#21 audit)
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
    phase_type: str = Field(min_length=1, max_length=32)
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
    phase_type: str | None = Field(default=None, max_length=32)
    start_date: date | None = None
    end_date: date | None = None
    actual_end_date: date | None = None
    display_row: int | None = None
    assignee: UUID | None = None
    participant_ids: list[UUID] | None = None
