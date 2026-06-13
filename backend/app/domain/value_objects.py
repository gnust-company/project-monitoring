"""Value objects — enums dùng chung toàn hệ thống.

Khớp 1-1 với frontend/src/types.ts và docs/SCHEMA.md.
Tầng domain: không import framework/DB.
"""
from enum import StrEnum


class UserRole(StrEnum):
    PM = "PM"
    BA = "BA"
    SW_ARCHITECT = "SW_Architect"
    SYSOPS = "SysOps"
    UI_DESIGNER = "UI_Designer"
    GUI = "GUI"
    SW_DEVELOPER = "SW_Developer"
    SW_TESTER = "SW_Tester"


class DevPhase(StrEnum):
    """7 phase chuẩn của quy trình phát triển phần mềm."""
    PA = "PA"    # Project Assessment
    SA = "SA"    # Software Analysis
    SD = "SD"    # Software Design
    SI = "SI"    # Software Implementation
    ST = "ST"    # Software Testing
    DEP = "DEP"  # Software Deployment
    OM = "OM"    # Operation & Maintenance


class PhaseTag(StrEnum):
    BACKLOG = "Backlog"
    TODO = "Todo"
    IN_PROGRESS = "Inprogress"
    COMPLETE = "Complete"
    CANCELED = "Canceled"


class ProjectStatus(StrEnum):
    ON_TRACK = "On Track"
    AT_RISK = "At Risk"
    DELAYED = "Delayed"


class AttachmentKind(StrEnum):
    FILE = "file"
    LINK = "link"


class PhaseItemKind(StrEnum):
    """phase_items.kind — checklist (đầu việc) hoặc outcome (sản phẩm bàn giao)."""
    CHECKLIST = "checklist"
    OUTCOME = "outcome"


class WorkspaceRole(StrEnum):
    """Cấp quyền trong workspace — độc lập với UserRole (vai trò công việc).

    owner  = người tạo workspace, toàn quyền với workspace và artifact bên trong.
    member = tham gia bình thường; không sửa được workspace, sửa/xóa dự án phải
             được owner duyệt (xem ChangeRequest).
    """
    OWNER = "owner"
    MEMBER = "member"


class ChangeRequestAction(StrEnum):
    """Hành động member yêu cầu owner duyệt."""
    UPDATE_PROJECT = "update_project"
    DELETE_PROJECT = "delete_project"


class ChangeRequestStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class NotificationType(StrEnum):
    """Loại sự kiện sinh thông báo. Lưu DB dạng VARCHAR để mở rộng tự do."""
    MEMBER_ADDED = "member_added"
    MEMBER_REMOVED = "member_removed"
    PHASE_ASSIGNED = "phase_assigned"
    PHASE_CREATED = "phase_created"
    PHASE_UPDATED = "phase_updated"
    PHASE_DELETED = "phase_deleted"
    COMMENT_ADDED = "comment_added"
    CHANGE_REQUEST_CREATED = "change_request_created"
    CHANGE_REQUEST_APPROVED = "change_request_approved"
    CHANGE_REQUEST_REJECTED = "change_request_rejected"
