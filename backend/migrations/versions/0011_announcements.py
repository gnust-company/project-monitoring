"""Announcements — kênh thông báo từ Admin (#27)

Admin (superuser) tạo announcement có title + body (markdown) + khoảng thời gian
hiển thị (starts_at/ends_at). Trong khoảng đó, user đăng nhập sẽ thấy modal.
Bảng dismiss per-user để user ẩn 1 thông báo "hôm nay / tuần này".

Revision ID: 0011_announcements
Revises: 0010_workspace_role_color
Create Date: 2026-06-22 00:00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0011_announcements"
down_revision: str | None = "0010_workspace_role_color"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "announcements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # Lọc theo time-range nhanh.
    op.create_index("ix_announcements_window", "announcements", ["starts_at", "ends_at"])

    op.create_table(
        "announcement_dismissals",
        sa.Column(
            "announcement_id",
            UUID(as_uuid=True),
            sa.ForeignKey("announcements.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("scope", sa.String(length=8), nullable=False),  # 'day' | 'week'
        sa.Column("dismissed_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("announcement_dismissals")
    op.drop_index("ix_announcements_window", table_name="announcements")
    op.drop_table("announcements")
