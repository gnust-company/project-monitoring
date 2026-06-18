"""pic_user_id + optional assignee/target_date (Wave 2: #11, #13, #20)

Additive-only — KHÔNG xóa cột/bảng (ràng buộc on-air):
- projects.pic_user_id (UUID, nullable, FK users ON DELETE SET NULL), backfill = created_by.
- phase_blocks.assignee: bỏ NOT NULL (#13 — PIC phase = created_by, assignee chỉ là note).
- projects.target_date: bỏ NOT NULL (#20 — dự án không có ngày kết thúc).

Revision ID: 0003_pic_optional
Revises: 0002_seed_templates
Create Date: 2026-06-18 00:00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0003_pic_optional"
down_revision: str | None = "0002_seed_templates"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # #11 — Project PIC (mặc định = người tạo).
    op.add_column("projects", sa.Column("pic_user_id", sa.UUID(), nullable=True))
    op.execute("UPDATE projects SET pic_user_id = created_by WHERE pic_user_id IS NULL")
    op.create_foreign_key(
        "fk_projects_pic_user_id_users",
        "projects", "users",
        ["pic_user_id"], ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_projects_pic_user_id", "projects", ["pic_user_id"])

    # #13 — phase assignee nullable (chuyển sang "note", PIC = created_by).
    op.alter_column(
        "phase_blocks", "assignee",
        existing_type=sa.UUID(), nullable=True,
    )

    # #20 — project target_date nullable (dự án có thể kéo dài không định hạn).
    op.alter_column(
        "projects", "target_date",
        existing_type=sa.Date(), nullable=True,
    )


def downgrade() -> None:
    # Best-effort; KHÔNG re-tighten NOT NULL (có thể đã có giá trị NULL).
    op.drop_index("ix_projects_pic_user_id", table_name="projects")
    op.drop_constraint("fk_projects_pic_user_id_users", "projects", type_="foreignkey")
    op.drop_column("projects", "pic_user_id")
