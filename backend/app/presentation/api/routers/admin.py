"""Admin router (chỉ superuser) — thống kê hệ thống, danh sách user/workspace,
reset mật khẩu user. Mọi endpoint yêu cầu `require_superuser`.
"""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.use_cases.admin import (
    CannotModifySelfError,
    GetAdminStats,
    ListAllUsers,
    ListAllWorkspaces,
    ResetUserPassword,
    SetSuperuser,
    UserNotFoundError,
)
from app.presentation.api.deps import (
    SuperuserDep,
    admin_stats_uc,
    list_all_users_uc,
    list_all_workspaces_uc,
    reset_password_uc,
    set_superuser_uc,
)
from app.presentation.api.schemas import (
    AdminStatsOut,
    AdminUserOut,
    AdminWorkspaceOut,
    ResetPasswordIn,
    SetSuperuserIn,
    UserOut,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsOut)
async def admin_stats(
    _: SuperuserDep,
    uc: Annotated[GetAdminStats, Depends(admin_stats_uc)],
) -> AdminStatsOut:
    s = await uc.execute()
    return AdminStatsOut(
        user_count=s.user_count,
        superuser_count=s.superuser_count,
        workspace_count=s.workspace_count,
        project_count=s.project_count,
        phase_block_count=s.phase_block_count,
    )


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    _: SuperuserDep,
    uc: Annotated[ListAllUsers, Depends(list_all_users_uc)],
) -> list[AdminUserOut]:
    infos = await uc.execute()
    return [
        AdminUserOut(
            id=i.user.id, email=i.user.email, name=i.user.name, role=i.user.role,
            avatar=i.user.avatar_url, is_superuser=i.user.is_superuser,
            created_at=i.user.created_at, workspace_count=i.workspace_count,
        )
        for i in infos
    ]


@router.get("/workspaces", response_model=list[AdminWorkspaceOut])
async def list_workspaces(
    _: SuperuserDep,
    uc: Annotated[ListAllWorkspaces, Depends(list_all_workspaces_uc)],
) -> list[AdminWorkspaceOut]:
    infos = await uc.execute()
    return [
        AdminWorkspaceOut(
            id=i.org.id, name=i.org.name, created_at=i.org.created_at,
            member_count=i.member_count, project_count=i.project_count,
            owners=[UserOut.from_entity(o) for o in i.owners],
        )
        for i in infos
    ]


@router.post("/users/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    user_id: UUID,
    body: ResetPasswordIn,
    _: SuperuserDep,
    uc: Annotated[ResetUserPassword, Depends(reset_password_uc)],
) -> None:
    try:
        await uc.execute(user_id, body.new_password)
    except UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")


@router.post("/users/{user_id}/superuser", status_code=status.HTTP_204_NO_CONTENT)
async def set_superuser(
    user_id: UUID,
    body: SetSuperuserIn,
    current: SuperuserDep,
    uc: Annotated[SetSuperuser, Depends(set_superuser_uc)],
) -> None:
    try:
        await uc.execute(current.id, user_id, body.is_superuser)
    except CannotModifySelfError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cannot change your own admin status")
    except UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
