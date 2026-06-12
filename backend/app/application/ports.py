"""Ports — abstract repositories do application layer định nghĩa.

Infrastructure layer cài đặt các interface này (SQLAlchemy/PostgreSQL).
Use case chỉ phụ thuộc vào ports, không bao giờ import infrastructure.
"""
from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.entities import (
    ActivityEntry,
    Attachment,
    Comment,
    Organization,
    PhaseBlock,
    PhaseItem,
    PhaseTaskTemplate,
    Project,
    User,
)
from app.domain.value_objects import DevPhase


class UserRepository(ABC):
    @abstractmethod
    async def get(self, user_id: UUID) -> User | None: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def create(self, user: User, password_hash: str) -> User: ...


class OrganizationRepository(ABC):
    @abstractmethod
    async def get(self, org_id: UUID) -> Organization | None: ...

    @abstractmethod
    async def list_for_user(self, user_id: UUID) -> list[Organization]: ...

    @abstractmethod
    async def create(self, org: Organization) -> Organization: ...

    @abstractmethod
    async def add_member(self, org_id: UUID, user_id: UUID) -> None: ...

    @abstractmethod
    async def list_members(self, org_id: UUID) -> list[User]: ...


class ProjectRepository(ABC):
    @abstractmethod
    async def get(self, project_id: UUID) -> Project | None: ...

    @abstractmethod
    async def list_by_org(self, org_id: UUID) -> list[Project]: ...

    @abstractmethod
    async def create(self, project: Project) -> Project: ...

    @abstractmethod
    async def update(self, project: Project) -> Project: ...

    @abstractmethod
    async def delete(self, project_id: UUID) -> None: ...


class PhaseBlockRepository(ABC):
    @abstractmethod
    async def get(self, block_id: UUID) -> PhaseBlock | None: ...

    @abstractmethod
    async def list_by_project(self, project_id: UUID) -> list[PhaseBlock]: ...

    @abstractmethod
    async def list_by_org(self, org_id: UUID) -> list[PhaseBlock]: ...

    @abstractmethod
    async def create(self, block: PhaseBlock) -> PhaseBlock: ...

    @abstractmethod
    async def update(self, block: PhaseBlock) -> PhaseBlock: ...

    @abstractmethod
    async def delete(self, block_id: UUID) -> None: ...

    # ── Sub-resources ────────────────────────────────────────────────
    @abstractmethod
    async def add_item(self, block_id: UUID, item: PhaseItem) -> PhaseItem: ...

    @abstractmethod
    async def update_item(self, item: PhaseItem) -> PhaseItem: ...

    @abstractmethod
    async def delete_item(self, item_id: UUID) -> None: ...

    @abstractmethod
    async def add_comment(self, block_id: UUID, comment: Comment) -> Comment: ...

    @abstractmethod
    async def add_attachment(self, block_id: UUID, attachment: Attachment) -> Attachment: ...

    @abstractmethod
    async def delete_attachment(self, attachment_id: UUID) -> None: ...

    @abstractmethod
    async def add_activity(self, block_id: UUID, entry: ActivityEntry) -> ActivityEntry: ...


class PhaseTaskTemplateRepository(ABC):
    """Nguồn checklist/outcome mặc định theo phase — thay PHASE_ROLE_TASKS ở FE."""

    @abstractmethod
    async def list_by_phase(self, phase: DevPhase) -> list[PhaseTaskTemplate]: ...
