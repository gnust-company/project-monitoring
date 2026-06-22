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
from app.application.use_cases.workspace_roles import (
    AssignMemberRole,
    CreateRole,
    DeleteRole,
    ListRoles,
    ReorderRoles,
    RoleForbiddenError,
    RoleNotFoundError,
    UpdateRole,
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
    assign_member_role_uc,
    create_org_uc,
    create_phase_def_uc,
    create_role_uc,
    delete_org_uc,
    delete_phase_def_uc,
    delete_role_uc,
    get_org_uc,
    list_activity_uc,
    list_orgs_uc,
    list_pending_crs_uc,
    list_phase_defs_uc,
    list_roles_uc,
    remove_member_uc,
    rename_org_uc,
    reorder_phase_defs_uc,
    reorder_roles_uc,
    update_phase_def_uc,
    update_role_uc,
)
from app.presentation.api.schemas import (
    ActivityOut,
    ChangeRequestOut,
    MemberAdd,
    MemberRoleUpdate,
    OrganizationOut,
    OrgCreate,
    OrgRename,
    PhaseDefCreate,
    PhaseDefinitionOut,
    PhaseDefUpdate,
    PhaseReorderIn,
    RoleCreate,
    RoleReorderIn,
    RoleUpdate,
    UserOut,
    WorkspaceRoleOut,
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
        members=[UserOut.from_entity(u, job_role) for u, job_role in members], my_role=my_role,
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
    return [UserOut.from_entity(u, job_role) for u, job_role in await uc.members(org_id)]


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


# ─── Workspace roles (#26 mảng B — role công việc per-workspace) ──────
@router.get("/{org_id}/roles", response_model=list[WorkspaceRoleOut])
async def list_roles(
    org_id: UUID,
    access: AccessDep,
    uc: Annotated[ListRoles, Depends(list_roles_uc)],
) -> list[WorkspaceRoleOut]:
    return [WorkspaceRoleOut.model_validate(r) for r in await uc.execute(org_id)]


@router.post("/{org_id}/roles", response_model=WorkspaceRoleOut, status_code=status.HTTP_201_CREATED)
async def create_role(
    org_id: UUID,
    body: RoleCreate,
    access: ManageDep,
    uc: Annotated[CreateRole, Depends(create_role_uc)],
) -> WorkspaceRoleOut:
    return WorkspaceRoleOut.model_validate(await uc.execute(org_id, body.model_dump(mode="json")))


@router.post("/{org_id}/roles/reorder", response_model=list[WorkspaceRoleOut])
async def reorder_roles(
    org_id: UUID,
    body: RoleReorderIn,
    access: ManageDep,
    uc: Annotated[ReorderRoles, Depends(reorder_roles_uc)],
) -> list[WorkspaceRoleOut]:
    return [WorkspaceRoleOut.model_validate(r) for r in await uc.execute(org_id, body.ordered_ids)]


@router.patch("/{org_id}/roles/{role_id}", response_model=WorkspaceRoleOut)
async def update_role(
    org_id: UUID,
    role_id: UUID,
    body: RoleUpdate,
    access: ManageDep,
    uc: Annotated[UpdateRole, Depends(update_role_uc)],
) -> WorkspaceRoleOut:
    try:
        role = await uc.execute(org_id, role_id, body.model_dump(mode="json", exclude_unset=True))
    except RoleNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Role not found")
    return WorkspaceRoleOut.model_validate(role)


@router.delete("/{org_id}/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    org_id: UUID,
    role_id: UUID,
    access: ManageDep,
    uc: Annotated[DeleteRole, Depends(delete_role_uc)],
) -> None:
    try:
        await uc.execute(org_id, role_id)
    except RoleNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Role not found")


@router.patch("/{org_id}/members/{user_id}/role", status_code=status.HTTP_204_NO_CONTENT)
async def set_member_role(
    org_id: UUID,
    user_id: UUID,
    body: MemberRoleUpdate,
    access: AccessDep,
    uc: Annotated[AssignMemberRole, Depends(assign_member_role_uc)],
) -> None:
    """Owner gán role cho bất kỳ ai; user thường tự đổi role của chính mình."""
    try:
        await uc.execute(org_id, user_id, body.role, access.user)
    except RoleForbiddenError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Không có quyền đổi role này")
    except RoleNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Role không tồn tại trong workspace")
