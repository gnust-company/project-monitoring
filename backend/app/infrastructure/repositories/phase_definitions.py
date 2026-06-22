"""SqlAlchemy cài đặt PhaseDefinitionRepository (#26 mảng A — phase động per-org)."""
from uuid import UUID, uuid4

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application.ports import PhaseDefinitionRepository
from app.domain.entities import PhaseDefinition, PhaseDefinitionItem
from app.domain.phase_templates import default_phases
from app.domain.value_objects import PhaseItemKind, UserRole
from app.infrastructure.db.models import (
    PhaseBlockModel,
    PhaseDefinitionItemModel,
    PhaseDefinitionModel,
    ProjectModel,
)


def _item_to_entity(m: PhaseDefinitionItemModel) -> PhaseDefinitionItem:
    return PhaseDefinitionItem(id=m.id, kind=m.kind, text=m.text, role=m.role, position=m.position)


def _to_entity(m: PhaseDefinitionModel) -> PhaseDefinition:
    return PhaseDefinition(
        id=m.id, org_id=m.org_id, code=m.code, name=m.name, full_name=m.full_name,
        description=m.description, color=m.color, position=m.position,
        items=[_item_to_entity(i) for i in m.items], created_at=m.created_at,
    )


def _item_models(items: list[PhaseDefinitionItem]) -> list[PhaseDefinitionItemModel]:
    return [
        PhaseDefinitionItemModel(id=i.id or uuid4(), kind=i.kind, text=i.text,
                                 role=i.role, position=i.position)
        for i in items
    ]


class SqlAlchemyPhaseDefinitionRepository(PhaseDefinitionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_org(self, org_id: UUID) -> list[PhaseDefinition]:
        rows = await self._session.scalars(
            select(PhaseDefinitionModel)
            .where(PhaseDefinitionModel.org_id == org_id)
            .options(selectinload(PhaseDefinitionModel.items))
            .order_by(PhaseDefinitionModel.position)
        )
        return [_to_entity(m) for m in rows]

    async def get(self, phase_id: UUID) -> PhaseDefinition | None:
        m = await self._session.scalar(
            select(PhaseDefinitionModel).where(PhaseDefinitionModel.id == phase_id)
            .options(selectinload(PhaseDefinitionModel.items))
        )
        return _to_entity(m) if m else None

    async def create(self, phase: PhaseDefinition) -> PhaseDefinition:
        m = PhaseDefinitionModel(
            id=phase.id, org_id=phase.org_id, code=phase.code, name=phase.name,
            full_name=phase.full_name, description=phase.description, color=phase.color,
            position=phase.position,
        )
        m.items = _item_models(phase.items)
        self._session.add(m)
        await self._session.flush()
        reloaded = await self.get(phase.id)  # reload with items
        assert reloaded is not None
        return reloaded

    async def update(self, phase: PhaseDefinition, *, replace_items: bool = False) -> PhaseDefinition:
        m = await self._session.scalar(
            select(PhaseDefinitionModel).where(PhaseDefinitionModel.id == phase.id)
            .options(selectinload(PhaseDefinitionModel.items))
        )
        if m is None:
            raise LookupError(f"PhaseDefinition {phase.id} not found")
        m.code = phase.code
        m.name = phase.name
        m.full_name = phase.full_name
        m.description = phase.description
        m.color = phase.color
        m.position = phase.position
        if replace_items:
            m.items.clear()
            for im in _item_models(phase.items):
                m.items.append(im)
        await self._session.flush()
        reloaded = await self.get(phase.id)
        assert reloaded is not None
        return reloaded

    async def delete(self, phase_id: UUID) -> None:
        await self._session.execute(
            delete(PhaseDefinitionModel).where(PhaseDefinitionModel.id == phase_id)
        )

    async def count_blocks_using(self, org_id: UUID, code: str) -> int:
        return await self._session.scalar(
            select(func.count())
            .select_from(PhaseBlockModel)
            .join(ProjectModel, ProjectModel.id == PhaseBlockModel.project_id)
            .where(ProjectModel.org_id == org_id, PhaseBlockModel.phase_type == code)
        ) or 0

    async def cascade_rename_code(self, org_id: UUID, old_code: str, new_code: str) -> None:
        """Đổi mã phase → block trong workspace đang dùng phase_type cũ chuyển sang mã mới."""
        await self._session.execute(
            update(PhaseBlockModel).where(
                PhaseBlockModel.phase_type == old_code,
                PhaseBlockModel.project_id.in_(
                    select(ProjectModel.id).where(ProjectModel.org_id == org_id)
                ),
            ).values(phase_type=new_code)
        )
        await self._session.flush()

    async def seed_defaults(self, org_id: UUID) -> None:
        """Seed 7 phase mặc định cho 1 workspace mới (khi tạo org)."""
        for spec in default_phases():
            items = [
                PhaseDefinitionItem(
                    id=uuid4(), kind=PhaseItemKind(kind),
                    text=text, role=UserRole(role) if role else None, position=pos,
                )
                for role, kind, text, pos in spec["items"]
            ]
            await self.create(PhaseDefinition(
                id=uuid4(), org_id=org_id, code=spec["code"], name=spec["name"],
                full_name=spec["full_name"], description=spec["description"],
                color=spec["color"], position=spec["position"], items=items,
            ))
