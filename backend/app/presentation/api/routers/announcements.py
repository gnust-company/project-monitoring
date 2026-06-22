"""Announcements router (#27) — kênh thông báo từ admin.

- Tạo/sửa/xóa + xem toàn bộ: chỉ superuser (`SuperuserDep`).
- Xem thông báo đang hiệu lực + đánh dấu ẩn: mọi user đã đăng nhập.
"""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.use_cases.announcements import (
    AnnouncementNotFoundError,
    CreateAnnouncement,
    DeleteAnnouncement,
    DismissAnnouncement,
    InvalidAnnouncementError,
    InvalidDismissScopeError,
    ListActiveAnnouncements,
    ListAllAnnouncements,
    UpdateAnnouncement,
)
from app.presentation.api.deps import (
    CurrentUser,
    SuperuserDep,
    create_announcement_uc,
    delete_announcement_uc,
    dismiss_announcement_uc,
    list_active_announcements_uc,
    list_all_announcements_uc,
    update_announcement_uc,
)
from app.presentation.api.schemas import (
    AnnouncementCreate,
    AnnouncementDismissIn,
    AnnouncementOut,
    AnnouncementUpdate,
)

router = APIRouter(prefix="/api/v1/announcements", tags=["announcements"])


@router.get("/active", response_model=list[AnnouncementOut])
async def list_active(
    current: CurrentUser,
    uc: Annotated[ListActiveAnnouncements, Depends(list_active_announcements_uc)],
) -> list[AnnouncementOut]:
    items = await uc.execute(current.id)
    return [AnnouncementOut.model_validate(a) for a in items]


@router.post("/{announcement_id}/dismiss", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss(
    announcement_id: UUID,
    body: AnnouncementDismissIn,
    current: CurrentUser,
    uc: Annotated[DismissAnnouncement, Depends(dismiss_announcement_uc)],
) -> None:
    try:
        await uc.execute(announcement_id, current.id, body.scope)
    except InvalidDismissScopeError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="scope phải là 'day' hoặc 'week'")
    except AnnouncementNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Announcement not found")


@router.get("", response_model=list[AnnouncementOut])
async def list_all(
    _: SuperuserDep,
    uc: Annotated[ListAllAnnouncements, Depends(list_all_announcements_uc)],
) -> list[AnnouncementOut]:
    items = await uc.execute()
    return [AnnouncementOut.model_validate(a) for a in items]


@router.post("", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
async def create(
    body: AnnouncementCreate,
    current: SuperuserDep,
    uc: Annotated[CreateAnnouncement, Depends(create_announcement_uc)],
) -> AnnouncementOut:
    try:
        a = await uc.execute(body.model_dump(), current.id)
    except InvalidAnnouncementError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    return AnnouncementOut.model_validate(a)


@router.patch("/{announcement_id}", response_model=AnnouncementOut)
async def update(
    announcement_id: UUID,
    body: AnnouncementUpdate,
    _: SuperuserDep,
    uc: Annotated[UpdateAnnouncement, Depends(update_announcement_uc)],
) -> AnnouncementOut:
    try:
        a = await uc.execute(announcement_id, body.model_dump(exclude_unset=True))
    except AnnouncementNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    except InvalidAnnouncementError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    return AnnouncementOut.model_validate(a)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    announcement_id: UUID,
    _: SuperuserDep,
    uc: Annotated[DeleteAnnouncement, Depends(delete_announcement_uc)],
) -> None:
    try:
        await uc.execute(announcement_id)
    except AnnouncementNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Announcement not found")
