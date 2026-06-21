"""Make creator/author columns nullable to match their SET NULL FK (#21 audit)

Lỗ hổng phát hiện khi rà soát xóa cascade: 3 cột FK người dùng đặt ondelete=SET NULL
nhưng cột lại NOT NULL → xóa 1 user từng tạo dự án/phase hoặc viết comment làm cả
lệnh DELETE user thất bại (NotNullViolation). Cho nullable để SET NULL chạy được:

- projects.created_by
- phase_blocks.created_by
- comments.author_id

Revision ID: 0006_creator_nullable
Revises: 0005_activity_ws_scope
Create Date: 2026-06-21 00:00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0006_creator_nullable"
down_revision: str | None = "0005_activity_ws_scope"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_COLS = [
    ("projects", "created_by"),
    ("phase_blocks", "created_by"),
    ("comments", "author_id"),
]


def upgrade() -> None:
    for table, col in _COLS:
        op.alter_column(table, col, existing_type=sa.UUID(), nullable=True)


def downgrade() -> None:
    # Khôi phục NOT NULL: dọn các dòng đã bị SET NULL trước để không vi phạm.
    op.execute("DELETE FROM comments WHERE author_id IS NULL")
    op.execute("DELETE FROM phase_blocks WHERE created_by IS NULL")
    op.execute("DELETE FROM projects WHERE created_by IS NULL")
    for table, col in _COLS:
        op.alter_column(table, col, existing_type=sa.UUID(), nullable=False)
