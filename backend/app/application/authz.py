"""Phân quyền — hàm thuần, không phụ thuộc framework.

Hai chiều độc lập:
- `User.is_superuser`: admin toàn cục (tạo ở first-run setup) — làm được mọi thứ.
- `Membership.role` (owner|member): cấp quyền trong từng workspace.

Quy tắc PIC (#11 — thay thế cơ chế approval queue cũ):
- Project/phase có **PIC = người tạo** (project cho đổi PIC trong detail; phase PIC = người tạo).
- Chỉ PIC (hoặc superuser) mới sửa/xóa **metadata** của project/phase đó.
- Checklist & outcome trong phase: người khác vẫn note/tick được + ghi log (không bị PIC khóa).
- Workspace (đổi tên/xóa/quản lý thành viên) vẫn riêng: chỉ owner/superuser.
"""
from __future__ import annotations

from app.domain.entities import Membership, PhaseBlock, Project, User


def can_access_workspace(user: User, membership: Membership | None) -> bool:
    return user.is_superuser or membership is not None


def can_manage_workspace(user: User, membership: Membership | None) -> bool:
    """Đổi tên/xóa workspace, thêm/bớt thành viên — chỉ owner/superuser."""
    return user.is_superuser or (membership is not None and membership.role == membership.role.OWNER)


def effective_project_pic(project: Project) -> str | None:
    """PIC hiệu dụng của project = pic_user_id nếu có, không thì người tạo."""
    pid = project.pic_user_id or project.created_by
    return str(pid) if pid is not None else None


def can_edit_project(user: User, project: Project) -> bool:
    """Sửa/xóa metadata project — chỉ PIC (hiệu dụng) hoặc superuser."""
    if user.is_superuser:
        return True
    pic = effective_project_pic(project)
    return pic is not None and pic == str(user.id)


def effective_phase_pic(block: PhaseBlock) -> str | None:
    """PIC hiệu dụng của phase = assignee (đổi được) nếu có, không thì người tạo."""
    pid = block.assignee or block.created_by
    return str(pid) if pid is not None else None


def can_edit_phase(user: User, block: PhaseBlock) -> bool:
    """Sửa/xóa metadata phase (gồm đổi PIC) — chỉ PIC hiệu dụng hoặc superuser.

    Checklist/outcome item CRUD không đi qua đây (ai cũng note được).
    """
    if user.is_superuser:
        return True
    pic = effective_phase_pic(block)
    return pic is not None and pic == str(user.id)
