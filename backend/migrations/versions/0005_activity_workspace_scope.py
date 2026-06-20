"""Activity log: workspace-scoped entries for project deletion (#14)

- activity_log.org_id (UUID, nullable, FK organizations ON DELETE CASCADE, indexed):
  sự kiện cấp workspace (vd xóa dự án) gắn org_id thay vì project_id.
- activity_log.project_id → nullable + ON DELETE SET NULL (thay CASCADE) để bản ghi
  "deleted project — lý do …" còn lại sau khi dự án bị xóa.

Revision ID: 0005_activity_ws_scope
Revises: 0004_outcome_attach
Create Date: 2026-06-20 00:00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0005_activity_ws_scope"
down_revision: str | None = "0004_outcome_attach"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PROJECT_FK = "activity_log_project_id_fkey"
_ORG_FK = "activity_log_org_id_fkey"


def upgrade() -> None:
    # org_id cho sự kiện cấp workspace
    op.add_column("activity_log", sa.Column("org_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        _ORG_FK, "activity_log", "organizations",
        ["org_id"], ["id"], ondelete="CASCADE",
    )
    op.create_index("ix_activity_log_org_id", "activity_log", ["org_id"])

    # project_id: nullable + SET NULL (giữ lịch sử sau khi xóa dự án)
    op.alter_column("activity_log", "project_id", existing_type=sa.UUID(), nullable=True)
    op.drop_constraint(_PROJECT_FK, "activity_log", type_="foreignkey")
    op.create_foreign_key(
        _PROJECT_FK, "activity_log", "projects",
        ["project_id"], ["id"], ondelete="SET NULL",
    )


def downgrade() -> None:
    # khôi phục project_id CASCADE + NOT NULL (xóa các dòng org-scoped trước cho an toàn)
    op.execute("DELETE FROM activity_log WHERE project_id IS NULL")
    op.drop_constraint(_PROJECT_FK, "activity_log", type_="foreignkey")
    op.create_foreign_key(
        _PROJECT_FK, "activity_log", "projects",
        ["project_id"], ["id"], ondelete="CASCADE",
    )
    op.alter_column("activity_log", "project_id", existing_type=sa.UUID(), nullable=False)

    op.drop_index("ix_activity_log_org_id", table_name="activity_log")
    op.drop_constraint(_ORG_FK, "activity_log", type_="foreignkey")
    op.drop_column("activity_log", "org_id")
