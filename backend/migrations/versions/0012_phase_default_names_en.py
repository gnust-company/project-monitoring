"""Đổi tên đầy đủ phase mặc định sang tiếng Anh (hot fix)

Trước đây seed `phase_definitions.name` là tiếng Việt ngắn ("Đánh giá Dự án"),
`full_name` là tiếng Anh. Sau #26 phase chỉ còn Mã + Tên đầy đủ và UI hiển thị
`name` → lộ tên tiếng Việt. Chuẩn hóa: default toàn tiếng Anh (name = full_name).

Chỉ cập nhật các dòng còn nguyên default (name == tên VN cũ theo đúng code) →
KHÔNG đụng phase người dùng đã tự đặt tên.

Revision ID: 0012_phase_default_names_en
Revises: 0011_announcements
Create Date: 2026-06-22 00:00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0012_phase_default_names_en"
down_revision: str | None = "0011_announcements"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (code, tên VN cũ, tên EN mới, mô tả EN mới)
_RENAMES: list[tuple[str, str, str, str]] = [
    ("PA", "Đánh giá Dự án", "Project Assessment",
     "Define objectives, assess feasibility, gather requirements → Feasibility Report & BRD"),
    ("SA", "Phân tích Phần mềm", "Software Analysis",
     "Define scope, build WBS, manage risks → Project Charter & User Requirements"),
    ("SD", "Thiết kế Phần mềm", "Software Design",
     "Wireframe, GUI, HLD/DDD, SRS → Design Documents"),
    ("SI", "Phát triển Phần mềm", "Software Implementation",
     "Develop source code, set up infrastructure, test cases → Source Code & Test Cases"),
    ("ST", "Kiểm thử Phần mềm", "Software Testing",
     "System, performance and security testing → Test Plan & Test Report"),
    ("DEP", "Triển khai Phần mềm", "Software Deployment",
     "Deployment schedule, Go-live confirmation → Handover Schedule & User Guide"),
    ("OM", "Vận hành & Bảo trì", "Operation & Maintenance",
     "PRD incident management, monitoring, security patching → Incident Log & RCA Report"),
]


def upgrade() -> None:
    stmt = sa.text(
        "UPDATE phase_definitions SET name = :en, full_name = :en, description = :desc "
        "WHERE code = :code AND name = :vn"
    )
    for code, vn, en, desc in _RENAMES:
        op.execute(stmt.bindparams(code=code, vn=vn, en=en, desc=desc))


def downgrade() -> None:
    stmt = sa.text(
        "UPDATE phase_definitions SET name = :vn WHERE code = :code AND name = :en"
    )
    for code, vn, en, _desc in _RENAMES:
        op.execute(stmt.bindparams(code=code, vn=vn, en=en))
