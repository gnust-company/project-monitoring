"""Projects router — ví dụ end-to-end: router → use case → repository.

Các router còn lại (organizations, phase-blocks, auth...) implement theo
cùng pattern này, hợp đồng chi tiết ở docs/API_CONTRACT.md.
"""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.use_cases.projects import (
    CreateProject,
    CreateProjectInput,
    GetProject,
    ListProjectsByOrg,
    ProjectNotFoundError,
)
from app.presentation.api.deps import create_project_uc, get_project_uc, list_projects_uc
from app.presentation.api.schemas import ProjectCreate, ProjectOut

router = APIRouter(prefix="/api/v1", tags=["projects"])

# TODO(auth): thay bằng user lấy từ JWT khi có endpoint auth
FAKE_CURRENT_USER = UUID("00000000-0000-0000-0000-000000000001")


@router.get("/organizations/{org_id}/projects", response_model=list[ProjectOut])
async def list_projects(
    org_id: UUID,
    uc: Annotated[ListProjectsByOrg, Depends(list_projects_uc)],
) -> list[ProjectOut]:
    projects = await uc.execute(org_id)
    return [ProjectOut.model_validate(p) for p in projects]


@router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: UUID,
    uc: Annotated[GetProject, Depends(get_project_uc)],
) -> ProjectOut:
    try:
        project = await uc.execute(project_id)
    except ProjectNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectOut.model_validate(project)


@router.post(
    "/organizations/{org_id}/projects",
    response_model=ProjectOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(
    org_id: UUID,
    body: ProjectCreate,
    uc: Annotated[CreateProject, Depends(create_project_uc)],
) -> ProjectOut:
    project = await uc.execute(CreateProjectInput(
        org_id=org_id,
        name=body.name,
        description=body.description,
        start_date=body.start_date,
        target_date=body.target_date,
        status=body.status,
        created_by=FAKE_CURRENT_USER,
    ))
    return ProjectOut.model_validate(project)
