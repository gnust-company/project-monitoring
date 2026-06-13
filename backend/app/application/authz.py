"""Phân quyền — hàm thuần, không phụ thuộc framework.

Hai chiều độc lập:
- `User.is_superuser`: admin toàn cục (tạo ở first-run setup) — làm được mọi thứ.
- `Membership.role` (owner|member): cấp quyền trong từng workspace.

Quy tắc:
- owner / superuser: toàn quyền với workspace + artifact (dự án, phase, thành viên).
- member: tham gia, tạo dự án/phase được; nhưng **sửa/xóa dự án phải owner duyệt**,
  và **không** được sửa workspace hay quản lý thành viên.
"""
from app.domain.entities import Membership, User


def can_access_workspace(user: User, membership: Membership | None) -> bool:
    return user.is_superuser or membership is not None


def can_manage_workspace(user: User, membership: Membership | None) -> bool:
    """Đổi tên/xóa workspace, thêm/bớt thành viên — chỉ owner/superuser."""
    return user.is_superuser or (membership is not None and membership.role == membership.role.OWNER)


def can_edit_project_directly(user: User, membership: Membership | None) -> bool:
    """Sửa/xóa dự án mà không cần duyệt — owner/superuser."""
    return can_manage_workspace(user, membership)


def member_needs_approval(user: User, membership: Membership | None) -> bool:
    """member thường (không phải owner/superuser) → mọi sửa/xóa dự án phải duyệt."""
    return not can_edit_project_directly(user, membership)
