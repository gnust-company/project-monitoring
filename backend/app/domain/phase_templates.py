"""Checklist/outcome mặc định theo (phase, role) — port 1-1 từ
frontend/src/types.ts (PHASE_ROLE_TASKS / PHASE_ROLE_OUTCOMES).

Là nguồn sự thật để: (a) seed bảng phase_task_templates, (b) sinh items khi tạo
phase nếu FE không gửi checklist/outcomes. Giữ khớp với FE để dữ liệu nhất quán.
"""
from collections.abc import Iterator

from app.domain.value_objects import DevPhase, PhaseItemKind, UserRole

# (role, [tasks...]) cho từng phase
PHASE_ROLE_TASKS: dict[DevPhase, list[tuple[UserRole, list[str]]]] = {
    DevPhase.PA: [
        (UserRole.PM, ["Define goals and objectives", "Check feasibilities", "Produce Feasibility Report"]),
        (UserRole.BA, ["Elicit requirements", "Produce BRD (Need Assessment)"]),
    ],
    DevPhase.SA: [
        (UserRole.PM, ["Define project scope", "Create WBS", "Create risk management plan", "Produce Project Charter"]),
        (UserRole.BA, ["Elicit & analyze requirements"]),
        (UserRole.SYSOPS, ["Estimate server config"]),
    ],
    DevPhase.SD: [
        (UserRole.UI_DESIGNER, ["Design wireframes"]),
        (UserRole.GUI, ["Design UI (GUI)"]),
        (UserRole.SW_ARCHITECT, ["Create HLD", "Create Detailed Design"]),
        (UserRole.BA, ["Produce SRS", "Document requirements"]),
    ],
    DevPhase.SI: [
        (UserRole.SW_DEVELOPER, ["Develop source code", "Guarantee SW quality", "Guarantee OSL legal", "Manage change requests"]),
        (UserRole.SW_TESTER, ["Design system test cases"]),
        (UserRole.SYSOPS, ["Setup STG infra"]),
    ],
    DevPhase.ST: [
        (UserRole.SW_TESTER, ["Conduct system test", "Performance testing", "Create test report", "Support UAT"]),
        (UserRole.SYSOPS, ["Security verification"]),
        (UserRole.SW_DEVELOPER, ["OSL verification"]),
    ],
    DevPhase.DEP: [
        (UserRole.SYSOPS, ["Prepare deployment version", "Make deployment schedule", "Security check"]),
        (UserRole.PM, ["Confirm Go-live", "Verify PII regulation"]),
        (UserRole.BA, ["Create user guide"]),
    ],
    DevPhase.OM: [
        (UserRole.SYSOPS, ["Monitor system", "Handle PRD incidents", "Fix security vulnerabilities", "Self-conduct security audit"]),
        (UserRole.PM, ["Produce incident log", "RCA reports"]),
    ],
}

PHASE_ROLE_OUTCOMES: dict[DevPhase, list[tuple[UserRole, list[str]]]] = {
    DevPhase.PA: [
        (UserRole.PM, ["Feasibility Report"]),
        (UserRole.BA, ["BRD (Need Assessment)"]),
    ],
    DevPhase.SA: [
        (UserRole.PM, ["Project Charter"]),
        (UserRole.BA, ["User Requirements"]),
    ],
    DevPhase.SD: [
        (UserRole.SW_ARCHITECT, ["HLD / Detailed Design"]),
        (UserRole.BA, ["SRS"]),
        (UserRole.UI_DESIGNER, ["Wireframes & GUI Design"]),
    ],
    DevPhase.SI: [
        (UserRole.SW_DEVELOPER, ["Source Code"]),
        (UserRole.SW_TESTER, ["System Test Cases"]),
    ],
    DevPhase.ST: [
        (UserRole.SW_TESTER, ["Test Plan", "Test Report"]),
    ],
    DevPhase.DEP: [
        (UserRole.SYSOPS, ["Release Schedule"]),
        (UserRole.BA, ["User Guide"]),
    ],
    DevPhase.OM: [
        (UserRole.SYSOPS, ["Incident Log"]),
        (UserRole.PM, ["RCA Reports"]),
    ],
}


def iter_template_rows() -> Iterator[dict]:
    """Sinh từng dòng template (để seed DB). position chạy theo từng (phase, kind)."""
    for phase in DevPhase:
        pos = 0
        for role, tasks in PHASE_ROLE_TASKS.get(phase, []):
            for text in tasks:
                yield {"phase_type": phase.value, "role": role.value,
                       "kind": PhaseItemKind.CHECKLIST.value, "text": text, "position": pos}
                pos += 1
        pos = 0
        for role, outcomes in PHASE_ROLE_OUTCOMES.get(phase, []):
            for text in outcomes:
                yield {"phase_type": phase.value, "role": role.value,
                       "kind": PhaseItemKind.OUTCOME.value, "text": text, "position": pos}
                pos += 1


# ─── #26 (mảng A): 7 phase mặc định để seed cho MỖI workspace mới ──────
# Phase nay là per-org (bảng phase_definitions), không còn enum cứng. Cấu trúc dưới
# là nguồn seed mặc định, port từ PHASE_META (FE) + PHASE_ROLE_* ở trên.
# (code, name VN ngắn, full_name, color palette key, description)
_DEFAULT_PHASE_META: list[tuple[str, str, str, str, str]] = [
    ("PA", "Đánh giá Dự án", "Project Assessment", "gray",
     "Xác định mục tiêu, đánh giá khả thi, thu thập yêu cầu → Báo cáo Khả thi & BRD"),
    ("SA", "Phân tích Phần mềm", "Software Analysis", "cyan",
     "Xác định phạm vi, tạo WBS, quản lý rủi ro → Hiến chương Dự án & Yêu cầu Người dùng"),
    ("SD", "Thiết kế Phần mềm", "Software Design", "violet",
     "Wireframe, GUI, HLD/DDD, SRS → Tài liệu Thiết kế"),
    ("SI", "Phát triển Phần mềm", "Software Implementation", "blue",
     "Phát triển mã nguồn, thiết lập hạ tầng, test case → Mã nguồn & Test Case"),
    ("ST", "Kiểm thử Phần mềm", "Software Testing", "orange",
     "Kiểm thử hệ thống, hiệu năng, bảo mật → Kế hoạch & Báo cáo Kiểm thử"),
    ("DEP", "Triển khai Phần mềm", "Software Deployment", "emerald",
     "Lịch trình triển khai, xác nhận Go-live → Lịch bàn giao & Hướng dẫn Sử dụng"),
    ("OM", "Vận hành & Bảo trì", "Operation & Maintenance", "slate",
     "Quản lý sự cố PRD, giám sát, vá bảo mật → Nhật ký Sự cố & Báo cáo RCA"),
]


def _default_phase_items(code: str) -> list[tuple[str | None, str, str, int]]:
    """(role, kind, text, position) cho checklist + outcome mặc định của 1 phase code."""
    phase = DevPhase(code)
    rows: list[tuple[str | None, str, str, int]] = []
    pos = 0
    for role, tasks in PHASE_ROLE_TASKS.get(phase, []):
        for text in tasks:
            rows.append((role.value, PhaseItemKind.CHECKLIST.value, text, pos))
            pos += 1
    pos = 0
    for role, outcomes in PHASE_ROLE_OUTCOMES.get(phase, []):
        for text in outcomes:
            rows.append((role.value, PhaseItemKind.OUTCOME.value, text, pos))
            pos += 1
    return rows


def default_phases() -> list[dict]:
    """7 phase mặc định (kèm `items`) để seed cho 1 workspace.

    Mỗi phần tử: {code, name, full_name, color, description, position, items:[(role,kind,text,pos)]}.
    """
    return [
        {
            "code": code, "name": name, "full_name": full_name, "color": color,
            "description": desc, "position": position, "items": _default_phase_items(code),
        }
        for position, (code, name, full_name, color, desc) in enumerate(_DEFAULT_PHASE_META)
    ]
