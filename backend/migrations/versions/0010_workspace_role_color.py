"""Workspace role color (#26 mảng B+)

Thêm cột màu cho role công việc (workspace_roles.color, khóa palette). Role có sẵn
được backfill theo bộ mặc định (PM=blue, BA=amber, …) để view Nhóm giữ màu cũ; role
tùy biến lạ mặc định 'gray'.

Revision ID: 0010_workspace_role_color
Revises: 0009_workspace_roles
Create Date: 2026-06-22 00:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.domain.roles import DEFAULT_ROLE_COLORS

revision: str = "0010_workspace_role_color"
down_revision: str | None = "0009_workspace_roles"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workspace_roles",
        sa.Column("color", sa.String(length=32), nullable=False, server_default="gray"),
    )
    # Backfill màu cho role mặc định đã seed trước đó (giữ màu cũ ở view Nhóm).
    for code, color in DEFAULT_ROLE_COLORS.items():
        op.execute(
            sa.text("UPDATE workspace_roles SET color = :color WHERE code = :code").bindparams(
                color=color, code=code
            )
        )


def downgrade() -> None:
    op.drop_column("workspace_roles", "color")
