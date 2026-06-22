# ProjectHub — Database Schema (PostgreSQL)

Schema cho việc thay mock data (`frontend/src/data/mockData.ts`) bằng data thật.
Mỗi bảng ánh xạ từ các type trong `frontend/src/types.ts`. ORM tương ứng: `backend/app/infrastructure/db/models.py`.

## Sơ đồ quan hệ

```
users ──< organization_members >── organizations ──< workspace_roles  (role công việc per-org)
  │                                     │
  │                                     └──< projects ──< phase_blocks
  │                                                          │
  ├──────── (created_by / assignee) ─────────────────────────┤
  │                                                          ├──< phase_items        (checklist + outcomes)
  └──< phase_participants >──────────────────────────────────┤
                                                             ├──< comments
                                                             ├──< attachments        (file | link)
                                                             └──< activity_log

phase_definitions      (per-org: phase động, thêm/đổi/sắp xếp/xóa) ──< phase_definition_items
                       (checklist/outcome mặc định theo phase × role)
```

## Enums

```sql
-- #26 mảng B: enum user_role giữ DORMANT (không cột nào dùng nữa) — chỉ là bộ 8 code
-- mặc định seed vào workspace_roles. Vai trò công việc nay theo workspace (bảng workspace_roles).
CREATE TYPE user_role AS ENUM (
  'PM', 'BA', 'SW_Architect', 'SysOps', 'UI_Designer', 'GUI', 'SW_Developer', 'SW_Tester'
);

CREATE TYPE project_status AS ENUM ('On Track', 'At Risk', 'Delayed');

-- 7 phase chuẩn của development pipeline
-- #26 (mảng A): enum dev_phase đã bị bỏ (migration 0008). Phase nay động per-workspace
-- (bảng phase_definitions); phase_blocks.phase_type là VARCHAR lưu code của phase definition.

CREATE TYPE phase_tag AS ENUM ('Backlog', 'Todo', 'Inprogress', 'Complete', 'Canceled');

CREATE TYPE attachment_kind AS ENUM ('file', 'link');

CREATE TYPE phase_item_kind AS ENUM ('checklist', 'outcome');

-- Cấp quyền trong workspace (độc lập với user_role là vai trò công việc)
CREATE TYPE workspace_role AS ENUM ('owner', 'member');

-- Hàng đợi duyệt khi member sửa/xóa dự án
CREATE TYPE change_request_action AS ENUM ('update_project', 'delete_project');
CREATE TYPE change_request_status AS ENUM ('pending', 'approved', 'rejected');
```

> Giá trị enum giữ nguyên chuỗi của frontend (`types.ts`) để FE không phải map lại.

## Tables

### users

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  avatar_url    VARCHAR(1024),                    -- public URL trên MinIO (bucket avatars)
  -- #26 mảng B (migration 0009): bỏ cột role toàn cục — vai trò công việc nay theo
  -- workspace (organization_members.job_role → workspace_roles.code).
  password_hash VARCHAR(255) NOT NULL,
  is_superuser  BOOLEAN NOT NULL DEFAULT false,   -- admin toàn cục, tạo ở first-run setup
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **first-run setup**: khi `users` rỗng, app chỉ cho phép `POST /auth/setup` tạo tài
> khoản đầu tiên với `is_superuser = true`. Sau đó endpoint này bị khóa.

### organizations (Workspace)

```sql
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',   -- #26: mô tả workspace (migration 0007)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  org_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      workspace_role NOT NULL DEFAULT 'member',  -- cấp quyền: người tạo workspace = 'owner'
  job_role  VARCHAR(32),                               -- #26 mảng B: code role công việc (workspace_roles.code) — 1 role/người/workspace
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- #26 mảng B: role công việc theo workspace (thay enum user_role toàn cục). Seed 8 mặc
-- định khi tạo org; tùy biến (thêm/đổi tên/xóa). Xóa role → app cascade gỡ checklist/outcome
-- mặc định gắn role + đặt phase_items.role/organization_members.job_role về NULL.
CREATE TABLE workspace_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code       VARCHAR(32) NOT NULL,    -- khóa duy nhất trong org (membership/item.role tham chiếu)
  name       VARCHAR(255) NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);
```

> **Quyền PIC** (#11): `owner`/`superuser` toàn quyền với workspace (đổi tên/xóa/thành viên).
> Mỗi dự án/phase có **PIC = người tạo** (`projects.pic_user_id` mặc định = `created_by`, đổi
> được qua `PATCH /projects/{id}/pic`; phase PIC = `created_by`). **Chỉ PIC (hoặc superuser)
> mới sửa/xóa *metadata* dự án/phase**. Checklist/outcome & comment thì ai cũng note/tick được
> (ghi log). Cơ chế duyệt `change_requests` cũ đã **deprecated** (giữ bảng, không còn dùng).

### projects

```sql
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      project_status NOT NULL DEFAULT 'On Track',
  start_date  DATE NOT NULL,
  target_date DATE,                       -- #20: NULL = dự án không có ngày kết thúc (deadline theo phase)
  progress    INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,  -- #21 audit: NULLABLE (migration 0006) để SET NULL chạy khi xóa người tạo
  pic_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- #11: PIC (mặc định = created_by, đổi được)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_pic_user_id ON projects(pic_user_id);

CREATE INDEX idx_projects_org ON projects(org_id);
```

### phase_blocks

```sql
CREATE TABLE phase_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_type      VARCHAR(32) NOT NULL,  -- #26 (mảng A): code phase_definitions của org (trước đây enum dev_phase)
  tag             phase_tag NOT NULL DEFAULT 'Todo',
  title           VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  actual_end_date DATE,                -- ngày kết thúc thực tế (nếu có)
  display_row     INTEGER,             -- hàng hiển thị trên timeline (NULL = auto-layout)
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,  -- #21 audit: NULLABLE (migration 0006)
  assignee        UUID REFERENCES users(id) ON DELETE SET NULL,  -- #13: chỉ là "note" (NULL ok); PIC phase = created_by
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
  role           VARCHAR(32),                     -- #26 mảng B: code workspace role (trước đây enum user_role)
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
  author_id      UUID REFERENCES users(id) ON DELETE SET NULL,  -- #21 audit: NULLABLE (migration 0006)
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
  -- #9: NULL = đính kèm cấp phase; có giá trị = đính kèm cho 1 outcome item.
  outcome_item_id UUID REFERENCES phase_items(id) ON DELETE CASCADE,
  uploaded_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_block ON attachments(phase_block_id);
CREATE INDEX ix_attachments_outcome_item_id ON attachments(outcome_item_id);
```

> **#9 — Outcome bắt buộc có tài liệu:** một `phase_items` kind=`outcome` chỉ được
> set `done=true` khi đã có **≥1 attachment** trỏ tới nó (`outcome_item_id`). BE chặn
> ở use case (`UpdatePhaseItem`) → trả **422** nếu vi phạm.

> Migration **0004_outcome_attach** (additive-only): thêm `attachments.outcome_item_id`
> nullable + FK + index. Không xóa/sửa cột cũ (ràng buộc on-air).

### activity_log

Một bảng phục vụ **3 changelog**: cấp phase (`WHERE phase_block_id = X`), cấp dự án
(`WHERE project_id = P`) và cấp workspace (`WHERE org_id = O`, #14). `phase_block_id`
NULL với sự kiện cấp dự án (tạo/xóa phase) và `SET NULL` khi phase bị xóa → dòng "đã xóa
phase Y" vẫn còn. `project_id` **nullable + SET NULL** (đổi từ CASCADE ở migration 0005):
sự kiện "deleted project — lý do …" gắn `org_id`, `project_id=NULL` để bản ghi còn lại
sau khi dự án bị xóa.

```sql
CREATE TABLE activity_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- #14: sự kiện cấp workspace
  project_id     UUID REFERENCES projects(id) ON DELETE SET NULL,      -- NULL = sự kiện cấp workspace
  phase_block_id UUID REFERENCES phase_blocks(id) ON DELETE SET NULL,  -- NULL = sự kiện cấp dự án
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  action         VARCHAR(255) NOT NULL,        -- vd 'changed end date', 'created phase', 'deleted project'
  target         VARCHAR(255) NOT NULL DEFAULT '',  -- vd '2026-06-20 → 2026-06-24', '«tên» — lý do: …'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_project ON activity_log(project_id, created_at DESC);
CREATE INDEX idx_activity_block   ON activity_log(phase_block_id, created_at DESC);
CREATE INDEX idx_activity_org     ON activity_log(org_id, created_at DESC);
```

### phase_definitions + phase_definition_items (#26 mảng A — phase động per-workspace)

Thay cho enum cứng `dev_phase` và bảng global `phase_task_templates` (migration **0008_phase_definitions** xóa cả hai). Mỗi workspace tự định nghĩa danh sách phase (thêm/đổi tên/đổi màu/sắp xếp/xóa) + checklist/outcome mặc định riêng. `phase_blocks.phase_type` lưu `code` của một phase definition trong cùng org. Org mới được seed 7 phase mặc định (PA…OM) khi tạo.

```sql
CREATE TABLE phase_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code        VARCHAR(32) NOT NULL,           -- khóa ngắn duy nhất trong org (vd 'PA')
  name        VARCHAR(255) NOT NULL,          -- nhãn ngắn (VN)
  full_name   VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  color       VARCHAR(32) NOT NULL DEFAULT 'gray',  -- khóa palette (FE map sang class Tailwind)
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);
CREATE INDEX ix_phase_definitions_org_id ON phase_definitions(org_id);

-- checklist/outcome mặc định của 1 phase (sinh phase_items khi tạo phase block)
CREATE TABLE phase_definition_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_def_id UUID NOT NULL REFERENCES phase_definitions(id) ON DELETE CASCADE,
  kind         phase_item_kind NOT NULL,
  role         VARCHAR(32),                   -- #26 mảng B: code workspace role (NULL = "chung")
  text         TEXT NOT NULL,
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_phase_definition_items_phase_def_id ON phase_definition_items(phase_def_id);
```

**Seed data**: chuyển nguyên nội dung `PHASE_ROLE_TASKS` và `PHASE_ROLE_OUTCOMES` từ `frontend/src/types.ts` vào bảng này (VD: `('PA', 'PM', 'checklist', 'Define goals and objectives', 0)` ...). Nguồn sự thật ở backend: `app/domain/phase_templates.py`; seed bằng migration `0002_seed_templates` (56 dòng).

### change_requests — ⚠️ DEPRECATED (#11)

> Kể từ mô hình PIC (#11), cơ chế duyệt này **không còn được dùng** — member không còn
> tạo change request; sửa/xóa do PIC quyết định trực tiếp. Bảng & repo được **giữ lại**
> (additive, không drop) để tránh phá DB đang chạy; sẽ xoá sạch ở migration dọn dẹp sau.

(Lịch sử: member sửa/xóa dự án → tạo 1 bản ghi `pending`; owner duyệt/từ chối.)

```sql
CREATE TABLE change_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  action       change_request_action NOT NULL,           -- update_project | delete_project
  payload      JSONB NOT NULL DEFAULT '{}',               -- thay đổi đề xuất (rỗng nếu delete)
  status       change_request_status NOT NULL DEFAULT 'pending',
  reviewed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX idx_cr_org    ON change_requests(org_id);
CREATE INDEX idx_cr_status ON change_requests(status);
```

### notifications — thông báo in-app

Sinh tự động khi có sự kiện (thêm thành viên, được giao phase, bình luận, change-request
tạo/duyệt/từ chối...). FE poll `GET /notifications` + badge chưa đọc.

```sql
CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- người nhận
  type              VARCHAR(50) NOT NULL,        -- member_added, phase_assigned, comment_added, ...
  title             VARCHAR(512) NOT NULL,
  body              TEXT NOT NULL DEFAULT '',
  org_id            UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
  phase_block_id    UUID REFERENCES phase_blocks(id) ON DELETE CASCADE,
  change_request_id UUID REFERENCES change_requests(id) ON DELETE CASCADE,
  read              BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_user ON notifications(user_id, read, created_at DESC);
```

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
| `ActivityItem` | `activity_log` | nay có `project_id` → dùng cho cả changelog dự án |
| `PhaseDefinition` | `phase_definitions` + `phase_definition_items` | #26 mảng A: phase động per-org (thay enum `dev_phase` + `phase_task_templates`); FE `PHASE_META`/`PHASE_ROLE_*` chỉ còn cho landing/demo |
| `WorkspaceRoleDef` | `workspace_roles` + `organization_members.job_role` | #26 mảng B: vai trò công việc động per-org (thay enum `user_role` toàn cục trên `users`); item.role lưu code; FE `getRoleName(code)` |
| *(mới)* permission | `users.is_superuser` + `organization_members.role` | tách khỏi `UserRole` |
| *(mới)* PIC dự án (#11) | `projects.pic_user_id` | mặc định `created_by`, đổi được; thay thế approval queue |
| *(deprecated)* approval queue | `change_requests` | đã thay bằng PIC; bảng giữ lại, không dùng (#11) |
| *(mới)* notifications | `notifications` | in-app, FE poll |

## Ghi chú thiết kế

- **UUID** làm PK toàn bộ (FE đang dùng id chuỗi `pb-123` → thay bằng UUID khi tích hợp).
- **ON DELETE CASCADE** cho quan hệ cha-con (xóa phase block kéo theo items/comments/attachments); **SET NULL** cho tham chiếu người dùng để không mất lịch sử khi xóa user.
  - **#21 audit**: mọi cột FK người dùng đặt `SET NULL` PHẢI nullable. Migration **0006_creator_nullable** sửa `projects.created_by`, `phase_blocks.created_by`, `comments.author_id` (trước đó NOT NULL → xóa user từng tạo/comment bị `NotNullViolation`, không xóa được).
- `updated_at` cập nhật qua trigger hoặc ORM `onupdate` (backend hiện dùng ORM).
- File upload thực tế lưu **MinIO** (S3-compatible): bucket `attachments` cho document,
  `avatars` cho ảnh đại diện. `attachments.url` / `users.avatar_url` lưu public URL.
  Bucket tạo sẵn bởi service `minio-setup` trong `docker-compose.yml`.
  - **#21**: FK CASCADE chỉ dọn **hàng DB**, KHÔNG dọn object MinIO. Use case xóa
    phase/dự án/workspace/user thu thập URL file (kind=`file`) / avatar **trước** khi xóa
    hàng rồi gọi `ObjectStorage.delete` (best-effort) để tránh leak disk.
