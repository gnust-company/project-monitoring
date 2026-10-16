"""Notifications router — in-app, đọc theo user hiện tại (polling từ FE)."""
from uuid import UUID

from fastapi import APIRouter, status

from app.presentation.api.deps import CurrentUser, NotificationRepoDep
from app.presentation.api.schemas import NotificationOut, UnreadCountOut
from app.presentation.api.errors import ApiError

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    current: CurrentUser,
    repo: NotificationRepoDep,
    unread_only: bool = False,
) -> list[NotificationOut]:
    items = await repo.list_for_user(current.id, unread_only=unread_only)
    return [NotificationOut.model_validate(n) for n in items]


@router.get("/unread-count", response_model=UnreadCountOut)
async def unread_count(current: CurrentUser, repo: NotificationRepoDep) -> UnreadCountOut:
    return UnreadCountOut(count=await repo.count_unread(current.id))


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(notification_id: UUID, current: CurrentUser, repo: NotificationRepoDep) -> None:
    ok = await repo.mark_read(notification_id, current.id)
    if not ok:
        raise ApiError(status.HTTP_404_NOT_FOUND, "notification.not_found", "Notification not found")


@router.post("/read-all", response_model=UnreadCountOut)
async def mark_all_read(current: CurrentUser, repo: NotificationRepoDep) -> UnreadCountOut:
    marked = await repo.mark_all_read(current.id)
    return UnreadCountOut(count=marked)
