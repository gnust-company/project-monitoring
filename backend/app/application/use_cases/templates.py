"""Use case: trả checklist/outcome mặc định theo phase, gom nhóm theo role."""
from app.application.ports import PhaseTaskTemplateRepository
from app.domain.value_objects import DevPhase, PhaseItemKind


class GetPhaseTasks:
    def __init__(self, templates: PhaseTaskTemplateRepository) -> None:
        self._templates = templates

    async def execute(self, phase: DevPhase) -> dict:
        rows = await self._templates.list_by_phase(phase)
        checklist = self._group(rows, PhaseItemKind.CHECKLIST, "tasks")
        outcomes = self._group(rows, PhaseItemKind.OUTCOME, "outcomes")
        return {"phase": phase.value, "checklist": checklist, "outcomes": outcomes}

    @staticmethod
    def _group(rows, kind: PhaseItemKind, key: str) -> list[dict]:
        grouped: dict[str, list[str]] = {}
        for t in rows:
            if t.kind == kind:
                grouped.setdefault(t.role.value, []).append(t.text)
        return [{"role": role, key: texts} for role, texts in grouped.items()]
