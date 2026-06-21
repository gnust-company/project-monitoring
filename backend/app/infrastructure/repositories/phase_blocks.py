"""SqlAlchemy cài đặt PhaseBlockRepository (aggregate: items, participants, comments, attachments)."""
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application.ports import PhaseBlockRepository
from app.domain.entities import Attachment, Comment, PhaseBlock, PhaseItem
from app.domain.value_objects import AttachmentKind
from app.infrastructure.db.models import (
    AttachmentModel,
    CommentModel,
    PhaseBlockModel,
    PhaseItemModel,
    PhaseParticipantModel,
    ProjectModel,
)


def _item_to_entity(m: PhaseItemModel) -> PhaseItem:
    return PhaseItem(id=m.id, kind=m.kind, text=m.text, done=m.done, role=m.role, position=m.position)


def _comment_to_entity(m: CommentModel) -> Comment:
    return Comment(id=m.id, author_id=m.author_id, content=m.content, created_at=m.created_at)


def _attachment_to_entity(m: AttachmentModel) -> Attachment:
    return Attachment(id=m.id, kind=m.kind, file_name=m.file_name, url=m.url,
                      outcome_item_id=m.outcome_item_id,
                      uploaded_by=m.uploaded_by, uploaded_at=m.uploaded_at)


def _block_to_entity(m: PhaseBlockModel, *, full: bool = True) -> PhaseBlock:
    block = PhaseBlock(
        id=m.id, project_id=m.project_id, phase_type=m.phase_type, tag=m.tag,
        title=m.title, description=m.description, start_date=m.start_date, end_date=m.end_date,
        created_by=m.created_by, assignee=m.assignee, actual_end_date=m.actual_end_date,
        display_row=m.display_row,
        participant_ids=[p.user_id for p in m.participants],
        items=[_item_to_entity(i) for i in m.items],
    )
    if full:
        block.comments = [_comment_to_entity(c) for c in m.comments]
        block.attachments = [_attachment_to_entity(a) for a in m.attachments]
    return block


_LIGHT = (selectinload(PhaseBlockModel.items), selectinload(PhaseBlockModel.participants))
_FULL = (*_LIGHT, selectinload(PhaseBlockModel.comments), selectinload(PhaseBlockModel.attachments))


class SqlAlchemyPhaseBlockRepository(PhaseBlockRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, block_id: UUID) -> PhaseBlock | None:
        m = await self._session.scalar(
            select(PhaseBlockModel).where(PhaseBlockModel.id == block_id).options(*_FULL)
        )
        return _block_to_entity(m, full=True) if m else None

    async def get_project_id(self, block_id: UUID) -> UUID | None:
        return await self._session.scalar(
            select(PhaseBlockModel.project_id).where(PhaseBlockModel.id == block_id)
        )

    async def list_by_project(self, project_id: UUID) -> list[PhaseBlock]:
        rows = await self._session.scalars(
            select(PhaseBlockModel).where(PhaseBlockModel.project_id == project_id)
            .options(*_LIGHT).order_by(PhaseBlockModel.start_date)
        )
        return [_block_to_entity(m, full=False) for m in rows]

    async def list_by_org(self, org_id: UUID) -> list[PhaseBlock]:
        rows = await self._session.scalars(
            select(PhaseBlockModel)
            .join(ProjectModel, ProjectModel.id == PhaseBlockModel.project_id)
            .where(ProjectModel.org_id == org_id)
            .options(*_LIGHT).order_by(PhaseBlockModel.start_date)
        )
        return [_block_to_entity(m, full=False) for m in rows]

    async def count_all(self) -> int:
        return await self._session.scalar(select(func.count()).select_from(PhaseBlockModel)) or 0

    async def create(self, block: PhaseBlock) -> PhaseBlock:
        m = PhaseBlockModel(
            id=block.id, project_id=block.project_id, phase_type=block.phase_type, tag=block.tag,
            title=block.title, description=block.description, start_date=block.start_date,
            end_date=block.end_date, actual_end_date=block.actual_end_date,
            display_row=block.display_row, created_by=block.created_by, assignee=block.assignee,
        )
        m.items = [
            PhaseItemModel(id=i.id, kind=i.kind, text=i.text, done=i.done, role=i.role, position=i.position)
            for i in block.items
        ]
        m.participants = [PhaseParticipantModel(user_id=uid) for uid in block.participant_ids]
        self._session.add(m)
        await self._session.flush()
        return await self.get(block.id)  # reload with relationships

    async def update(self, block: PhaseBlock) -> PhaseBlock:
        m = await self._session.scalar(
            select(PhaseBlockModel).where(PhaseBlockModel.id == block.id)
            .options(selectinload(PhaseBlockModel.participants))
        )
        if m is None:
            raise LookupError(f"PhaseBlock {block.id} not found")
        m.title = block.title
        m.description = block.description
        m.tag = block.tag
        m.phase_type = block.phase_type
        m.start_date = block.start_date
        m.end_date = block.end_date
        m.actual_end_date = block.actual_end_date
        m.display_row = block.display_row
        m.assignee = block.assignee
        # thay toàn bộ participants
        m.participants.clear()
        for uid in block.participant_ids:
            m.participants.append(PhaseParticipantModel(user_id=uid))
        await self._session.flush()
        return await self.get(block.id)

    async def delete(self, block_id: UUID) -> None:
        await self._session.execute(delete(PhaseBlockModel).where(PhaseBlockModel.id == block_id))

    # ── Items ────────────────────────────────────────────────────────
    async def add_item(self, block_id: UUID, item: PhaseItem) -> PhaseItem:
        m = PhaseItemModel(id=item.id, phase_block_id=block_id, kind=item.kind, text=item.text,
                           done=item.done, role=item.role, position=item.position)
        self._session.add(m)
        await self._session.flush()
        return _item_to_entity(m)

    async def get_item(self, item_id: UUID) -> PhaseItem | None:
        m = await self._session.get(PhaseItemModel, item_id)
        return _item_to_entity(m) if m else None

    async def update_item(self, item: PhaseItem) -> PhaseItem:
        m = await self._session.get(PhaseItemModel, item.id)
        if m is None:
            raise LookupError(f"PhaseItem {item.id} not found")
        m.text = item.text
        m.done = item.done
        m.role = item.role
        m.position = item.position
        await self._session.flush()
        return _item_to_entity(m)

    async def delete_item(self, item_id: UUID) -> None:
        await self._session.execute(delete(PhaseItemModel).where(PhaseItemModel.id == item_id))

    # ── Comments ─────────────────────────────────────────────────────
    async def add_comment(self, block_id: UUID, comment: Comment) -> Comment:
        m = CommentModel(id=comment.id, phase_block_id=block_id, author_id=comment.author_id,
                         content=comment.content)
        self._session.add(m)
        await self._session.flush()
        return _comment_to_entity(m)

    async def list_comments(self, block_id: UUID) -> list[Comment]:
        rows = await self._session.scalars(
            select(CommentModel).where(CommentModel.phase_block_id == block_id)
            .order_by(CommentModel.created_at)
        )
        return [_comment_to_entity(m) for m in rows]

    # ── Attachments ──────────────────────────────────────────────────
    async def add_attachment(self, block_id: UUID, attachment: Attachment) -> Attachment:
        m = AttachmentModel(id=attachment.id, phase_block_id=block_id, kind=attachment.kind,
                            file_name=attachment.file_name, url=attachment.url,
                            outcome_item_id=attachment.outcome_item_id,
                            uploaded_by=attachment.uploaded_by)
        self._session.add(m)
        await self._session.flush()
        return _attachment_to_entity(m)

    async def count_outcome_attachments(self, item_id: UUID) -> int:
        return await self._session.scalar(
            select(func.count()).select_from(AttachmentModel)
            .where(AttachmentModel.outcome_item_id == item_id)
        ) or 0

    async def get_attachment(self, attachment_id: UUID) -> Attachment | None:
        m = await self._session.get(AttachmentModel, attachment_id)
        return _attachment_to_entity(m) if m else None

    async def list_attachments(self, block_id: UUID) -> list[Attachment]:
        rows = await self._session.scalars(
            select(AttachmentModel).where(AttachmentModel.phase_block_id == block_id)
            .order_by(AttachmentModel.uploaded_at)
        )
        return [_attachment_to_entity(m) for m in rows]

    async def delete_attachment(self, attachment_id: UUID) -> None:
        await self._session.execute(
            delete(AttachmentModel).where(AttachmentModel.id == attachment_id)
        )

    async def file_attachment_urls_by_project(self, project_id: UUID) -> list[str]:
        rows = await self._session.scalars(
            select(AttachmentModel.url)
            .join(PhaseBlockModel, AttachmentModel.phase_block_id == PhaseBlockModel.id)
            .where(
                PhaseBlockModel.project_id == project_id,
                AttachmentModel.kind == AttachmentKind.FILE,
            )
        )
        return list(rows)

    async def file_attachment_urls_by_org(self, org_id: UUID) -> list[str]:
        rows = await self._session.scalars(
            select(AttachmentModel.url)
            .join(PhaseBlockModel, AttachmentModel.phase_block_id == PhaseBlockModel.id)
            .join(ProjectModel, PhaseBlockModel.project_id == ProjectModel.id)
            .where(
                ProjectModel.org_id == org_id,
                AttachmentModel.kind == AttachmentKind.FILE,
            )
        )
        return list(rows)
