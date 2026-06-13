"""Users / Profile — xem & cập nhật hồ sơ, đổi avatar (MinIO)."""
from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile

from app.application.use_cases.users import SetAvatar, UpdateProfile
from app.presentation.api.deps import CurrentUser, set_avatar_uc, update_profile_uc
from app.presentation.api.schemas import ProfileUpdate, UserOut

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(current: CurrentUser) -> UserOut:
    return UserOut.from_entity(current)


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: ProfileUpdate,
    current: CurrentUser,
    uc: Annotated[UpdateProfile, Depends(update_profile_uc)],
) -> UserOut:
    user = await uc.execute(current, name=body.name, role=body.role)
    return UserOut.from_entity(user)


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    current: CurrentUser,
    uc: Annotated[SetAvatar, Depends(set_avatar_uc)],
    file: Annotated[UploadFile, File()],
) -> UserOut:
    data = await file.read()
    user = await uc.execute(current, file.filename or "avatar", file.content_type or "", data)
    return UserOut.from_entity(user)
