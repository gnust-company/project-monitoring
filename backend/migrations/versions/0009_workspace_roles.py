"""Workspace roles per-workspace (#26 mảng B)

Bỏ role công việc toàn cục trên User; role nay theo workspace (bảng workspace_roles,
tùy biến per-org). organization_members.job_role lưu code role trong workspace đó;
phase_definition_items.role / phase_items.role chuyển enum user_role → VARCHAR (code).
Org hiện có được seed 8 role mặc định; membership backfill role từ users.role cũ.

Revision ID: 0009_workspace_roles
Revises: 0008_phase_definitions
Create Date: 2026-06-22 00:00:00
"""
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.domain.roles import DEFAULT_ROLES

revision: str = "0009_workspace_roles"
down_revision: str | None = "0008_phase_definitions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_USER_ROLE_VALUES = ("PM", "BA", "SW_Architect", "SysOps", "UI_Designer", "GUI", "SW_Developer", "SW_Tester")


def upgrade() -> None:
    op.create_table(
        "workspace_roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("org_id", "code"),
    )
    op.create_index("ix_workspace_roles_org_id", "workspace_roles", ["org_id"])

    # Seed 8 role mặc định cho mỗi org hiện có.
    bind = op.get_bind()
    org_ids = [row[0] for row in bind.execute(sa.text("SELECT id FROM organizations"))]
    rows = [
        {"id": uuid.uuid4(), "org_id": org_id, "code": code, "name": name, "position": pos}
        for org_id in org_ids
        for pos, (code, name) in enumerate(DEFAULT_ROLES)
    ]
    if rows:
        op.bulk_insert(
            sa.table(
                "workspace_roles",
                sa.column("id", postgresql.UUID(as_uuid=True)),
                sa.column("org_id", postgresql.UUID(as_uuid=True)),
                sa.column("code", sa.String()),
                sa.column("name", sa.String()),
                sa.column("position", sa.Integer()),
            ),
            rows,
        )

    # organization_members.job_role + backfill từ users.role cũ.
    op.add_column("organization_members", sa.Column("job_role", sa.String(length=32), nullable=True))
    op.execute(
        "UPDATE organization_members m SET job_role = u.role::text "
        "FROM users u WHERE u.id = m.user_id"
    )

    # item.role: enum user_role → varchar(32) (giữ code cũ).
    for table in ("phase_definition_items", "phase_items"):
        op.alter_column(
            table, "role",
            existing_type=postgresql.ENUM(*_USER_ROLE_VALUES, name="user_role"),
            type_=sa.String(length=32),
            existing_nullable=True,
            postgresql_using="role::text",
        )

    op.drop_column("users", "role")
    # enum user_role giữ lại (dormant) — migration lịch sử tham chiếu.


def downgrade() -> None:
    # Best-effort (dev): khôi phục users.role, đảo item.role về enum, bỏ job_role + bảng roles.
    op.add_column(
        "users",
        sa.Column("role", postgresql.ENUM(*_USER_ROLE_VALUES, name="user_role", create_type=False),
                  nullable=False, server_default="PM"),
    )
    op.execute(
        "UPDATE users u SET role = m.job_role::user_role FROM organization_members m "
        "WHERE m.user_id = u.id AND m.job_role IS NOT NULL"
    )
    for table in ("phase_definition_items", "phase_items"):
        op.alter_column(
            table, "role",
            existing_type=sa.String(length=32),
            type_=postgresql.ENUM(*_USER_ROLE_VALUES, name="user_role", create_type=False),
            existing_nullable=True,
            postgresql_using="role::user_role",
        )
    op.drop_column("organization_members", "job_role")
    op.drop_index("ix_workspace_roles_org_id", table_name="workspace_roles")
    op.drop_table("workspace_roles")
