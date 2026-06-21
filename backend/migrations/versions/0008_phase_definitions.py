"""Phase definitions per-workspace (#26 mảng A)

Thay enum cứng `dev_phase` + bảng global `phase_task_templates` bằng bảng định nghĩa
phase theo từng workspace: `phase_definitions` (+ `phase_definition_items`). Mỗi org
hiện có được seed 7 phase mặc định; `phase_blocks.phase_type` chuyển từ enum sang
varchar (lưu code của phase definition).

Revision ID: 0008_phase_definitions
Revises: 0007_org_description
Create Date: 2026-06-21 00:00:00
"""
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.domain.phase_templates import default_phases, iter_template_rows

revision: str = "0008_phase_definitions"
down_revision: str | None = "0007_org_description"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DEV_PHASE_VALUES = ("PA", "SA", "SD", "SI", "ST", "DEP", "OM")


def upgrade() -> None:
    op.create_table(
        "phase_definitions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("color", sa.String(length=32), nullable=False, server_default="gray"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("org_id", "code"),
    )
    op.create_index("ix_phase_definitions_org_id", "phase_definitions", ["org_id"])

    op.create_table(
        "phase_definition_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phase_def_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", postgresql.ENUM(name="phase_item_kind", create_type=False), nullable=False),
        sa.Column("role", postgresql.ENUM(name="user_role", create_type=False), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["phase_def_id"], ["phase_definitions.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_phase_definition_items_phase_def_id", "phase_definition_items", ["phase_def_id"]
    )

    # Seed 7 phase mặc định cho MỖI workspace hiện có.
    bind = op.get_bind()
    org_ids = [row[0] for row in bind.execute(sa.text("SELECT id FROM organizations"))]
    def_rows: list[dict] = []
    item_rows: list[dict] = []
    for org_id in org_ids:
        for spec in default_phases():
            def_id = uuid.uuid4()
            def_rows.append({
                "id": def_id, "org_id": org_id, "code": spec["code"], "name": spec["name"],
                "full_name": spec["full_name"], "description": spec["description"],
                "color": spec["color"], "position": spec["position"],
            })
            for role, kind, text, pos in spec["items"]:
                item_rows.append({
                    "id": uuid.uuid4(), "phase_def_id": def_id, "kind": kind,
                    "role": role, "text": text, "position": pos,
                })
    if def_rows:
        op.bulk_insert(_phase_def_table(), def_rows)
        op.bulk_insert(_phase_def_item_table(), item_rows)

    # phase_blocks.phase_type: enum dev_phase → varchar(32) (giữ giá trị code cũ).
    op.alter_column(
        "phase_blocks", "phase_type",
        existing_type=postgresql.ENUM(*_DEV_PHASE_VALUES, name="dev_phase"),
        type_=sa.String(length=32),
        existing_nullable=False,
        postgresql_using="phase_type::text",
    )

    op.drop_table("phase_task_templates")
    op.execute("DROP TYPE dev_phase")


def downgrade() -> None:
    dev_phase = postgresql.ENUM(*_DEV_PHASE_VALUES, name="dev_phase")
    dev_phase.create(op.get_bind(), checkfirst=True)

    op.alter_column(
        "phase_blocks", "phase_type",
        existing_type=sa.String(length=32),
        type_=postgresql.ENUM(*_DEV_PHASE_VALUES, name="dev_phase"),
        existing_nullable=False,
        postgresql_using="phase_type::dev_phase",
    )

    op.create_table(
        "phase_task_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phase_type", postgresql.ENUM(name="dev_phase", create_type=False), nullable=False),
        sa.Column("role", postgresql.ENUM(name="user_role", create_type=False), nullable=False),
        sa.Column("kind", postgresql.ENUM(name="phase_item_kind", create_type=False), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )
    op.bulk_insert(
        sa.table(
            "phase_task_templates",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("phase_type", postgresql.ENUM(name="dev_phase", create_type=False)),
            sa.column("role", postgresql.ENUM(name="user_role", create_type=False)),
            sa.column("kind", postgresql.ENUM(name="phase_item_kind", create_type=False)),
            sa.column("text", sa.Text()),
            sa.column("position", sa.Integer()),
        ),
        [{"id": uuid.uuid4(), **row} for row in iter_template_rows()],
    )

    op.drop_index("ix_phase_definition_items_phase_def_id", table_name="phase_definition_items")
    op.drop_table("phase_definition_items")
    op.drop_index("ix_phase_definitions_org_id", table_name="phase_definitions")
    op.drop_table("phase_definitions")


def _phase_def_table() -> sa.Table:
    return sa.table(
        "phase_definitions",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("org_id", postgresql.UUID(as_uuid=True)),
        sa.column("code", sa.String()),
        sa.column("name", sa.String()),
        sa.column("full_name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("color", sa.String()),
        sa.column("position", sa.Integer()),
    )


def _phase_def_item_table() -> sa.Table:
    return sa.table(
        "phase_definition_items",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("phase_def_id", postgresql.UUID(as_uuid=True)),
        sa.column("kind", postgresql.ENUM(name="phase_item_kind", create_type=False)),
        sa.column("role", postgresql.ENUM(name="user_role", create_type=False)),
        sa.column("text", sa.Text()),
        sa.column("position", sa.Integer()),
    )
