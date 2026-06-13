"""seed phase_task_templates

Revision ID: 0002_seed_templates
Revises: 2259af3ee742
Create Date: 2026-06-13
"""
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ENUM, UUID

from app.domain.phase_templates import iter_template_rows

revision: str = "0002_seed_templates"
down_revision: str | None = "2259af3ee742"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_templates = sa.table(
    "phase_task_templates",
    sa.column("id", UUID(as_uuid=True)),
    sa.column("phase_type", ENUM(name="dev_phase", create_type=False)),
    sa.column("role", ENUM(name="user_role", create_type=False)),
    sa.column("kind", ENUM(name="phase_item_kind", create_type=False)),
    sa.column("text", sa.Text),
    sa.column("position", sa.Integer),
)


def upgrade() -> None:
    op.bulk_insert(_templates, [{"id": uuid.uuid4(), **row} for row in iter_template_rows()])


def downgrade() -> None:
    op.execute("DELETE FROM phase_task_templates")
