"""Users / Profile — xem & cập nhật hồ sơ, đổi avatar (MinIO),
đổi mật khẩu, xóa tài khoản của chính mình."""
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.application.use_cases.users import (
    ChangePassword,
    DeleteAccount,
    InvalidPasswordError,
    SetAvatar,
    UpdateProfile,
)
from app.presentation.api.deps import (
    CurrentUser,
    change_password_uc,
    delete_account_uc,
    set_avatar_uc,
    update_profile_uc,
)
from app.presentation.api.schemas import PasswordChange, ProfileUpdate, UserOut

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
    user = await uc.execute(current, name=body.name)
    return UserOut.from_entity(user)


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: PasswordChange,
    current: CurrentUser,
    uc: Annotated[ChangePassword, Depends(change_password_uc)],
) -> None:
    try:
        await uc.execute(current, body.current_password, body.new_password)
    except InvalidPasswordError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    current: CurrentUser,
    uc: Annotated[DeleteAccount, Depends(delete_account_uc)],
) -> None:
    await uc.execute(current)


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    current: CurrentUser,
    uc: Annotated[SetAvatar, Depends(set_avatar_uc)],
    file: Annotated[UploadFile, File()],
) -> UserOut:
    data = await file.read()
    user = await uc.execute(current, file.filename or "avatar", file.content_type or "", data)
    return UserOut.from_entity(user)
