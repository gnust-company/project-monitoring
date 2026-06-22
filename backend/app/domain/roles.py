"""#26 (mảng B): role công việc mặc định seed cho mỗi workspace mới.

Port từ UserRole + ROLE_LABELS (frontend). Role nay là cấp workspace (bảng
workspace_roles), tùy biến per-org — đây chỉ là bộ mặc định khi tạo workspace.
"""

# (code, name) — code khớp giá trị UserRole cũ để backfill liền mạch.
DEFAULT_ROLES: list[tuple[str, str]] = [
    ("PM", "Project Manager"),
    ("BA", "Business Analyst"),
    ("SW_Architect", "SW Architect"),
    ("SysOps", "SysOps Engineer"),
    ("UI_Designer", "UI Designer"),
    ("GUI", "GUI Designer"),
    ("SW_Developer", "SW Developer"),
    ("SW_Tester", "SW Tester"),
]

# Role mặc định gán cho thành viên mới / người tạo workspace.
DEFAULT_MEMBER_ROLE_CODE = "PM"
