"""Ports — abstract repositories do application layer định nghĩa.

Infrastructure layer cài đặt các interface này (SQLAlchemy/PostgreSQL).
Use case chỉ phụ thuộc vào ports, không bao giờ import infrastructure.
"""
from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.entities import (
    ActivityEntry,
    Attachment,
    ChangeRequest,
    Comment,
    Membership,
    Notification,
    Organization,
    PhaseBlock,
    PhaseDefinition,
    PhaseItem,
    Project,
    User,
    WorkspaceRoleDef,
)
from app.domain.value_objects import WorkspaceRole


class UserRepository(ABC):
    @abstractmethod
    async def get(self, user_id: UUID) -> User | None: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def get_password_hash(self, user_id: UUID) -> str | None: ...

    @abstractmethod
    async def create(self, user: User, password_hash: str) -> User: ...

    @abstractmethod
    async def update(self, user: User) -> User: ...

    @abstractmethod
    async def update_password(self, user_id: UUID, password_hash: str) -> None: ...

    @abstractmethod
    async def delete(self, user_id: UUID) -> None: ...

    @abstractmethod
    async def list_all(self) -> list[User]: ...

    @abstractmethod
    async def count(self) -> int: ...

    @abstractmethod
    async def set_password(self, user_id: UUID, password_hash: str) -> bool:
        """Đặt lại mật khẩu (hash đã tính sẵn). True nếu user tồn tại."""
        ...

    @abstractmethod
    async def set_superuser(self, user_id: UUID, value: bool) -> bool:
        """Cấp/thu hồi quyền admin toàn cục. True nếu user tồn tại."""
        ...


class OrganizationRepository(ABC):
    @abstractmethod
    async def get(self, org_id: UUID) -> Organization | None: ...

    @abstractmethod
    async def list_all(self) -> list[Organization]: ...

    @abstractmethod
    async def list_all_memberships(self) -> list[Membership]:
        """Toàn bộ membership (mọi workspace) — dùng cho thống kê admin."""
        ...

    @abstractmethod
    async def list_for_user(self, user_id: UUID) -> list[Organization]: ...

    @abstractmethod
    async def create(self, org: Organization) -> Organization: ...

    @abstractmethod
    async def update(
        self, org_id: UUID, name: str | None = None, description: str | None = None
    ) -> Organization | None: ...

    @abstractmethod
    async def delete(self, org_id: UUID) -> None: ...

    @abstractmethod
    async def add_member(
        self, org_id: UUID, user_id: UUID, role: WorkspaceRole = WorkspaceRole.MEMBER,
        job_role: str | None = None,
    ) -> None: ...

    @abstractmethod
    async def set_member_job_role(self, org_id: UUID, user_id: UUID, job_role: str | None) -> None: ...

    @abstractmethod
    async def remove_member(self, org_id: UUID, user_id: UUID) -> None: ...

    @abstractmethod
    async def get_membership(self, org_id: UUID, user_id: UUID) -> Membership | None: ...

    @abstractmethod
    async def list_members(self, org_id: UUID) -> list[tuple[User, str | None]]:
        """#26 mảng B: (User, job_role code) trong workspace này."""
        ...

    @abstractmethod
    async def list_owner_ids(self, org_id: UUID) -> list[UUID]: ...


class ChangeRequestRepository(ABC):
    @abstractmethod
    async def get(self, cr_id: UUID) -> ChangeRequest | None: ...

    @abstractmethod
    async def create(self, cr: ChangeRequest) -> ChangeRequest: ...

    @abstractmethod
    async def update(self, cr: ChangeRequest) -> ChangeRequest: ...

    @abstractmethod
    async def list_pending_by_org(self, org_id: UUID) -> list[ChangeRequest]: ...


class NotificationRepository(ABC):
    @abstractmethod
    async def create(self, notification: Notification) -> Notification: ...

    @abstractmethod
    async def list_for_user(self, user_id: UUID, *, unread_only: bool = False) -> list[Notification]: ...

    @abstractmethod
    async def count_unread(self, user_id: UUID) -> int: ...

    @abstractmethod
    async def mark_read(self, notification_id: UUID, user_id: UUID) -> bool: ...

    @abstractmethod
    async def mark_all_read(self, user_id: UUID) -> int: ...


class ProjectRepository(ABC):
    @abstractmethod
    async def get(self, project_id: UUID) -> Project | None: ...

    @abstractmethod
    async def list_by_org(self, org_id: UUID) -> list[Project]: ...

    @abstractmethod
    async def count_all(self) -> int: ...

    @abstractmethod
    async def count_by_org(self) -> dict[UUID, int]:
        """Số dự án theo từng workspace (org_id → count)."""
        ...

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
    async def count_all(self) -> int: ...

    @abstractmethod
    async def get_project_id(self, block_id: UUID) -> UUID | None: ...

    @abstractmethod
    async def create(self, block: PhaseBlock) -> PhaseBlock: ...

    @abstractmethod
    async def update(self, block: PhaseBlock) -> PhaseBlock: ...

    @abstractmethod
    async def delete(self, block_id: UUID) -> None: ...

    # ── Items ────────────────────────────────────────────────────────
    @abstractmethod
    async def add_item(self, block_id: UUID, item: PhaseItem) -> PhaseItem: ...

    @abstractmethod
    async def get_item(self, item_id: UUID) -> PhaseItem | None: ...

    @abstractmethod
    async def update_item(self, item: PhaseItem) -> PhaseItem: ...

    @abstractmethod
    async def delete_item(self, item_id: UUID) -> None: ...

    # ── Comments ─────────────────────────────────────────────────────
    @abstractmethod
    async def add_comment(self, block_id: UUID, comment: Comment) -> Comment: ...

    @abstractmethod
    async def list_comments(self, block_id: UUID) -> list[Comment]: ...

    # ── Attachments ──────────────────────────────────────────────────
    @abstractmethod
    async def add_attachment(self, block_id: UUID, attachment: Attachment) -> Attachment: ...

    @abstractmethod
    async def count_outcome_attachments(self, item_id: UUID) -> int: ...

    @abstractmethod
    async def get_attachment(self, attachment_id: UUID) -> Attachment | None: ...

    @abstractmethod
    async def list_attachments(self, block_id: UUID) -> list[Attachment]: ...

    @abstractmethod
    async def delete_attachment(self, attachment_id: UUID) -> None: ...

    @abstractmethod
    async def file_attachment_urls_by_project(self, project_id: UUID) -> list[str]:
        """URL của mọi attachment kind=FILE thuộc dự án (để xóa object MinIO, #21)."""
        ...

    @abstractmethod
    async def file_attachment_urls_by_org(self, org_id: UUID) -> list[str]:
        """URL của mọi attachment kind=FILE thuộc workspace (#21)."""
        ...


class ActivityLogRepository(ABC):
    """Nhật ký — phase changelog (theo block) và project changelog (theo project)."""

    @abstractmethod
    async def add(self, entry: ActivityEntry) -> ActivityEntry: ...

    @abstractmethod
    async def list_by_phase(self, block_id: UUID) -> list[ActivityEntry]: ...

    @abstractmethod
    async def list_by_project(self, project_id: UUID) -> list[ActivityEntry]: ...

    @abstractmethod
    async def list_recent_for_org(self, org_id: UUID, limit: int = 50) -> list[ActivityEntry]: ...


class PhaseDefinitionRepository(ABC):
    """#26 (mảng A): định nghĩa phase theo từng workspace (thay enum dev_phase + templates)."""

    @abstractmethod
    async def list_by_org(self, org_id: UUID) -> list[PhaseDefinition]: ...

    @abstractmethod
    async def get(self, phase_id: UUID) -> PhaseDefinition | None: ...

    @abstractmethod
    async def create(self, phase: PhaseDefinition) -> PhaseDefinition: ...

    @abstractmethod
    async def update(self, phase: PhaseDefinition, *, replace_items: bool = False) -> PhaseDefinition: ...

    @abstractmethod
    async def delete(self, phase_id: UUID) -> None: ...

    @abstractmethod
    async def count_blocks_using(self, org_id: UUID, code: str) -> int:
        """Số phase_block trong workspace đang dùng phase code này (cảnh báo trước khi xóa)."""
        ...

    @abstractmethod
    async def cascade_rename_code(self, org_id: UUID, old_code: str, new_code: str) -> None:
        """Đổi MÃ phase: cập nhật phase_type của mọi block đang dùng old_code → new_code."""
        ...

    @abstractmethod
    async def seed_defaults(self, org_id: UUID) -> None:
        """Seed 7 phase mặc định cho 1 workspace mới."""
        ...


class WorkspaceRoleRepository(ABC):
    """#26 (mảng B): role công việc theo workspace (thay enum UserRole toàn cục)."""

    @abstractmethod
    async def list_by_org(self, org_id: UUID) -> list[WorkspaceRoleDef]: ...

    @abstractmethod
    async def get(self, role_id: UUID) -> WorkspaceRoleDef | None: ...

    @abstractmethod
    async def create(self, role: WorkspaceRoleDef) -> WorkspaceRoleDef: ...

    @abstractmethod
    async def update(self, role: WorkspaceRoleDef) -> WorkspaceRoleDef: ...

    @abstractmethod
    async def delete(self, role_id: UUID) -> None: ...

    @abstractmethod
    async def cascade_remove_role(self, org_id: UUID, code: str) -> None:
        """Xóa role kéo theo checklist/outcome mặc định + gỡ khỏi item/membership."""
        ...

    @abstractmethod
    async def cascade_rename_role(self, org_id: UUID, old_code: str, new_code: str) -> None:
        """Đổi MÃ role: cập nhật mọi tham chiếu code (checklist/outcome mặc định, item
        phase đang chạy, job_role thành viên) từ old_code sang new_code trong workspace."""
        ...

    @abstractmethod
    async def count_members_using(self, org_id: UUID, code: str) -> int: ...

    @abstractmethod
    async def seed_defaults(self, org_id: UUID) -> None:
        """Seed 8 role mặc định cho 1 workspace mới."""
        ...


class ObjectStorage(ABC):
    """Lưu trữ object (S3-compatible / MinIO) cho document & avatar."""

    @abstractmethod
    async def put(self, bucket: str, key: str, data: bytes, content_type: str) -> str:
        """Lưu object, trả về URL công khai để tải."""
        ...

    @abstractmethod
    async def delete(self, bucket: str, key: str) -> None: ...

    @abstractmethod
    def public_url(self, bucket: str, key: str) -> str: ...

    @abstractmethod
    def key_from_url(self, bucket: str, url: str) -> str | None:
        """Tách key từ public URL (để xóa). None nếu URL không thuộc bucket này."""
        ...
