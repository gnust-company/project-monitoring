"""Thêm projects.position — thứ tự hiển thị dự án trong workspace (#31)

Trước đây dự án luôn xếp theo created_at. #31: owner có thể kéo-thả sắp lại thứ tự
hiển thị (cột trái Pipeline, sidebar, dashboard). Lưu bằng cột `position` dùng chung
cả workspace. Backfill = thứ tự created_at hiện tại (per-org) để không đổi bố cục cũ.

Revision ID: 0013_project_position
Revises: 0012_phase_default_names_en
Create Date: 2026-07-06 00:00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0013_project_position"
down_revision: str | None = "0012_phase_default_names_en"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )
    # Backfill: mỗi workspace đánh số 0..n theo created_at (giữ đúng thứ tự cũ).
    op.execute(
        """
        UPDATE projects p SET position = s.rn
        FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY org_id ORDER BY created_at, id) - 1 AS rn
            FROM projects
        ) s
        WHERE p.id = s.id
        """
    )


def downgrade() -> None:
    op.drop_column("projects", "position")
