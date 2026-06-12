"""Pydantic DTOs — JSON shape khớp docs/API_CONTRACT.md (camelCase).

DTO chỉ sống ở tầng presentation; chuyển đổi sang/từ domain entity tại router.
"""
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.domain.value_objects import DevPhase, PhaseTag, ProjectStatus, UserRole


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ─── Project ─────────────────────────────────────────────────────────
class ProjectOut(CamelModel):
    id: UUID
    org_id: UUID
    name: str
    description: str
    status: ProjectStatus
    start_date: date
    target_date: date
    progress: int
    created_by: UUID
    created_at: datetime | None = None


class ProjectCreate(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""
    start_date: date
    target_date: date
    status: ProjectStatus = ProjectStatus.ON_TRACK


class ProjectUpdate(CamelModel):
    name: str | None = None
    description: str | None = None
    status: ProjectStatus | None = None
    start_date: date | None = None
    target_date: date | None = None
    progress: int | None = Field(default=None, ge=0, le=100)


# ─── Phase block (DTO cho các router sẽ implement tiếp) ──────────────
class PhaseItemOut(CamelModel):
    id: UUID
    kind: str
    text: str
    done: bool
    role: UserRole | None = None
    position: int


class PhaseBlockOut(CamelModel):
    id: UUID
    project_id: UUID
    phase_type: DevPhase
    tag: PhaseTag
    title: str
    description: str
    start_date: date
    end_date: date
    actual_end_date: date | None = None
    display_row: int | None = None
    created_by: UUID
    assignee: UUID
    participant_ids: list[UUID] = []
    items: list[PhaseItemOut] = []
