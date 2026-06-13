"""Duyệt / từ chối ChangeRequest — chỉ owner/superuser của workspace."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.authz import can_manage_workspace
from app.application.use_cases.change_requests import (
    ApproveChangeRequest,
    ChangeRequestNotFoundError,
    ChangeRequestNotPendingError,
    RejectChangeRequest,
)
from app.presentation.api.deps import (
    ChangeRequestRepoDep,
    CurrentUser,
    OrgRepoDep,
    approve_cr_uc,
    reject_cr_uc,
)
from app.presentation.api.schemas import ChangeRequestOut

router = APIRouter(prefix="/api/v1/change-requests", tags=["change-requests"])


async def _guard_owner(cr_id: UUID, current: CurrentUser, crs: ChangeRequestRepoDep, orgs: OrgRepoDep):
    cr = await crs.get(cr_id)
    if cr is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Change request not found")
    membership = await orgs.get_membership(cr.org_id, current.id)
    if not can_manage_workspace(current, membership):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Owner permission required")
    return cr


@router.post("/{cr_id}/approve", response_model=ChangeRequestOut)
async def approve(
    cr_id: UUID,
    current: CurrentUser,
    crs: ChangeRequestRepoDep,
    orgs: OrgRepoDep,
    uc: Annotated[ApproveChangeRequest, Depends(approve_cr_uc)],
) -> ChangeRequestOut:
    await _guard_owner(cr_id, current, crs, orgs)
    try:
        cr = await uc.execute(cr_id, current.id)
    except ChangeRequestNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Change request not found")
    except ChangeRequestNotPendingError:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Change request already resolved")
    return ChangeRequestOut.model_validate(cr)


@router.post("/{cr_id}/reject", response_model=ChangeRequestOut)
async def reject(
    cr_id: UUID,
    current: CurrentUser,
    crs: ChangeRequestRepoDep,
    orgs: OrgRepoDep,
    uc: Annotated[RejectChangeRequest, Depends(reject_cr_uc)],
) -> ChangeRequestOut:
    await _guard_owner(cr_id, current, crs, orgs)
    try:
        cr = await uc.execute(cr_id, current.id)
    except ChangeRequestNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Change request not found")
    except ChangeRequestNotPendingError:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Change request already resolved")
    return ChangeRequestOut.model_validate(cr)
