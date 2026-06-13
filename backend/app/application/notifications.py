"""NotificationService — tiện ích sinh thông báo in-app từ các use case.

Dùng NotificationRepository để ghi; các use case gọi service này khi có sự kiện.
"""
from uuid import UUID, uuid4

from app.application.ports import NotificationRepository
from app.domain.entities import Notification


class NotificationService:
    def __init__(self, notifications: NotificationRepository) -> None:
        self._notifications = notifications

    async def notify(
        self,
        user_id: UUID,
        type: str,
        title: str,
        body: str = "",
        *,
        org_id: UUID | None = None,
        project_id: UUID | None = None,
        phase_block_id: UUID | None = None,
        change_request_id: UUID | None = None,
    ) -> None:
        await self._notifications.create(Notification(
            id=uuid4(), user_id=user_id, type=type, title=title, body=body,
            org_id=org_id, project_id=project_id, phase_block_id=phase_block_id,
            change_request_id=change_request_id,
        ))

    async def notify_many(self, user_ids: list[UUID], type: str, title: str, body: str = "", **refs) -> None:
        for uid in user_ids:
            await self.notify(uid, type, title, body, **refs)
