"""SqlAlchemy cài đặt ChangeRequestRepository."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports import ChangeRequestRepository
from app.domain.entities import ChangeRequest
from app.domain.value_objects import ChangeRequestStatus
from app.infrastructure.db.models import ChangeRequestModel


def _to_entity(m: ChangeRequestModel) -> ChangeRequest:
    return ChangeRequest(
        id=m.id, org_id=m.org_id, project_id=m.project_id, requested_by=m.requested_by,
        action=m.action, payload=m.payload or {}, status=m.status,
        reviewed_by=m.reviewed_by, created_at=m.created_at, resolved_at=m.resolved_at,
    )


class SqlAlchemyChangeRequestRepository(ChangeRequestRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, cr_id: UUID) -> ChangeRequest | None:
        m = await self._session.get(ChangeRequestModel, cr_id)
        return _to_entity(m) if m else None

    async def create(self, cr: ChangeRequest) -> ChangeRequest:
        m = ChangeRequestModel(
            id=cr.id, org_id=cr.org_id, project_id=cr.project_id, requested_by=cr.requested_by,
            action=cr.action, payload=cr.payload, status=cr.status,
        )
        self._session.add(m)
        await self._session.flush()
        return _to_entity(m)

    async def update(self, cr: ChangeRequest) -> ChangeRequest:
        m = await self._session.get(ChangeRequestModel, cr.id)
        if m is None:
            raise LookupError(f"ChangeRequest {cr.id} not found")
        m.status = cr.status
        m.reviewed_by = cr.reviewed_by
        m.resolved_at = cr.resolved_at
        await self._session.flush()
        return _to_entity(m)

    async def list_pending_by_org(self, org_id: UUID) -> list[ChangeRequest]:
        rows = await self._session.scalars(
            select(ChangeRequestModel)
            .where(
                ChangeRequestModel.org_id == org_id,
                ChangeRequestModel.status == ChangeRequestStatus.PENDING,
            )
            .order_by(ChangeRequestModel.created_at)
        )
        return [_to_entity(m) for m in rows]
