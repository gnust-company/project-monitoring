"""Use cases #26 (mảng A) — quản lý phase definitions theo từng workspace.

Authz owner-only được enforce ở router (ManageDep). Use case lo nghiệp vụ: sinh code
duy nhất, replace-all checklist/outcome, cảnh báo khi xóa phase đang dùng.
"""
import re
from typing import Any
from uuid import UUID, uuid4

from app.application.ports import PhaseDefinitionRepository
from app.domain.entities import PhaseDefinition, PhaseDefinitionItem
from app.domain.value_objects import PhaseItemKind


class PhaseDefNotFoundError(Exception):
    pass


class PhaseDefInUseError(Exception):
    """Phase đang được dùng bởi ≥1 block → cần force=True mới xóa."""
    def __init__(self, count: int) -> None:
        self.count = count
        super().__init__(f"{count} block đang dùng phase này")


class PhaseCodeConflictError(Exception):
    """Code phase bị trùng trong workspace."""


def _role(value: Any) -> str | None:
    # #26 mảng B: role là code workspace role (string), không ép enum nữa.
    return str(value) if value else None


def _slugify(name: str) -> str:
    base = re.sub(r"[^A-Za-z0-9]+", "", name).upper()[:12]
    return base or "PHASE"


def _normalize_code(raw: str) -> str:
    """Chuẩn hóa mã phase do user nhập (gộp ký tự lạ thành '_', bỏ '_' thừa, cắt 32)."""
    return re.sub(r"[^A-Za-z0-9]+", "_", raw).strip("_")[:32]


def _unique_code(existing: set[str], desired: str | None, name: str) -> str:
    code = (desired or "").strip().upper() or _slugify(name)
    if code not in existing:
        return code
    i = 2
    while f"{code}{i}" in existing:
        i += 1
    return f"{code}{i}"


def _build_items(checklist: list[dict[str, Any]], outcomes: list[dict[str, Any]]) -> list[PhaseDefinitionItem]:
    items: list[PhaseDefinitionItem] = []
    for pos, d in enumerate(checklist):
        items.append(PhaseDefinitionItem(
            id=uuid4(), kind=PhaseItemKind.CHECKLIST, text=d["text"],
            role=_role(d.get("role")), position=pos,
        ))
    for pos, d in enumerate(outcomes):
        items.append(PhaseDefinitionItem(
            id=uuid4(), kind=PhaseItemKind.OUTCOME, text=d["text"],
            role=_role(d.get("role")), position=pos,
        ))
    return items


class ListPhaseDefs:
    def __init__(self, phases: PhaseDefinitionRepository) -> None:
        self._phases = phases

    async def execute(self, org_id: UUID) -> list[PhaseDefinition]:
        return await self._phases.list_by_org(org_id)


class CreatePhaseDef:
    def __init__(self, phases: PhaseDefinitionRepository) -> None:
        self._phases = phases

    async def execute(self, org_id: UUID, payload: dict[str, Any]) -> PhaseDefinition:
        existing = await self._phases.list_by_org(org_id)
        code = _unique_code({p.code for p in existing}, payload.get("code"), payload["name"])
        position = payload.get("position")
        if position is None:
            position = max((p.position for p in existing), default=-1) + 1
        items = _build_items(payload.get("checklist", []), payload.get("outcomes", []))
        return await self._phases.create(PhaseDefinition(
            id=uuid4(), org_id=org_id, code=code, name=payload["name"],
            full_name=payload.get("full_name", ""), description=payload.get("description", ""),
            color=payload.get("color", "gray"), position=position, items=items,
        ))


class UpdatePhaseDef:
    def __init__(self, phases: PhaseDefinitionRepository) -> None:
        self._phases = phases

    async def execute(self, org_id: UUID, phase_id: UUID, payload: dict[str, Any]) -> PhaseDefinition:
        existing = await self._phases.list_by_org(org_id)
        phase = next((p for p in existing if p.id == phase_id), None)
        if phase is None:
            raise PhaseDefNotFoundError(str(phase_id))
        old_code = phase.code
        # Đổi MÃ phase (viết tắt): chuẩn hóa + chống trùng, cascade cập nhật phase_type của
        # các block đang dùng (#26: cho phép sửa cả mã viết tắt lẫn tên đầy đủ).
        if "code" in payload and payload["code"] is not None:
            new_code = _normalize_code(payload["code"])
            if new_code and new_code != old_code:
                if any(p.code == new_code for p in existing if p.id != phase_id):
                    raise PhaseCodeConflictError(new_code)
                phase.code = new_code
        if "name" in payload:
            phase.name = payload["name"]
        if "full_name" in payload:
            phase.full_name = payload["full_name"]
        if "description" in payload:
            phase.description = payload["description"]
        if "color" in payload:
            phase.color = payload["color"]
        if "position" in payload and payload["position"] is not None:
            phase.position = payload["position"]
        # replace-all items nếu FE gửi checklist hoặc outcomes
        replace = "checklist" in payload or "outcomes" in payload
        if replace:
            checklist = payload.get("checklist")
            outcomes = payload.get("outcomes")
            if checklist is None:
                checklist = [{"text": i.text, "role": i.role}
                             for i in phase.items if i.kind == PhaseItemKind.CHECKLIST]
            if outcomes is None:
                outcomes = [{"text": i.text, "role": i.role}
                            for i in phase.items if i.kind == PhaseItemKind.OUTCOME]
            phase.items = _build_items(checklist, outcomes)
        updated = await self._phases.update(phase, replace_items=replace)
        if updated.code != old_code:
            await self._phases.cascade_rename_code(org_id, old_code, updated.code)
        return updated


class DeletePhaseDef:
    def __init__(self, phases: PhaseDefinitionRepository) -> None:
        self._phases = phases

    async def execute(self, org_id: UUID, phase_id: UUID, *, force: bool = False) -> None:
        phase = await self._phases.get(phase_id)
        if phase is None or phase.org_id != org_id:
            raise PhaseDefNotFoundError(str(phase_id))
        count = await self._phases.count_blocks_using(org_id, phase.code)
        if count > 0 and not force:
            raise PhaseDefInUseError(count)
        await self._phases.delete(phase_id)


class ReorderPhaseDefs:
    def __init__(self, phases: PhaseDefinitionRepository) -> None:
        self._phases = phases

    async def execute(self, org_id: UUID, ordered_ids: list[UUID]) -> list[PhaseDefinition]:
        defs = {p.id: p for p in await self._phases.list_by_org(org_id)}
        for pos, pid in enumerate(ordered_ids):
            phase = defs.get(pid)
            if phase is not None and phase.position != pos:
                phase.position = pos
                await self._phases.update(phase, replace_items=False)
        return await self._phases.list_by_org(org_id)
