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
