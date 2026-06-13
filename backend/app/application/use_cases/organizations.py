"""Use cases cho Organization (workspace) + quản lý thành viên."""
from uuid import UUID, uuid4

from app.application.notifications import NotificationService
from app.application.ports import OrganizationRepository, UserRepository
from app.domain.entities import Organization, User
from app.domain.value_objects import WorkspaceRole


class OrgNotFoundError(Exception):
    pass


class UserNotFoundError(Exception):
    pass


class CreateOrganization:
    def __init__(self, orgs: OrganizationRepository) -> None:
        self._orgs = orgs

    async def execute(self, name: str, creator_id: UUID) -> Organization:
        org = await self._orgs.create(Organization(id=uuid4(), name=name))
        await self._orgs.add_member(org.id, creator_id, WorkspaceRole.OWNER)
        org.member_ids = [creator_id]
        return org


class ListOrganizations:
    def __init__(self, orgs: OrganizationRepository) -> None:
        self._orgs = orgs

    async def execute(self, user_id: UUID) -> list[Organization]:
        return await self._orgs.list_for_user(user_id)


class GetOrganization:
    def __init__(self, orgs: OrganizationRepository) -> None:
        self._orgs = orgs

    async def execute(self, org_id: UUID) -> Organization:
        org = await self._orgs.get(org_id)
        if org is None:
            raise OrgNotFoundError(str(org_id))
        return org

    async def members(self, org_id: UUID) -> list[User]:
        return await self._orgs.list_members(org_id)


class RenameOrganization:
    def __init__(self, orgs: OrganizationRepository) -> None:
        self._orgs = orgs

    async def execute(self, org_id: UUID, name: str) -> Organization:
        org = await self._orgs.rename(org_id, name)
        if org is None:
            raise OrgNotFoundError(str(org_id))
        return org


class DeleteOrganization:
    def __init__(self, orgs: OrganizationRepository) -> None:
        self._orgs = orgs

    async def execute(self, org_id: UUID) -> None:
        await self._orgs.delete(org_id)


class AddMember:
    def __init__(
        self, orgs: OrganizationRepository, users: UserRepository, notifier: NotificationService
    ) -> None:
        self._orgs = orgs
        self._users = users
        self._notifier = notifier

    async def execute(self, org_id: UUID, email: str, actor: User) -> User:
        user = await self._users.get_by_email(email)
        if user is None:
            raise UserNotFoundError(email)
        org = await self._orgs.get(org_id)
        await self._orgs.add_member(org_id, user.id, WorkspaceRole.MEMBER)
        await self._notifier.notify(
            user.id, "member_added",
            f"Bạn được thêm vào workspace {org.name if org else ''}".strip(),
            org_id=org_id,
        )
        return user


class RemoveMember:
    def __init__(self, orgs: OrganizationRepository, notifier: NotificationService) -> None:
        self._orgs = orgs
        self._notifier = notifier

    async def execute(self, org_id: UUID, user_id: UUID) -> None:
        org = await self._orgs.get(org_id)
        await self._orgs.remove_member(org_id, user_id)
        await self._notifier.notify(
            user_id, "member_removed",
            f"Bạn đã bị xóa khỏi workspace {org.name if org else ''}".strip(),
            org_id=org_id,
        )
