"""notifications.params: tham số để FE tự ghép câu thông báo theo ngôn ngữ (#29)

Trước đây BE ghép sẵn câu tiếng Việt vào `title` (vd "Bạn được giao phase X") nên không
dịch được. Nay lưu thêm `params` (JSONB, vd {"phase": "X"}); FE dịch theo `type` + `params`.
Thông báo cũ để NULL → FE hiển thị nguyên `title` đã lưu.

Revision ID: 0015_notification_params
Revises: 0014_phase_participants_raci
Create Date: 2026-10-16 00:00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0015_notification_params"
down_revision: str | None = "0014_phase_participants_raci"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("params", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "params")
