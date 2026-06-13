"""SqlAlchemy cài đặt PhaseTaskTemplateRepository."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports import PhaseTaskTemplateRepository
from app.domain.entities import PhaseTaskTemplate
from app.domain.value_objects import DevPhase
from app.infrastructure.db.models import PhaseTaskTemplateModel


def _to_entity(m: PhaseTaskTemplateModel) -> PhaseTaskTemplate:
    return PhaseTaskTemplate(
        id=m.id, phase_type=m.phase_type, role=m.role, kind=m.kind,
        text=m.text, position=m.position,
    )


class SqlAlchemyPhaseTaskTemplateRepository(PhaseTaskTemplateRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_phase(self, phase: DevPhase) -> list[PhaseTaskTemplate]:
        rows = await self._session.scalars(
            select(PhaseTaskTemplateModel).where(PhaseTaskTemplateModel.phase_type == phase)
            .order_by(PhaseTaskTemplateModel.kind, PhaseTaskTemplateModel.position)
        )
        return [_to_entity(m) for m in rows]
