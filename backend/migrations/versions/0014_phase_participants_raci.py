"""phase_participants: phân loại RACI + cho phép người ngoài nền tảng (#34)

Trước đây participant chỉ là cặp (phase_block_id, user_id) và buộc phải là account trong
nền tảng. #34: người tham gia có thể là người ngoài nền tảng (chỉ để logging) nên ghi
bằng tên tự do, và mỗi người được phân loại theo ma trận RACI.

- `id` UUID làm PK mới (PK cũ (phase_block_id, user_id) không còn hợp vì user_id nay nullable).
- `user_id` nullable + `display_name` mới; CHECK đúng một trong hai.
- `raci` enum R/A/C/I. Backfill participant cũ = 'R' (trước đây là những người trực tiếp làm).
- Unique một phần (phase_block_id, user_id) khi user_id NOT NULL → 1 user chỉ 1 lần / phase.

Revision ID: 0014_phase_participants_raci
Revises: 0013_project_position
Create Date: 2026-10-02 00:00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0014_phase_participants_raci"
down_revision: str | None = "0013_project_position"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    postgresql.ENUM("R", "A", "C", "I", name="raci_role").create(op.get_bind(), checkfirst=True)

    # id: thêm nullable → điền cho hàng cũ → NOT NULL → đổi PK
    op.add_column("phase_participants", sa.Column("id", postgresql.UUID(as_uuid=True), nullable=True))
    op.execute("UPDATE phase_participants SET id = gen_random_uuid()")
    op.alter_column("phase_participants", "id", nullable=False)
    op.drop_constraint("phase_participants_pkey", "phase_participants", type_="primary")
    op.create_primary_key("phase_participants_pkey", "phase_participants", ["id"])

    op.alter_column("phase_participants", "user_id", nullable=True)
    op.add_column("phase_participants", sa.Column("display_name", sa.String(120), nullable=True))
    op.add_column(
        "phase_participants",
        sa.Column(
            "raci", postgresql.ENUM(name="raci_role", create_type=False),
            nullable=False, server_default="R",
        ),
    )
    op.create_check_constraint(
        "ck_phase_participants_identity", "phase_participants",
        "(user_id IS NOT NULL) <> (display_name IS NOT NULL)",
    )
    op.create_index(
        "uq_phase_participants_user", "phase_participants", ["phase_block_id", "user_id"],
        unique=True, postgresql_where=sa.text("user_id IS NOT NULL"),
    )
    op.create_index("ix_phase_participants_phase_block_id", "phase_participants", ["phase_block_id"])


def downgrade() -> None:
    # Người ngoài nền tảng (không có user_id) không biểu diễn được ở schema cũ → bỏ.
    op.execute("DELETE FROM phase_participants WHERE user_id IS NULL")
    op.drop_index("ix_phase_participants_phase_block_id", table_name="phase_participants")
    op.drop_index("uq_phase_participants_user", table_name="phase_participants")
    op.drop_constraint("ck_phase_participants_identity", "phase_participants", type_="check")
    op.drop_column("phase_participants", "raci")
    op.drop_column("phase_participants", "display_name")
    op.alter_column("phase_participants", "user_id", nullable=False)
    op.drop_constraint("phase_participants_pkey", "phase_participants", type_="primary")
    op.create_primary_key("phase_participants_pkey", "phase_participants", ["phase_block_id", "user_id"])
    op.drop_column("phase_participants", "id")
    postgresql.ENUM(name="raci_role").drop(op.get_bind(), checkfirst=True)
