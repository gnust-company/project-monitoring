"""Projects router — list/create/get + sửa/xóa/đổi PIC theo quyền PIC (#11)."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.authz import can_access_workspace
from app.application.use_cases.projects import (
    ChangeProjectPic,
    CreateProject,
    CreateProjectInput,
    DeleteProject,
    GetProject,
    ListProjectsByOrg,
    ProjectForbiddenError,
    ProjectNotFoundError,
    UpdateProject,
)
from app.presentation.api.deps import (
    AccessDep,
    CurrentUser,
    OrgRepoDep,
    change_project_pic_uc,
    create_project_uc,
    delete_project_uc,
    get_project_uc,
    list_projects_uc,
    update_project_uc,
)
from app.presentation.api.schemas import (
    ProjectCreate,
    ProjectOut,
    ProjectPicUpdate,
    ProjectUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["projects"])


@router.get("/organizations/{org_id}/projects", response_model=list[ProjectOut])
async def list_projects(
    org_id: UUID,
    access: AccessDep,
    uc: Annotated[ListProjectsByOrg, Depends(list_projects_uc)],
) -> list[ProjectOut]:
    projects = await uc.execute(org_id)
    return [ProjectOut.model_validate(p) for p in projects]


@router.post(
    "/organizations/{org_id}/projects",
    response_model=ProjectOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(
    org_id: UUID,
    body: ProjectCreate,
    access: AccessDep,
    uc: Annotated[CreateProject, Depends(create_project_uc)],
) -> ProjectOut:
    project = await uc.execute(CreateProjectInput(
        org_id=org_id, name=body.name, description=body.description,
        start_date=body.start_date, target_date=body.target_date,
        status=body.status, created_by=access.user.id,
    ))
    return ProjectOut.model_validate(project)


async def _require_project_access(
    project_id: UUID, current: CurrentUser, orgs: OrgRepoDep,
    get_uc: GetProject,
):
    """Load project + membership; 404 nếu không có, 403 nếu ngoài workspace."""
    try:
        project = await get_uc.execute(project_id)
    except ProjectNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    membership = await orgs.get_membership(project.org_id, current.id)
    if not can_access_workspace(current, membership):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")
    return project, membership


@router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: UUID,
    current: CurrentUser,
    orgs: OrgRepoDep,
    get_uc: Annotated[GetProject, Depends(get_project_uc)],
) -> ProjectOut:
    project, _ = await _require_project_access(project_id, current, orgs, get_uc)
    return ProjectOut.model_validate(project)


@router.patch("/projects/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    current: CurrentUser,
    orgs: OrgRepoDep,
    get_uc: Annotated[GetProject, Depends(get_project_uc)],
    uc: Annotated[UpdateProject, Depends(update_project_uc)],
):
    await _require_project_access(project_id, current, orgs, get_uc)
    payload = body.model_dump(mode="json", exclude_unset=True, by_alias=False)
    try:
        project = await uc.execute(project_id, payload, current)
    except ProjectNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    except ProjectForbiddenError as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(e))
    return ProjectOut.model_validate(project)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    current: CurrentUser,
    orgs: OrgRepoDep,
    get_uc: Annotated[GetProject, Depends(get_project_uc)],
    uc: Annotated[DeleteProject, Depends(delete_project_uc)],
):
    await _require_project_access(project_id, current, orgs, get_uc)
    try:
        await uc.execute(project_id, current)
    except ProjectNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    except ProjectForbiddenError as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(e))
    return None


@router.patch("/projects/{project_id}/pic", response_model=ProjectOut)
async def change_pic(
    project_id: UUID,
    body: ProjectPicUpdate,
    current: CurrentUser,
    orgs: OrgRepoDep,
    get_uc: Annotated[GetProject, Depends(get_project_uc)],
    uc: Annotated[ChangeProjectPic, Depends(change_project_pic_uc)],
):
    _, membership = await _require_project_access(project_id, current, orgs, get_uc)
    try:
        project = await uc.execute(project_id, body.pic_user_id, current, membership)
    except ProjectNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    except ProjectForbiddenError as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(e))
    return ProjectOut.model_validate(project)
