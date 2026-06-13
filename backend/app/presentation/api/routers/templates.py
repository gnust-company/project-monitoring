"""Templates — checklist/outcome mặc định theo phase (thay PHASE_ROLE_TASKS ở FE)."""
from typing import Annotated

from fastapi import APIRouter, Depends

from app.application.use_cases.templates import GetPhaseTasks
from app.domain.value_objects import DevPhase
from app.presentation.api.deps import CurrentUser, get_phase_tasks_uc

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])


@router.get("/phase-tasks")
async def phase_tasks(
    phase: DevPhase,
    current: CurrentUser,
    uc: Annotated[GetPhaseTasks, Depends(get_phase_tasks_uc)],
) -> dict:
    return await uc.execute(phase)
