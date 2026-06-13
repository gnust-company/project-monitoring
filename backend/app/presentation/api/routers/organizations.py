"""Organizations (workspace) + thành viên + danh sách change-request đang chờ."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.use_cases.change_requests import ListPendingChangeRequests
from app.application.use_cases.organizations import (
    AddMember,
    CreateOrganization,
    DeleteOrganization,
    GetOrganization,
    ListOrganizations,
    OrgNotFoundError,
    RemoveMember,
    RenameOrganization,
    UserNotFoundError,
)
from app.presentation.api.deps import (
    AccessDep,
    CurrentUser,
    ManageDep,
    OrgRepoDep,
    add_member_uc,
    create_org_uc,
    delete_org_uc,
    get_org_uc,
    list_orgs_uc,
    list_pending_crs_uc,
    remove_member_uc,
    rename_org_uc,
)
from app.presentation.api.schemas import (
    ChangeRequestOut,
    MemberAdd,
    OrganizationOut,
    OrgCreate,
    OrgRename,
    UserOut,
)

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])


async def _to_out(orgs: OrgRepoDep, org_id: UUID, name: str) -> OrganizationOut:
    members = await orgs.list_members(org_id)
    return OrganizationOut(id=org_id, name=name, members=[UserOut.from_entity(u) for u in members])


@router.get("", response_model=list[OrganizationOut])
async def list_organizations(
    current: CurrentUser,
    orgs: OrgRepoDep,
    uc: Annotated[ListOrganizations, Depends(list_orgs_uc)],
) -> list[OrganizationOut]:
    result = await uc.execute(current.id)
    return [await _to_out(orgs, o.id, o.name) for o in result]


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: OrgCreate,
    current: CurrentUser,
    orgs: OrgRepoDep,
    uc: Annotated[CreateOrganization, Depends(create_org_uc)],
) -> OrganizationOut:
    org = await uc.execute(body.name, current.id)
    return await _to_out(orgs, org.id, org.name)


@router.get("/{org_id}", response_model=OrganizationOut)
async def get_organization(
    org_id: UUID,
    access: AccessDep,
    orgs: OrgRepoDep,
    uc: Annotated[GetOrganization, Depends(get_org_uc)],
) -> OrganizationOut:
    try:
        org = await uc.execute(org_id)
    except OrgNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return await _to_out(orgs, org.id, org.name)


@router.patch("/{org_id}", response_model=OrganizationOut)
async def rename_organization(
    org_id: UUID,
    body: OrgRename,
    access: ManageDep,
    orgs: OrgRepoDep,
    uc: Annotated[RenameOrganization, Depends(rename_org_uc)],
) -> OrganizationOut:
    try:
        org = await uc.execute(org_id, body.name)
    except OrgNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return await _to_out(orgs, org.id, org.name)


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: UUID,
    access: ManageDep,
    uc: Annotated[DeleteOrganization, Depends(delete_org_uc)],
) -> None:
    await uc.execute(org_id)


@router.get("/{org_id}/members", response_model=list[UserOut])
async def list_members(
    org_id: UUID,
    access: AccessDep,
    uc: Annotated[GetOrganization, Depends(get_org_uc)],
) -> list[UserOut]:
    return [UserOut.from_entity(u) for u in await uc.members(org_id)]


@router.post("/{org_id}/members", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def add_member(
    org_id: UUID,
    body: MemberAdd,
    access: ManageDep,
    uc: Annotated[AddMember, Depends(add_member_uc)],
) -> UserOut:
    try:
        user = await uc.execute(org_id, body.email, access.user)
    except UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No user with that email")
    return UserOut.from_entity(user)


@router.delete("/{org_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    org_id: UUID,
    user_id: UUID,
    access: ManageDep,
    uc: Annotated[RemoveMember, Depends(remove_member_uc)],
) -> None:
    await uc.execute(org_id, user_id)


@router.get("/{org_id}/change-requests", response_model=list[ChangeRequestOut])
async def list_change_requests(
    org_id: UUID,
    access: ManageDep,
    uc: Annotated[ListPendingChangeRequests, Depends(list_pending_crs_uc)],
) -> list[ChangeRequestOut]:
    return [ChangeRequestOut.model_validate(cr) for cr in await uc.execute(org_id)]
