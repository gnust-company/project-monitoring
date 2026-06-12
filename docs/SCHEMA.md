# ProjectHub — Database Schema (PostgreSQL)

Schema cho việc thay mock data (`frontend/src/data/mockData.ts`) bằng data thật.
Mỗi bảng ánh xạ từ các type trong `frontend/src/types.ts`. ORM tương ứng: `backend/app/infrastructure/db/models.py`.

## Sơ đồ quan hệ

```
users ──< organization_members >── organizations
  │                                     │
  │                                     └──< projects ──< phase_blocks
  │                                                          │
  ├──────── (created_by / assignee) ─────────────────────────┤
  │                                                          ├──< phase_items        (checklist + outcomes)
  └──< phase_participants >──────────────────────────────────┤
                                                             ├──< comments
                                                             ├──< attachments        (file | link)
                                                             └──< activity_log

phase_task_templates   (nguồn sinh checklist/outcome mặc định theo phase × role)
```

## Enums

```sql
CREATE TYPE user_role AS ENUM (
  'PM', 'BA', 'SW_Architect', 'SysOps', 'UI_Designer', 'GUI', 'SW_Developer', 'SW_Tester'
);

CREATE TYPE project_status AS ENUM ('On Track', 'At Risk', 'Delayed');

-- 7 phase chuẩn của development pipeline
CREATE TYPE dev_phase AS ENUM ('PA', 'SA', 'SD', 'SI', 'ST', 'DEP', 'OM');

CREATE TYPE phase_tag AS ENUM ('Backlog', 'Todo', 'Inprogress', 'Complete', 'Canceled');

CREATE TYPE attachment_kind AS ENUM ('file', 'link');

CREATE TYPE phase_item_kind AS ENUM ('checklist', 'outcome');
```

> Giá trị enum giữ nguyên chuỗi của frontend (`types.ts`) để FE không phải map lại.

## Tables

### users

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  avatar_url    VARCHAR(1024),
  role          user_role NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### organizations (Workspace)

```sql
CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  org_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
```

### projects

```sql
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      project_status NOT NULL DEFAULT 'On Track',
  start_date  DATE NOT NULL,
  target_date DATE NOT NULL,
  progress    INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_org ON projects(org_id);
```

### phase_blocks

```sql
CREATE TABLE phase_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_type      dev_phase NOT NULL,
  tag             phase_tag NOT NULL DEFAULT 'Todo',
  title           VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  actual_end_date DATE,                -- ngày kết thúc thực tế (nếu có)
  display_row     INTEGER,             -- hàng hiển thị trên timeline (NULL = auto-layout)
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  assignee        UUID REFERENCES users(id) ON DELETE SET NULL,  -- default = created_by (BE gán khi tạo)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);

CREATE INDEX idx_phase_blocks_project ON phase_blocks(project_id);
CREATE INDEX idx_phase_blocks_dates   ON phase_blocks(start_date, end_date);
```

### phase_participants

```sql
CREATE TABLE phase_participants (
  phase_block_id UUID NOT NULL REFERENCES phase_blocks(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (phase_block_id, user_id)
);
```

### phase_items — checklist & outcomes

Một bảng chung, phân biệt bằng `kind`. `role` cho biết đầu việc/sản phẩm thuộc role nào trong phase (NULL = mục "Chung" do user tự thêm).

```sql
CREATE TABLE phase_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_block_id UUID NOT NULL REFERENCES phase_blocks(id) ON DELETE CASCADE,
  kind           phase_item_kind NOT NULL,
  text           TEXT NOT NULL,
  done           BOOLEAN NOT NULL DEFAULT false,
  role           user_role,
  position       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_phase_items_block ON phase_items(phase_block_id, kind);
```

> Tiến độ phase = `COUNT(done) / COUNT(*)` của items có `kind = 'checklist'`. BE tính, không lưu.

### comments

```sql
CREATE TABLE comments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_block_id UUID NOT NULL REFERENCES phase_blocks(id) ON DELETE CASCADE,
  author_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  content        TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_block ON comments(phase_block_id);
```

### attachments — Document (file + link)

```sql
CREATE TABLE attachments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_block_id UUID NOT NULL REFERENCES phase_blocks(id) ON DELETE CASCADE,
  kind           attachment_kind NOT NULL,
  file_name      VARCHAR(512) NOT NULL,   -- tên hiển thị (với link: tên tài liệu)
  url            VARCHAR(2048) NOT NULL,  -- file: storage URL; link: URL ngoài
  uploaded_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_block ON attachments(phase_block_id);
```

### activity_log

```sql
CREATE TABLE activity_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_block_id UUID NOT NULL REFERENCES phase_blocks(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  action         VARCHAR(255) NOT NULL,
  target         VARCHAR(255) NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_block ON activity_log(phase_block_id, created_at DESC);
```

### phase_task_templates

Nguồn sinh checklist/outcome mặc định theo `(phase_type, role)` — thay cho `PHASE_ROLE_TASKS` / `PHASE_ROLE_OUTCOMES` hard-code ở frontend. Khi tạo phase block, BE đọc bảng này để sinh `phase_items`.

```sql
CREATE TABLE phase_task_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_type dev_phase NOT NULL,
  role       user_role NOT NULL,
  kind       phase_item_kind NOT NULL,
  text       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_templates_phase ON phase_task_templates(phase_type, kind);
```

**Seed data**: chuyển nguyên nội dung `PHASE_ROLE_TASKS` và `PHASE_ROLE_OUTCOMES` từ `frontend/src/types.ts` vào bảng này (VD: `('PA', 'PM', 'checklist', 'Define goals and objectives', 0)` ...).

## Mapping với frontend types.ts

| Frontend type | Bảng | Ghi chú |
|---|---|---|
| `User` | `users` | thêm `email`, `password_hash` cho auth |
| `Organization` | `organizations` + `organization_members` | `members: User[]` → join table |
| `Project` | `projects` | giữ nguyên field |
| `PhaseBlock` | `phase_blocks` + 5 bảng con | `checklist`/`outcomes` → `phase_items` (kind) |
| `ChecklistItem` | `phase_items` | thêm `kind`, `position` |
| `Attachment` | `attachments` | `fileName` → `file_name` |
| `Comment` | `comments` | |
| `ActivityItem` | `activity_log` | |
| `PHASE_ROLE_TASKS/OUTCOMES` | `phase_task_templates` | từ hằng số → data |

## Ghi chú thiết kế

- **UUID** làm PK toàn bộ (FE đang dùng id chuỗi `pb-123` → thay bằng UUID khi tích hợp).
- **ON DELETE CASCADE** cho quan hệ cha-con (xóa phase block kéo theo items/comments/attachments); **SET NULL** cho tham chiếu người dùng để không mất lịch sử khi xóa user.
- `updated_at` cập nhật qua trigger hoặc ORM `onupdate` (backend hiện dùng ORM).
- File upload thực tế lưu object storage (S3/MinIO); bảng `attachments.url` chỉ lưu URL.
