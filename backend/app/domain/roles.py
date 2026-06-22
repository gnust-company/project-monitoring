"""#26 (mảng B): role công việc mặc định seed cho mỗi workspace mới.

Port từ UserRole + ROLE_LABELS (frontend). Role nay là cấp workspace (bảng
workspace_roles), tùy biến per-org — đây chỉ là bộ mặc định khi tạo workspace.
"""

# (code, name, color) — code khớp giá trị UserRole cũ để backfill liền mạch; color là khóa
# palette (#26 mảng B+: role có màu, hiển thị ở view Nhóm + badge role).
DEFAULT_ROLES: list[tuple[str, str, str]] = [
    ("PM", "Project Manager", "blue"),
    ("BA", "Business Analyst", "amber"),
    ("SW_Architect", "SW Architect", "violet"),
    ("SysOps", "SysOps Engineer", "slate"),
    ("UI_Designer", "UI Designer", "rose"),
    ("GUI", "GUI Designer", "cyan"),
    ("SW_Developer", "SW Developer", "emerald"),
    ("SW_Tester", "SW Tester", "orange"),
]

# Bản đồ code → color để migration backfill role có sẵn (giữ màu cũ ở view Nhóm).
DEFAULT_ROLE_COLORS: dict[str, str] = {code: color for code, _name, color in DEFAULT_ROLES}

# Role mặc định gán cho thành viên mới / người tạo workspace.
DEFAULT_MEMBER_ROLE_CODE = "PM"
