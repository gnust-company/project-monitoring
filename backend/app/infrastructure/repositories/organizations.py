"""SqlAlchemy cài đặt OrganizationRepository (kèm membership + role)."""
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports import OrganizationRepository
from app.domain.entities import Membership, Organization, User
from app.domain.value_objects import WorkspaceRole
from app.infrastructure.db.models import (
    OrganizationMemberModel,
    OrganizationModel,
    UserModel,
)


def _user_to_entity(m: UserModel) -> User:
    return User(
        id=m.id, email=m.email, name=m.name, role=m.role,
        avatar_url=m.avatar_url, is_superuser=m.is_superuser, created_at=m.created_at,
    )


class SqlAlchemyOrganizationRepository(OrganizationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _member_ids(self, org_id: UUID) -> list[UUID]:
        rows = await self._session.scalars(
            select(OrganizationMemberModel.user_id).where(OrganizationMemberModel.org_id == org_id)
        )
        return list(rows)

    async def get(self, org_id: UUID) -> Organization | None:
        m = await self._session.get(OrganizationModel, org_id)
        if m is None:
            return None
        return Organization(
            id=m.id, name=m.name, description=m.description,
            member_ids=await self._member_ids(org_id), created_at=m.created_at,
        )

    async def list_all(self) -> list[Organization]:
        rows = await self._session.scalars(
            select(OrganizationModel).order_by(OrganizationModel.created_at)
        )
        return [
            Organization(
                id=m.id, name=m.name, description=m.description,
                member_ids=await self._member_ids(m.id), created_at=m.created_at,
            )
            for m in rows
        ]

    async def list_all_memberships(self) -> list[Membership]:
        rows = await self._session.scalars(select(OrganizationMemberModel))
        return [
            Membership(user_id=m.user_id, org_id=m.org_id, role=m.role, joined_at=m.joined_at)
            for m in rows
        ]

    async def list_for_user(self, user_id: UUID) -> list[Organization]:
        org_ids = await self._session.scalars(
            select(OrganizationMemberModel.org_id).where(OrganizationMemberModel.user_id == user_id)
        )
        result: list[Organization] = []
        for oid in org_ids:
            org = await self.get(oid)
            if org:
                result.append(org)
        return result

    async def create(self, org: Organization) -> Organization:
        m = OrganizationModel(id=org.id, name=org.name, description=org.description)
        self._session.add(m)
        await self._session.flush()
        return Organization(
            id=m.id, name=m.name, description=m.description, member_ids=[], created_at=m.created_at
        )

    async def update(
        self, org_id: UUID, name: str | None = None, description: str | None = None
    ) -> Organization | None:
        """#26: cập nhật name và/hoặc description (chỉ field được truyền)."""
        m = await self._session.get(OrganizationModel, org_id)
        if m is None:
            return None
        if name is not None:
            m.name = name
        if description is not None:
            m.description = description
        await self._session.flush()
        return Organization(
            id=m.id, name=m.name, description=m.description,
            member_ids=await self._member_ids(org_id),
        )

    async def delete(self, org_id: UUID) -> None:
        await self._session.execute(delete(OrganizationModel).where(OrganizationModel.id == org_id))

    async def add_member(
        self, org_id: UUID, user_id: UUID, role: WorkspaceRole = WorkspaceRole.MEMBER
    ) -> None:
        existing = await self._session.get(OrganizationMemberModel, (org_id, user_id))
        if existing:
            existing.role = role
        else:
            self._session.add(OrganizationMemberModel(org_id=org_id, user_id=user_id, role=role))
        await self._session.flush()

    async def remove_member(self, org_id: UUID, user_id: UUID) -> None:
        await self._session.execute(
            delete(OrganizationMemberModel).where(
                OrganizationMemberModel.org_id == org_id,
                OrganizationMemberModel.user_id == user_id,
            )
        )

    async def get_membership(self, org_id: UUID, user_id: UUID) -> Membership | None:
        m = await self._session.get(OrganizationMemberModel, (org_id, user_id))
        if m is None:
            return None
        return Membership(user_id=m.user_id, org_id=m.org_id, role=m.role, joined_at=m.joined_at)

    async def list_members(self, org_id: UUID) -> list[User]:
        rows = await self._session.scalars(
            select(UserModel)
            .join(OrganizationMemberModel, OrganizationMemberModel.user_id == UserModel.id)
            .where(OrganizationMemberModel.org_id == org_id)
            .order_by(OrganizationMemberModel.joined_at)
        )
        return [_user_to_entity(u) for u in rows]

    async def list_owner_ids(self, org_id: UUID) -> list[UUID]:
        rows = await self._session.scalars(
            select(OrganizationMemberModel.user_id).where(
                OrganizationMemberModel.org_id == org_id,
                OrganizationMemberModel.role == WorkspaceRole.OWNER,
            )
        )
        return list(rows)
