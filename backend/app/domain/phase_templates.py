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
# (code, name, full_name, color palette key, description) — toàn bộ tiếng Anh (default).
# name = full_name (sau #26 phase chỉ còn Mã + Tên đầy đủ; giữ 2 cột cho back-compat).
_DEFAULT_PHASE_META: list[tuple[str, str, str, str, str]] = [
    ("PA", "Project Assessment", "Project Assessment", "gray",
     "Define objectives, assess feasibility, gather requirements → Feasibility Report & BRD"),
    ("SA", "Software Analysis", "Software Analysis", "cyan",
     "Define scope, build WBS, manage risks → Project Charter & User Requirements"),
    ("SD", "Software Design", "Software Design", "violet",
     "Wireframe, GUI, HLD/DDD, SRS → Design Documents"),
    ("SI", "Software Implementation", "Software Implementation", "blue",
     "Develop source code, set up infrastructure, test cases → Source Code & Test Cases"),
    ("ST", "Software Testing", "Software Testing", "orange",
     "System, performance and security testing → Test Plan & Test Report"),
    ("DEP", "Software Deployment", "Software Deployment", "emerald",
     "Deployment schedule, Go-live confirmation → Handover Schedule & User Guide"),
    ("OM", "Operation & Maintenance", "Operation & Maintenance", "slate",
     "PRD incident management, monitoring, security patching → Incident Log & RCA Report"),
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
