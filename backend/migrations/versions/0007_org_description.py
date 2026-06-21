"""Add organizations.description (#26 Overview workspace)

Workspace có ô mô tả ở form tạo nhưng trước đây bị bỏ đi (không có cột lưu).
Thêm cột description để hiển thị ở view Overview và cho sửa trong Settings.

Revision ID: 0007_org_description
Revises: 0006_creator_nullable
Create Date: 2026-06-21 00:00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0007_org_description"
down_revision: str | None = "0006_creator_nullable"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("organizations", "description")
