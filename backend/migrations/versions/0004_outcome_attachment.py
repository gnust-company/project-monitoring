"""Outcome-level attachments (Wave 3: #9)

Additive-only — KHÔNG xóa cột/bảng (ràng buộc on-air):
- attachments.outcome_item_id (UUID, nullable, FK phase_items ON DELETE CASCADE).
  NULL = attachment cấp phase (như cũ). Có giá trị = đính kèm cho một outcome item,
  dùng để gate "mark done" (outcome phải có ≥1 document/link mới được tick).

Revision ID: 0004_outcome_attach
Revises: 0003_pic_optional
Create Date: 2026-06-18 00:00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0004_outcome_attach"
down_revision: str | None = "0003_pic_optional"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("attachments", sa.Column("outcome_item_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_attachments_outcome_item_id_phase_items",
        "attachments", "phase_items",
        ["outcome_item_id"], ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_attachments_outcome_item_id", "attachments", ["outcome_item_id"])


def downgrade() -> None:
    op.drop_index("ix_attachments_outcome_item_id", table_name="attachments")
    op.drop_constraint("fk_attachments_outcome_item_id_phase_items", "attachments", type_="foreignkey")
    op.drop_column("attachments", "outcome_item_id")
