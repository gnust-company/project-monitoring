"""SqlAlchemy cài đặt WorkspaceRoleRepository (#26 mảng B — role công việc per-org)."""
from uuid import UUID, uuid4

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports import WorkspaceRoleRepository
from app.domain.entities import WorkspaceRoleDef
from app.domain.roles import DEFAULT_ROLES
from app.infrastructure.db.models import (
    OrganizationMemberModel,
    PhaseBlockModel,
    PhaseDefinitionItemModel,
    PhaseDefinitionModel,
    PhaseItemModel,
    ProjectModel,
    WorkspaceRoleModel,
)


def _to_entity(m: WorkspaceRoleModel) -> WorkspaceRoleDef:
    return WorkspaceRoleDef(
        id=m.id, org_id=m.org_id, code=m.code, name=m.name,
        position=m.position, created_at=m.created_at,
    )


class SqlAlchemyWorkspaceRoleRepository(WorkspaceRoleRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_org(self, org_id: UUID) -> list[WorkspaceRoleDef]:
        rows = await self._session.scalars(
            select(WorkspaceRoleModel).where(WorkspaceRoleModel.org_id == org_id)
            .order_by(WorkspaceRoleModel.position)
        )
        return [_to_entity(m) for m in rows]

    async def get(self, role_id: UUID) -> WorkspaceRoleDef | None:
        m = await self._session.get(WorkspaceRoleModel, role_id)
        return _to_entity(m) if m else None

    async def create(self, role: WorkspaceRoleDef) -> WorkspaceRoleDef:
        m = WorkspaceRoleModel(
            id=role.id, org_id=role.org_id, code=role.code, name=role.name, position=role.position,
        )
        self._session.add(m)
        await self._session.flush()
        return _to_entity(m)

    async def update(self, role: WorkspaceRoleDef) -> WorkspaceRoleDef:
        m = await self._session.get(WorkspaceRoleModel, role.id)
        if m is None:
            raise LookupError(f"WorkspaceRole {role.id} not found")
        m.name = role.name
        m.position = role.position
        await self._session.flush()
        return _to_entity(m)

    async def delete(self, role_id: UUID) -> None:
        await self._session.execute(
            delete(WorkspaceRoleModel).where(WorkspaceRoleModel.id == role_id)
        )

    async def cascade_remove_role(self, org_id: UUID, code: str) -> None:
        """Xóa role kéo theo: bỏ checklist/outcome mặc định gắn role; gỡ role khỏi
        item phase đang chạy + khỏi membership (đặt NULL)."""
        # checklist/outcome mặc định của role → xóa hẳn (link Role↔Phase, #26)
        await self._session.execute(
            delete(PhaseDefinitionItemModel).where(
                PhaseDefinitionItemModel.role == code,
                PhaseDefinitionItemModel.phase_def_id.in_(
                    select(PhaseDefinitionModel.id).where(PhaseDefinitionModel.org_id == org_id)
                ),
            )
        )
        # item phase (instance) → gỡ role về NULL (giữ item)
        await self._session.execute(
            update(PhaseItemModel).where(
                PhaseItemModel.role == code,
                PhaseItemModel.phase_block_id.in_(
                    select(PhaseBlockModel.id)
                    .join(ProjectModel, ProjectModel.id == PhaseBlockModel.project_id)
                    .where(ProjectModel.org_id == org_id)
                ),
            ).values(role=None)
        )
        # membership đang giữ role → NULL
        await self._session.execute(
            update(OrganizationMemberModel).where(
                OrganizationMemberModel.org_id == org_id,
                OrganizationMemberModel.job_role == code,
            ).values(job_role=None)
        )
        await self._session.flush()

    async def count_members_using(self, org_id: UUID, code: str) -> int:
        return await self._session.scalar(
            select(func.count()).select_from(OrganizationMemberModel).where(
                OrganizationMemberModel.org_id == org_id,
                OrganizationMemberModel.job_role == code,
            )
        ) or 0

    async def seed_defaults(self, org_id: UUID) -> None:
        for pos, (code, name) in enumerate(DEFAULT_ROLES):
            await self.create(WorkspaceRoleDef(
                id=uuid4(), org_id=org_id, code=code, name=name, position=pos,
            ))
