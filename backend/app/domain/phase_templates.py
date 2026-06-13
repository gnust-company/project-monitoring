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
