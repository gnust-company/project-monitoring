"""Organizations (workspace) + thành viên + danh sách change-request đang chờ."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.use_cases.change_requests import ListPendingChangeRequests
from app.application.use_cases.phase_blocks import ListActivity
from app.application.use_cases.phase_definitions import (
    CreatePhaseDef,
    DeletePhaseDef,
    ListPhaseDefs,
    PhaseDefInUseError,
    PhaseDefNotFoundError,
    ReorderPhaseDefs,
    UpdatePhaseDef,
)
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
    create_phase_def_uc,
    delete_org_uc,
    delete_phase_def_uc,
    get_org_uc,
    list_activity_uc,
    list_orgs_uc,
    list_pending_crs_uc,
    list_phase_defs_uc,
    remove_member_uc,
    rename_org_uc,
    reorder_phase_defs_uc,
    update_phase_def_uc,
)
from app.presentation.api.schemas import (
    ActivityOut,
    ChangeRequestOut,
    MemberAdd,
    OrganizationOut,
    OrgCreate,
    OrgRename,
    PhaseDefCreate,
    PhaseDefinitionOut,
    PhaseDefUpdate,
    PhaseReorderIn,
    UserOut,
)

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])


async def _to_out(
    orgs: OrgRepoDep, org_id: UUID, name: str, current: CurrentUser, description: str = ""
) -> OrganizationOut:
    members = await orgs.list_members(org_id)
    membership = await orgs.get_membership(org_id, current.id)
    my_role = membership.role.value if membership else ("owner" if current.is_superuser else None)
    return OrganizationOut(
        id=org_id, name=name, description=description,
        members=[UserOut.from_entity(u) for u in members], my_role=my_role,
    )


@router.get("", response_model=list[OrganizationOut])
async def list_organizations(
    current: CurrentUser,
    orgs: OrgRepoDep,
    uc: Annotated[ListOrganizations, Depends(list_orgs_uc)],
) -> list[OrganizationOut]:
    result = await uc.execute(current.id)
    return [await _to_out(orgs, o.id, o.name, current, o.description) for o in result]


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: OrgCreate,
    current: CurrentUser,
    orgs: OrgRepoDep,
    uc: Annotated[CreateOrganization, Depends(create_org_uc)],
) -> OrganizationOut:
    org = await uc.execute(body.name, current.id, body.description)
    return await _to_out(orgs, org.id, org.name, current, org.description)


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
    return await _to_out(orgs, org.id, org.name, access.user, org.description)


@router.patch("/{org_id}", response_model=OrganizationOut)
async def rename_organization(
    org_id: UUID,
    body: OrgRename,
    access: ManageDep,
    orgs: OrgRepoDep,
    uc: Annotated[RenameOrganization, Depends(rename_org_uc)],
) -> OrganizationOut:
    try:
        org = await uc.execute(org_id, body.name, body.description)
    except OrgNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return await _to_out(orgs, org.id, org.name, access.user, org.description)


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


@router.get("/{org_id}/recent-activity", response_model=list[ActivityOut])
async def org_recent_activity(
    org_id: UUID,
    access: AccessDep,
    uc: Annotated[ListActivity, Depends(list_activity_uc)],
) -> list[ActivityOut]:
    """#26: toàn bộ hoạt động workspace (vận hành + vòng đời dự án) — cho Dashboard."""
    return [ActivityOut.model_validate(a) for a in await uc.recent_for_org(org_id)]


@router.get("/{org_id}/change-requests", response_model=list[ChangeRequestOut])
async def list_change_requests(
    org_id: UUID,
    access: ManageDep,
    uc: Annotated[ListPendingChangeRequests, Depends(list_pending_crs_uc)],
) -> list[ChangeRequestOut]:
    return [ChangeRequestOut.model_validate(cr) for cr in await uc.execute(org_id)]


# ─── Phase definitions (#26 mảng A — phase động per-workspace) ────────
@router.get("/{org_id}/phases", response_model=list[PhaseDefinitionOut])
async def list_phases(
    org_id: UUID,
    access: AccessDep,
    uc: Annotated[ListPhaseDefs, Depends(list_phase_defs_uc)],
) -> list[PhaseDefinitionOut]:
    """Mọi member đọc được (FE render timeline/dashboard theo phase của workspace)."""
    return [PhaseDefinitionOut.from_entity(p) for p in await uc.execute(org_id)]


@router.post("/{org_id}/phases", response_model=PhaseDefinitionOut, status_code=status.HTTP_201_CREATED)
async def create_phase(
    org_id: UUID,
    body: PhaseDefCreate,
    access: ManageDep,
    uc: Annotated[CreatePhaseDef, Depends(create_phase_def_uc)],
) -> PhaseDefinitionOut:
    phase = await uc.execute(org_id, body.model_dump(mode="json"))
    return PhaseDefinitionOut.from_entity(phase)


@router.post("/{org_id}/phases/reorder", response_model=list[PhaseDefinitionOut])
async def reorder_phases(
    org_id: UUID,
    body: PhaseReorderIn,
    access: ManageDep,
    uc: Annotated[ReorderPhaseDefs, Depends(reorder_phase_defs_uc)],
) -> list[PhaseDefinitionOut]:
    phases = await uc.execute(org_id, body.ordered_ids)
    return [PhaseDefinitionOut.from_entity(p) for p in phases]


@router.patch("/{org_id}/phases/{phase_id}", response_model=PhaseDefinitionOut)
async def update_phase(
    org_id: UUID,
    phase_id: UUID,
    body: PhaseDefUpdate,
    access: ManageDep,
    uc: Annotated[UpdatePhaseDef, Depends(update_phase_def_uc)],
) -> PhaseDefinitionOut:
    try:
        phase = await uc.execute(org_id, phase_id, body.model_dump(mode="json", exclude_unset=True))
    except PhaseDefNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Phase not found")
    return PhaseDefinitionOut.from_entity(phase)


@router.delete("/{org_id}/phases/{phase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_phase(
    org_id: UUID,
    phase_id: UUID,
    access: ManageDep,
    uc: Annotated[DeletePhaseDef, Depends(delete_phase_def_uc)],
    force: bool = False,
) -> None:
    try:
        await uc.execute(org_id, phase_id, force=force)
    except PhaseDefNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Phase not found")
    except PhaseDefInUseError as e:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"message": f"{e.count} block đang dùng phase này", "count": e.count},
        )
