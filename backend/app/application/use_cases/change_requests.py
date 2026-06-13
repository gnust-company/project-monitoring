"""Use cases duyệt/từ chối ChangeRequest (owner xử lý yêu cầu của member)."""
from datetime import UTC, datetime
from uuid import UUID

from app.application.notifications import NotificationService
from app.application.ports import ChangeRequestRepository, ProjectRepository
from app.application.use_cases.projects import _apply_updates
from app.domain.entities import ChangeRequest
from app.domain.value_objects import ChangeRequestAction, ChangeRequestStatus


class ChangeRequestNotFoundError(Exception):
    pass


class ChangeRequestNotPendingError(Exception):
    pass


class ListPendingChangeRequests:
    def __init__(self, change_requests: ChangeRequestRepository) -> None:
        self._crs = change_requests

    async def execute(self, org_id: UUID) -> list[ChangeRequest]:
        return await self._crs.list_pending_by_org(org_id)


class ApproveChangeRequest:
    def __init__(
        self, change_requests: ChangeRequestRepository, projects: ProjectRepository,
        notifier: NotificationService,
    ) -> None:
        self._crs = change_requests
        self._projects = projects
        self._notifier = notifier

    async def execute(self, cr_id: UUID, reviewer_id: UUID) -> ChangeRequest:
        cr = await self._load_pending(cr_id)

        # Áp dụng hành động
        if cr.action == ChangeRequestAction.UPDATE_PROJECT:
            project = await self._projects.get(cr.project_id)
            if project is not None:
                await self._projects.update(_apply_updates(project, cr.payload))
        elif cr.action == ChangeRequestAction.DELETE_PROJECT:
            await self._projects.delete(cr.project_id)

        cr.status = ChangeRequestStatus.APPROVED
        cr.reviewed_by = reviewer_id
        cr.resolved_at = datetime.now(tz=UTC)
        cr = await self._crs.update(cr)

        await self._notifier.notify(
            cr.requested_by, "change_request_approved",
            "Yêu cầu của bạn đã được duyệt",
            org_id=cr.org_id, project_id=cr.project_id, change_request_id=cr.id,
        )
        return cr

    async def _load_pending(self, cr_id: UUID) -> ChangeRequest:
        cr = await self._crs.get(cr_id)
        if cr is None:
            raise ChangeRequestNotFoundError(str(cr_id))
        if cr.status != ChangeRequestStatus.PENDING:
            raise ChangeRequestNotPendingError(str(cr_id))
        return cr


class RejectChangeRequest:
    def __init__(
        self, change_requests: ChangeRequestRepository, notifier: NotificationService
    ) -> None:
        self._crs = change_requests
        self._notifier = notifier

    async def execute(self, cr_id: UUID, reviewer_id: UUID) -> ChangeRequest:
        cr = await self._crs.get(cr_id)
        if cr is None:
            raise ChangeRequestNotFoundError(str(cr_id))
        if cr.status != ChangeRequestStatus.PENDING:
            raise ChangeRequestNotPendingError(str(cr_id))

        cr.status = ChangeRequestStatus.REJECTED
        cr.reviewed_by = reviewer_id
        cr.resolved_at = datetime.now(tz=UTC)
        cr = await self._crs.update(cr)

        await self._notifier.notify(
            cr.requested_by, "change_request_rejected",
            "Yêu cầu của bạn đã bị từ chối",
            org_id=cr.org_id, project_id=cr.project_id, change_request_id=cr.id,
        )
        return cr
