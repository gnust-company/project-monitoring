"""Use cases cho PhaseBlock + items + comments + changelog (activity log)."""
from dataclasses import dataclass, field
from datetime import date
from typing import Any
from uuid import UUID, uuid4

from app.application.notifications import NotificationService
from app.application.ports import (
    ActivityLogRepository,
    PhaseBlockRepository,
    PhaseTaskTemplateRepository,
)
from app.application.authz import can_edit_phase
from app.domain.entities import ActivityEntry, Comment, PhaseBlock, PhaseItem, User
from app.domain.value_objects import DevPhase, PhaseItemKind, PhaseTag, UserRole


class PhaseBlockNotFoundError(Exception):
    pass


class PhaseItemNotFoundError(Exception):
    pass


class PhaseForbiddenError(Exception):
    """Không phải PIC phase → không được sửa/xóa metadata (#11)."""


@dataclass(slots=True)
class CreatePhaseBlockInput:
    project_id: UUID
    phase_type: DevPhase
    title: str
    start_date: date
    end_date: date
    created_by: UUID
    tag: PhaseTag = PhaseTag.TODO
    description: str = ""
    assignee: UUID | None = None
    actual_end_date: date | None = None
    display_row: int | None = None
    participant_ids: list[UUID] = field(default_factory=list)
    # None = seed từ template; [] = cố tình rỗng; list = dùng nguyên
    checklist: list[dict[str, Any]] | None = None
    outcomes: list[dict[str, Any]] | None = None


def _role(value: Any) -> UserRole | None:
    return UserRole(value) if value else None


async def _seed_items(
    templates: PhaseTaskTemplateRepository, phase: DevPhase,
    provided: list[dict[str, Any]] | None, kind: PhaseItemKind,
) -> list[PhaseItem]:
    if provided is not None:
        return [
            PhaseItem(id=uuid4(), kind=kind, text=d["text"], done=d.get("done", False),
                      role=_role(d.get("role")), position=i)
            for i, d in enumerate(provided)
        ]
    tmpls = [t for t in await templates.list_by_phase(phase) if t.kind == kind]
    return [
        PhaseItem(id=uuid4(), kind=kind, text=t.text, done=False, role=t.role, position=i)
        for i, t in enumerate(tmpls)
    ]


class CreatePhaseBlock:
    def __init__(
        self, blocks: PhaseBlockRepository, templates: PhaseTaskTemplateRepository,
        activity: ActivityLogRepository, notifier: NotificationService,
    ) -> None:
        self._blocks = blocks
        self._templates = templates
        self._activity = activity
        self._notifier = notifier

    async def execute(self, data: CreatePhaseBlockInput) -> PhaseBlock:
        items = await _seed_items(self._templates, data.phase_type, data.checklist, PhaseItemKind.CHECKLIST)
        items += await _seed_items(self._templates, data.phase_type, data.outcomes, PhaseItemKind.OUTCOME)
        assignee = data.assignee or data.created_by
        block = PhaseBlock(
            id=uuid4(), project_id=data.project_id, phase_type=data.phase_type, tag=data.tag,
            title=data.title, description=data.description, start_date=data.start_date,
            end_date=data.end_date, created_by=data.created_by, assignee=assignee,
            actual_end_date=data.actual_end_date, display_row=data.display_row,
            participant_ids=data.participant_ids, items=items,
        )
        created = await self._blocks.create(block)
        await self._activity.add(ActivityEntry(
            id=uuid4(), project_id=data.project_id, user_id=data.created_by,
            action="created phase", target=data.title, created_at=None, phase_block_id=created.id,
        ))
        if assignee != data.created_by:
            await self._notifier.notify(
                assignee, "phase_assigned", f"Bạn được giao phase {data.title}",
                project_id=data.project_id, phase_block_id=created.id,
            )
        return created


class GetPhaseBlock:
    def __init__(self, blocks: PhaseBlockRepository) -> None:
        self._blocks = blocks

    async def execute(self, block_id: UUID) -> PhaseBlock:
        block = await self._blocks.get(block_id)
        if block is None:
            raise PhaseBlockNotFoundError(str(block_id))
        return block


class ListPhaseBlocks:
    def __init__(self, blocks: PhaseBlockRepository) -> None:
        self._blocks = blocks

    async def by_project(self, project_id: UUID) -> list[PhaseBlock]:
        return await self._blocks.list_by_project(project_id)

    async def by_org(self, org_id: UUID) -> list[PhaseBlock]:
        return await self._blocks.list_by_org(org_id)


def _diffs(block: PhaseBlock, payload: dict[str, Any]) -> list[tuple[str, str]]:
    """So sánh thay đổi → list (action, target) cho changelog."""
    out: list[tuple[str, str]] = []
    if "tag" in payload and payload["tag"] != block.tag.value:
        out.append(("changed status", f"{block.tag.value} → {payload['tag']}"))
    if "title" in payload and payload["title"] != block.title:
        out.append(("renamed phase", f"{block.title} → {payload['title']}"))
    if payload.get("start_date") and payload["start_date"] != block.start_date.isoformat():
        out.append(("changed start date", f"{block.start_date.isoformat()} → {payload['start_date']}"))
    if payload.get("end_date") and payload["end_date"] != block.end_date.isoformat():
        out.append(("changed end date", f"{block.end_date.isoformat()} → {payload['end_date']}"))
    if "assignee" in payload and str(block.assignee) != str(payload["assignee"]):
        out.append(("reassigned phase", str(payload["assignee"])))
    if "participant_ids" in payload:
        old = {str(u) for u in block.participant_ids}
        new = {str(u) for u in payload["participant_ids"]}
        for added in new - old:
            out.append(("added participant", added))
        for removed in old - new:
            out.append(("removed participant", removed))
    return out


def _apply_block_updates(block: PhaseBlock, payload: dict[str, Any]) -> PhaseBlock:
    if "title" in payload:
        block.title = payload["title"]
    if "description" in payload:
        block.description = payload["description"]
    if "tag" in payload:
        block.tag = PhaseTag(payload["tag"])
    if "phase_type" in payload:
        block.phase_type = DevPhase(payload["phase_type"])
    if payload.get("start_date"):
        block.start_date = date.fromisoformat(payload["start_date"])
    if payload.get("end_date"):
        block.end_date = date.fromisoformat(payload["end_date"])
    if "actual_end_date" in payload:
        v = payload["actual_end_date"]
        block.actual_end_date = date.fromisoformat(v) if v else None
    if "display_row" in payload:
        block.display_row = payload["display_row"]
    if "assignee" in payload and payload["assignee"]:
        block.assignee = UUID(str(payload["assignee"]))
    if "participant_ids" in payload:
        block.participant_ids = [UUID(str(u)) for u in payload["participant_ids"]]
    return block


class UpdatePhaseBlock:
    def __init__(
        self, blocks: PhaseBlockRepository, activity: ActivityLogRepository,
        notifier: NotificationService,
    ) -> None:
        self._blocks = blocks
        self._activity = activity
        self._notifier = notifier

    async def execute(self, block_id: UUID, payload: dict[str, Any], actor: User) -> PhaseBlock:
        block = await self._blocks.get(block_id)
        if block is None:
            raise PhaseBlockNotFoundError(str(block_id))
        # #11: chỉ PIC phase (= người tạo)/superuser mới sửa metadata.
        if not can_edit_phase(actor, block):
            raise PhaseForbiddenError("Chỉ PIC phase mới được sửa")

        diffs = _diffs(block, payload)
        reassigned_to = (
            UUID(str(payload["assignee"]))
            if "assignee" in payload and str(payload["assignee"]) != str(block.assignee)
            else None
        )
        updated = await self._blocks.update(_apply_block_updates(block, payload))
        for action, target in diffs:
            await self._activity.add(ActivityEntry(
                id=uuid4(), project_id=updated.project_id, user_id=actor.id,
                action=action, target=target, created_at=None, phase_block_id=block_id,
            ))
        if reassigned_to and reassigned_to != actor.id:
            await self._notifier.notify(
                reassigned_to, "phase_assigned", f"Bạn được giao phase {updated.title}",
                project_id=updated.project_id, phase_block_id=block_id,
            )
        return updated


class DeletePhaseBlock:
    def __init__(self, blocks: PhaseBlockRepository, activity: ActivityLogRepository) -> None:
        self._blocks = blocks
        self._activity = activity

    async def execute(self, block_id: UUID, actor: User) -> None:
        block = await self._blocks.get(block_id)
        if block is None:
            raise PhaseBlockNotFoundError(str(block_id))
        # #11: chỉ PIC phase (= người tạo)/superuser mới xóa.
        if not can_edit_phase(actor, block):
            raise PhaseForbiddenError("Chỉ PIC phase mới được xóa")
        # ghi changelog cấp dự án TRƯỚC khi xóa, phase_block_id=None để còn lại
        await self._activity.add(ActivityEntry(
            id=uuid4(), project_id=block.project_id, user_id=actor.id,
            action="deleted phase", target=block.title, created_at=None, phase_block_id=None,
        ))
        await self._blocks.delete(block_id)


async def _log(activity: ActivityLogRepository, project_id: UUID, block_id: UUID | None,
               actor_id: UUID, action: str, target: str = "") -> None:
    await activity.add(ActivityEntry(
        id=uuid4(), project_id=project_id, user_id=actor_id, action=action,
        target=target, created_at=None, phase_block_id=block_id,
    ))


# ─── Items ───────────────────────────────────────────────────────────
class AddPhaseItem:
    def __init__(self, blocks: PhaseBlockRepository, activity: ActivityLogRepository) -> None:
        self._blocks = blocks
        self._activity = activity

    async def execute(self, block_id: UUID, kind: PhaseItemKind, text: str,
                      role: UserRole | None, actor_id: UUID) -> PhaseItem:
        existing = await self._blocks.get(block_id)
        if existing is None:
            raise PhaseBlockNotFoundError(str(block_id))
        pos = max((i.position for i in existing.items if i.kind == kind), default=-1) + 1
        item = await self._blocks.add_item(
            block_id, PhaseItem(id=uuid4(), kind=kind, text=text, done=False, role=role, position=pos)
        )
        await _log(self._activity, existing.project_id, block_id, actor_id, f"added {kind.value}", text)
        return item


class UpdatePhaseItem:
    def __init__(self, blocks: PhaseBlockRepository, activity: ActivityLogRepository) -> None:
        self._blocks = blocks
        self._activity = activity

    async def execute(self, block_id: UUID, item_id: UUID, payload: dict[str, Any], actor_id: UUID) -> PhaseItem:
        item = await self._blocks.get_item(item_id)
        if item is None:
            raise PhaseItemNotFoundError(str(item_id))
        action: str | None = None
        if "done" in payload and payload["done"] != item.done:
            action = "completed item" if payload["done"] else "reopened item"
        elif "text" in payload and payload["text"] != item.text:
            action = "edited item"
        if "text" in payload:
            item.text = payload["text"]
        if "done" in payload:
            item.done = payload["done"]
        if "role" in payload:
            item.role = _role(payload["role"])
        if "position" in payload and payload["position"] is not None:
            item.position = payload["position"]
        updated = await self._blocks.update_item(item)
        if action:
            project_id = await self._blocks.get_project_id(block_id)
            if project_id:
                await _log(self._activity, project_id, block_id, actor_id, action, item.text)
        return updated


class DeletePhaseItem:
    def __init__(self, blocks: PhaseBlockRepository, activity: ActivityLogRepository) -> None:
        self._blocks = blocks
        self._activity = activity

    async def execute(self, block_id: UUID, item_id: UUID, actor_id: UUID) -> None:
        item = await self._blocks.get_item(item_id)
        await self._blocks.delete_item(item_id)
        if item:
            project_id = await self._blocks.get_project_id(block_id)
            if project_id:
                await _log(self._activity, project_id, block_id, actor_id, "removed item", item.text)


# ─── Comments ────────────────────────────────────────────────────────
class AddComment:
    def __init__(self, blocks: PhaseBlockRepository, notifier: NotificationService,
                 activity: ActivityLogRepository) -> None:
        self._blocks = blocks
        self._notifier = notifier
        self._activity = activity

    async def execute(self, block_id: UUID, content: str, author_id: UUID) -> Comment:
        block = await self._blocks.get(block_id)
        if block is None:
            raise PhaseBlockNotFoundError(str(block_id))
        comment = await self._blocks.add_comment(
            block_id, Comment(id=uuid4(), author_id=author_id, content=content, created_at=None)
        )
        # #13: assignee giờ có thể None (chỉ là note) → lọc bỏ.
        raw = {block.assignee, *block.participant_ids} - {author_id}
        recipients = [r for r in raw if r is not None]
        await self._notifier.notify_many(
            list(recipients), "comment_added", f"Bình luận mới ở phase {block.title}",
            project_id=block.project_id, phase_block_id=block_id,
        )
        await _log(self._activity, block.project_id, block_id, author_id, "commented",
                   content[:80] + ("…" if len(content) > 80 else ""))
        return comment


class ListComments:
    def __init__(self, blocks: PhaseBlockRepository) -> None:
        self._blocks = blocks

    async def execute(self, block_id: UUID) -> list[Comment]:
        return await self._blocks.list_comments(block_id)


# ─── Activity (changelog) ────────────────────────────────────────────
class ListActivity:
    def __init__(self, activity: ActivityLogRepository) -> None:
        self._activity = activity

    async def by_phase(self, block_id: UUID) -> list[ActivityEntry]:
        return await self._activity.list_by_phase(block_id)

    async def by_project(self, project_id: UUID) -> list[ActivityEntry]:
        return await self._activity.list_by_project(project_id)
