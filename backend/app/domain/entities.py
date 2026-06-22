"""Domain entities — dataclasses thuần Python, không phụ thuộc ORM/framework.

Đây là "ngôn ngữ chung" của toàn hệ thống; application layer chỉ thao tác
trên các entity này thông qua ports.
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from uuid import UUID

from typing import Any

from app.domain.value_objects import (
    AttachmentKind,
    ChangeRequestAction,
    ChangeRequestStatus,
    PhaseItemKind,
    PhaseTag,
    ProjectStatus,
    WorkspaceRole,
)


@dataclass(slots=True)
class User:
    id: UUID
    email: str
    name: str
    avatar_url: str | None = None
    is_superuser: bool = False
    created_at: datetime | None = None


@dataclass(slots=True)
class Membership:
    """Quan hệ user ↔ workspace. `role` = cấp quyền (owner/member);
    `job_role` (#26 mảng B) = code role công việc trong workspace (per-org, tùy biến)."""
    user_id: UUID
    org_id: UUID
    role: WorkspaceRole = WorkspaceRole.MEMBER
    job_role: str | None = None
    joined_at: datetime | None = None


@dataclass(slots=True)
class WorkspaceRoleDef:
    """#26 (mảng B): định nghĩa role công việc theo workspace (thay enum UserRole toàn cục).

    `code` duy nhất trong org; membership.job_role + phase item.role tham chiếu code này.
    """
    id: UUID
    org_id: UUID
    code: str
    name: str
    color: str = "gray"  # khóa palette — hiển thị màu role ở view Nhóm + badge
    position: int = 0
    created_at: datetime | None = None


@dataclass(slots=True)
class Organization:
    id: UUID
    name: str
    description: str = ""  # #26: mô tả workspace
    member_ids: list[UUID] = field(default_factory=list)
    created_at: datetime | None = None


@dataclass(slots=True)
class Project:
    id: UUID
    org_id: UUID
    name: str
    description: str
    status: ProjectStatus
    start_date: date
    created_by: UUID | None  # SET NULL khi người tạo bị xóa (#21 audit)
    # #11: PIC (person-in-charge). Mặc định = created_by; chủ workspace/PIC có thể đổi.
    pic_user_id: UUID | None = None
    # #20: dự án không bắt buộc có ngày kết thúc.
    target_date: date | None = None
    progress: int = 0  # 0-100
    created_at: datetime | None = None

    @property
    def effective_pic(self) -> UUID | None:
        """PIC hiệu dụng = pic_user_id nếu có, không thì người tạo."""
        return self.pic_user_id or self.created_by


@dataclass(slots=True)
class PhaseItem:
    """Một dòng checklist hoặc outcome trong phase, gắn với role (code workspace role, tùy chọn)."""
    id: UUID
    kind: PhaseItemKind
    text: str
    done: bool = False
    role: str | None = None  # #26 mảng B: code workspace role (trước đây UserRole enum)
    position: int = 0


@dataclass(slots=True)
class Comment:
    id: UUID
    author_id: UUID | None  # SET NULL khi tác giả bị xóa (#21 audit)
    content: str
    created_at: datetime


@dataclass(slots=True)
class Attachment:
    id: UUID
    kind: AttachmentKind
    file_name: str
    url: str
    # #9: gắn với 1 outcome item (None = đính kèm cấp phase).
    outcome_item_id: UUID | None = None
    uploaded_by: UUID | None = None
    uploaded_at: datetime | None = None


@dataclass(slots=True)
class ActivityEntry:
    """Một dòng nhật ký. #14: org_id cho sự kiện cấp workspace (xóa dự án) — khi đó
    project_id=None. phase_block_id NULL với sự kiện cấp dự án (tạo/xóa phase)."""
    id: UUID
    user_id: UUID
    action: str
    target: str
    created_at: datetime | None = None
    project_id: UUID | None = None
    org_id: UUID | None = None
    phase_block_id: UUID | None = None


@dataclass(slots=True)
class PhaseDefinitionItem:
    """#26 (mảng A): 1 dòng checklist/outcome mặc định của 1 phase definition."""
    id: UUID
    kind: PhaseItemKind
    text: str
    role: str | None = None  # #26 mảng B: code workspace role
    position: int = 0


@dataclass(slots=True)
class PhaseDefinition:
    """#26 (mảng A): định nghĩa phase theo từng workspace (thay enum DevPhase cứng).

    `code` là khóa ngắn duy nhất trong org (vd "PA"); phase_blocks.phase_type lưu code này.
    """
    id: UUID
    org_id: UUID
    code: str
    name: str
    full_name: str = ""
    description: str = ""
    color: str = "gray"  # khóa palette (FE map sang class Tailwind)
    position: int = 0
    items: list[PhaseDefinitionItem] = field(default_factory=list)
    created_at: datetime | None = None


@dataclass(slots=True)
class PhaseBlock:
    """Aggregate root của một phase block trên timeline."""
    id: UUID
    project_id: UUID
    phase_type: str  # #26: code của phase definition (per-org), không còn enum cứng
    tag: PhaseTag
    title: str
    description: str
    start_date: date
    end_date: date
    created_by: UUID | None  # SET NULL khi người tạo bị xóa (#21 audit)
    # #13: assignee giờ chỉ là "note" (không tác dụng quyền). PIC phase = created_by.
    assignee: UUID | None = None
    actual_end_date: date | None = None
    display_row: int | None = None  # hàng hiển thị trên timeline (FE quản lý)
    participant_ids: list[UUID] = field(default_factory=list)
    items: list[PhaseItem] = field(default_factory=list)  # checklist + outcomes
    comments: list[Comment] = field(default_factory=list)
    attachments: list[Attachment] = field(default_factory=list)
    activity_log: list[ActivityEntry] = field(default_factory=list)

    @property
    def progress_pct(self) -> int:
        """Tiến độ phase = % item hoàn thành, gộp checklist + outcomes (#8)."""
        items = [
            i for i in self.items
            if i.kind in (PhaseItemKind.CHECKLIST, PhaseItemKind.OUTCOME)
        ]
        if not items:
            return 0
        return round(sum(1 for i in items if i.done) / len(items) * 100)


@dataclass(slots=True)
class ChangeRequest:
    """Yêu cầu thay đổi (sửa/xóa dự án) do member tạo, chờ owner duyệt."""
    id: UUID
    org_id: UUID
    project_id: UUID
    requested_by: UUID
    action: ChangeRequestAction
    payload: dict[str, Any]  # nội dung thay đổi đề xuất (rỗng nếu là delete)
    status: ChangeRequestStatus = ChangeRequestStatus.PENDING
    reviewed_by: UUID | None = None
    created_at: datetime | None = None
    resolved_at: datetime | None = None


@dataclass(slots=True)
class Notification:
    """Thông báo in-app gửi tới một user."""
    id: UUID
    user_id: UUID
    type: str
    title: str
    body: str = ""
    org_id: UUID | None = None
    project_id: UUID | None = None
    phase_block_id: UUID | None = None
    change_request_id: UUID | None = None
    read: bool = False
    created_at: datetime | None = None
