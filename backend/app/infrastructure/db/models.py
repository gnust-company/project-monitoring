"""SQLAlchemy ORM models — ánh xạ docs/SCHEMA.md.

Chỉ tầng infrastructure được import file này. Mapper giữa ORM model và
domain entity nằm trong từng repository.
"""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.domain.value_objects import (
    AttachmentKind,
    DevPhase,
    PhaseItemKind,
    PhaseTag,
    ProjectStatus,
    UserRole,
)


class Base(DeclarativeBase):
    pass


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _uuid_pk()
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(1024))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e]))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OrganizationModel(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    members: Mapped[list["OrganizationMemberModel"]] = relationship(back_populates="organization")


class OrganizationMemberModel(Base):
    __tablename__ = "organization_members"
    __table_args__ = (UniqueConstraint("org_id", "user_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organization: Mapped[OrganizationModel] = relationship(back_populates="members")


class ProjectModel(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = _uuid_pk()
    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, name="project_status", values_callable=lambda e: [m.value for m in e]),
        default=ProjectStatus.ON_TRACK,
    )
    start_date: Mapped[date] = mapped_column(Date)
    target_date: Mapped[date] = mapped_column(Date)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PhaseBlockModel(Base):
    __tablename__ = "phase_blocks"

    id: Mapped[uuid.UUID] = _uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    phase_type: Mapped[DevPhase] = mapped_column(
        Enum(DevPhase, name="dev_phase", values_callable=lambda e: [m.value for m in e])
    )
    tag: Mapped[PhaseTag] = mapped_column(
        Enum(PhaseTag, name="phase_tag", values_callable=lambda e: [m.value for m in e]),
        default=PhaseTag.TODO,
    )
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    actual_end_date: Mapped[date | None] = mapped_column(Date)
    display_row: Mapped[int | None] = mapped_column(Integer)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    assignee: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    items: Mapped[list["PhaseItemModel"]] = relationship(
        cascade="all, delete-orphan", order_by="PhaseItemModel.position"
    )
    participants: Mapped[list["PhaseParticipantModel"]] = relationship(cascade="all, delete-orphan")
    comments: Mapped[list["CommentModel"]] = relationship(
        cascade="all, delete-orphan", order_by="CommentModel.created_at"
    )
    attachments: Mapped[list["AttachmentModel"]] = relationship(cascade="all, delete-orphan")
    activity: Mapped[list["ActivityLogModel"]] = relationship(
        cascade="all, delete-orphan", order_by="ActivityLogModel.created_at.desc()"
    )


class PhaseParticipantModel(Base):
    __tablename__ = "phase_participants"

    phase_block_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("phase_blocks.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )


class PhaseItemModel(Base):
    """Checklist item hoặc outcome — phân biệt bằng `kind`."""
    __tablename__ = "phase_items"

    id: Mapped[uuid.UUID] = _uuid_pk()
    phase_block_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("phase_blocks.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[PhaseItemKind] = mapped_column(
        Enum(PhaseItemKind, name="phase_item_kind", values_callable=lambda e: [m.value for m in e])
    )
    text: Mapped[str] = mapped_column(Text)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    role: Mapped[UserRole | None] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e],
             create_type=False)
    )
    position: Mapped[int] = mapped_column(Integer, default=0)


class CommentModel(Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = _uuid_pk()
    phase_block_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("phase_blocks.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AttachmentModel(Base):
    __tablename__ = "attachments"

    id: Mapped[uuid.UUID] = _uuid_pk()
    phase_block_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("phase_blocks.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[AttachmentKind] = mapped_column(
        Enum(AttachmentKind, name="attachment_kind", values_callable=lambda e: [m.value for m in e])
    )
    file_name: Mapped[str] = mapped_column(String(512))
    url: Mapped[str] = mapped_column(String(2048))
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ActivityLogModel(Base):
    __tablename__ = "activity_log"

    id: Mapped[uuid.UUID] = _uuid_pk()
    phase_block_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("phase_blocks.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(255))
    target: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PhaseTaskTemplateModel(Base):
    """Nguồn checklist/outcome mặc định theo (phase, role) — seed từ PHASE_ROLE_TASKS."""
    __tablename__ = "phase_task_templates"

    id: Mapped[uuid.UUID] = _uuid_pk()
    phase_type: Mapped[DevPhase] = mapped_column(
        Enum(DevPhase, name="dev_phase", values_callable=lambda e: [m.value for m in e],
             create_type=False)
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e],
             create_type=False)
    )
    kind: Mapped[PhaseItemKind] = mapped_column(
        Enum(PhaseItemKind, name="phase_item_kind", values_callable=lambda e: [m.value for m in e],
             create_type=False)
    )
    text: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer, default=0)
