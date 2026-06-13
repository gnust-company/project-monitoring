# ProjectHub — API Contract (v1)

Hợp đồng REST API giữa `frontend/` và `backend/` để thay mock data bằng data thật.
Schema database tương ứng: [SCHEMA.md](./SCHEMA.md).

## Quy ước chung

- **Base URL**: `/api/v1`
- **Format**: JSON, key dạng **camelCase** (khớp `frontend/src/types.ts`)
- **Auth**: `Authorization: Bearer <JWT>` cho mọi endpoint trừ `/auth/login`, `/auth/register`, `/health`
- **ID**: UUID string
- **Date**: `YYYY-MM-DD` (date) hoặc ISO-8601 (datetime)
- **Lỗi** thống nhất:

```json
{ "detail": "Project not found" }
```

| Status | Ý nghĩa |
|---|---|
| 200 / 201 / 204 | OK / Created / No Content (delete) |
| 400 | Body/param không hợp lệ |
| 401 | Thiếu hoặc sai token |
| 403 | Không thuộc workspace / không có quyền |
| 404 | Không tìm thấy resource |
| 422 | Validation error (FastAPI) |

## Resources

### Auth

| Method | Path | Mô tả |
|---|---|---|
| POST | `/auth/register` | Đăng ký. Body: `{ email, password, name, role }` — `role` **bắt buộc**, chọn lúc tạo account (form đăng ký FE có dropdown vai trò) |
| POST | `/auth/login` | Body: `{ email, password }` → `{ accessToken, user }` |
| GET | `/auth/me` | User hiện tại từ token |

**User shape** (mọi nơi trả user đều dùng shape này):

```json
{ "id": "uuid", "email": "a@b.c", "name": "Sarah Chen", "avatar": "https://...", "role": "PM" }
```

`role` ∈ `PM | BA | SW_Architect | SysOps | UI_Designer | GUI | SW_Developer | SW_Tester`

### Users / Profile

Nguồn cho **Profile view** (FE: trang Hồ sơ mở từ avatar/sidebar).

| Method | Path | Mô tả |
|---|---|---|
| GET | `/users/me` | = `/auth/me` |
| PATCH | `/users/me` | Cập nhật hồ sơ. Body (partial): `{ name?, role?, avatar? }` |
| GET | `/users/me/assigned-phase-blocks` | Phase block mà user là `assignee` (cho mục "Phase được giao" ở Profile) |

**Profile stats** — FE có thể tự tổng hợp từ `/organizations` + `/organizations/{orgId}/phase-blocks`, hoặc BE cấp endpoint gộp:

| Method | Path | Mô tả |
|---|---|---|
| GET | `/users/me/stats` | `{ workspaces, projects, assignedPhases, openTasks }` — số liệu tổng quan cá nhân |

`openTasks` = số checklist item `done=false` trong các phase block đang hoạt động (`tag ∈ Backlog/Todo/Inprogress`) mà user là assignee hoặc participant.

### Organizations (Workspace)

Nguồn cho **Workspace Settings view** (FE: trang Cài đặt mở từ sidebar).

| Method | Path | Mô tả |
|---|---|---|
| GET | `/organizations` | Workspace mà user hiện tại là thành viên |
| POST | `/organizations` | Tạo workspace. Body: `{ name }`. Người tạo tự thành member |
| GET | `/organizations/{orgId}` | Chi tiết + members |
| PATCH | `/organizations/{orgId}` | Đổi tên workspace. Body: `{ name }` |
| DELETE | `/organizations/{orgId}` | Xóa workspace → 204. **Cascade**: xóa toàn bộ projects + phase blocks bên trong (xem SCHEMA.md) |
| GET | `/organizations/{orgId}/members` | Danh sách thành viên |
| POST | `/organizations/{orgId}/members` | Mời thành viên. Body: `{ email }` (BE tạo/ghép user rồi thêm vào) |
| DELETE | `/organizations/{orgId}/members/{userId}` | Xóa thành viên khỏi workspace → 204 |

```json
{
  "id": "uuid",
  "name": "TechNova Solutions",
  "members": [ { "id": "...", "name": "...", "avatar": "...", "role": "PM" } ]
}
```

### Projects

| Method | Path | Mô tả |
|---|---|---|
| GET | `/organizations/{orgId}/projects` | Dự án trong workspace |
| POST | `/organizations/{orgId}/projects` | Body: `{ name, description, startDate, targetDate, status? }` |
| GET | `/projects/{projectId}` | Chi tiết |
| PATCH | `/projects/{projectId}` | Partial update các field trên + `progress` |
| DELETE | `/projects/{projectId}` | → 204 |

```json
{
  "id": "uuid",
  "orgId": "uuid",
  "name": "Cloud Migration",
  "description": "Migrate infra to AWS",
  "status": "On Track",
  "startDate": "2026-04-03",
  "targetDate": "2026-07-17",
  "progress": 55,
  "createdBy": "uuid"
}
```

`status` ∈ `On Track | At Risk | Delayed`

### Phase Blocks

Nguồn thay thế chính cho `phaseBlocks` trong `AppContext`.

| Method | Path | Mô tả |
|---|---|---|
| GET | `/organizations/{orgId}/phase-blocks` | **FE load 1 lần cho cả workspace** (pipeline view) |
| GET | `/projects/{projectId}/phase-blocks` | Theo dự án |
| POST | `/projects/{projectId}/phase-blocks` | Tạo block (xem body dưới) |
| GET | `/phase-blocks/{blockId}` | Chi tiết đầy đủ (items, comments, attachments, activity) |
| PATCH | `/phase-blocks/{blockId}` | Partial update: `title, description, tag, phaseType, startDate, endDate, actualEndDate, displayRow, assignee, participantIds` — dùng cho cả kéo-thả/resize trên timeline |
| DELETE | `/phase-blocks/{blockId}` | → 204 |

**POST body** — nếu không gửi `checklist`/`outcomes`, BE tự sinh từ `phase_task_templates` theo `phaseType`; `assignee` mặc định = người tạo:

```json
{
  "phaseType": "SD",
  "tag": "Todo",
  "title": "UI Components",
  "description": "...",
  "startDate": "2026-06-10",
  "endDate": "2026-06-24",
  "assignee": "uuid?",
  "participantIds": ["uuid"],
  "checklist": [ { "text": "Design wireframes", "role": "UI_Designer", "done": false } ],
  "outcomes":  [ { "text": "Wireframes & GUI Design", "role": "UI_Designer", "done": false } ]
}
```

**Response shape** (list endpoint trả bản gọn — không có comments/activity; detail endpoint trả đủ):

```json
{
  "id": "uuid",
  "projectId": "uuid",
  "phaseType": "SD",
  "tag": "Inprogress",
  "title": "UI Components",
  "description": "...",
  "startDate": "2026-06-10",
  "endDate": "2026-06-24",
  "actualEndDate": null,
  "displayRow": 0,
  "createdBy": "uuid",
  "assignee": "uuid",
  "participantIds": ["uuid"],
  "progressPct": 40,
  "checklist": [ { "id": "uuid", "text": "...", "done": true, "role": "BA" } ],
  "outcomes":  [ { "id": "uuid", "text": "...", "done": false, "role": "BA" } ]
}
```

`phaseType` ∈ `PA | SA | SD | SI | ST | DEP | OM` · `tag` ∈ `Backlog | Todo | Inprogress | Complete | Canceled`

### Phase Items (checklist & outcomes)

`kind` ∈ `checklist | outcome`.

| Method | Path | Mô tả |
|---|---|---|
| POST | `/phase-blocks/{blockId}/items` | Body: `{ kind, text, role? }` |
| PATCH | `/phase-blocks/{blockId}/items/{itemId}` | Body: `{ text?, done?, role?, position? }` — toggle done dùng cái này |
| DELETE | `/phase-blocks/{blockId}/items/{itemId}` | → 204 |

### Comments

| Method | Path | Mô tả |
|---|---|---|
| GET | `/phase-blocks/{blockId}/comments` | |
| POST | `/phase-blocks/{blockId}/comments` | Body: `{ content }`; author = user từ token |

```json
{ "id": "uuid", "authorId": "uuid", "content": "...", "createdAt": "2026-06-13T10:00:00Z" }
```

### Attachments (Document)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/phase-blocks/{blockId}/attachments` | |
| POST | `/phase-blocks/{blockId}/attachments` | 2 dạng — xem dưới |
| DELETE | `/phase-blocks/{blockId}/attachments/{attachmentId}` | → 204 |

- **Link**: `Content-Type: application/json` → `{ "kind": "link", "fileName": "Spec (Google Docs)", "url": "https://..." }`
- **File**: `Content-Type: multipart/form-data`, field `file` → BE upload storage, tự set `kind: "file"` + `url`

```json
{ "id": "uuid", "kind": "link", "fileName": "Spec (Google Docs)", "url": "https://...", "uploadedAt": "..." }
```

### Activity Log

| Method | Path | Mô tả |
|---|---|---|
| GET | `/phase-blocks/{blockId}/activity` | BE tự ghi khi có mutation; FE chỉ đọc |

### Templates

| Method | Path | Mô tả |
|---|---|---|
| GET | `/templates/phase-tasks?phase=SD` | Checklist + outcome mặc định theo phase, nhóm theo role — thay `PHASE_ROLE_TASKS`/`PHASE_ROLE_OUTCOMES` hard-code ở FE |

```json
{
  "phase": "SD",
  "checklist": [ { "role": "UI_Designer", "tasks": ["Design wireframes"] } ],
  "outcomes":  [ { "role": "BA", "outcomes": ["SRS"] } ]
}
```

## Mapping AppContext → API

Lộ trình thay mock data trong `frontend/src/context/AppContext.tsx`:

| FE hiện tại | Thay bằng |
|---|---|
| `login(email, { name, role })` | `POST /auth/login` (login) / `POST /auth/register` (đăng ký có role) |
| `currentUser` | `GET /auth/me` |
| `updateCurrentUser(updates)` (Profile view) | `PATCH /users/me` |
| `organizations` (seed) | `GET /organizations` |
| `addOrganization` | `POST /organizations` |
| `updateOrganization(id, { name })` (Settings view) | `PATCH /organizations/{id}` |
| `deleteOrganization(id)` — FE xóa kèm projects+phase blocks | `DELETE /organizations/{id}` (BE cascade theo SCHEMA.md) |
| `addOrgMember(orgId, user)` (Settings view) | `POST /organizations/{orgId}/members` |
| `removeOrgMember(orgId, userId)` (Settings view) | `DELETE /organizations/{orgId}/members/{userId}` |
| `orgProjects` (filter local) | `GET /organizations/{orgId}/projects` |
| `addProject` | `POST /organizations/{orgId}/projects` |
| `updateProject(id, updates)` (Project Detail Modal) | `PATCH /projects/{id}` |
| `deleteProject(id)` — FE xóa kèm phase blocks | `DELETE /projects/{id}` (BE cascade theo SCHEMA.md) |
| `orgPhaseBlocks` (filter local) | `GET /organizations/{orgId}/phase-blocks` |
| `addPhaseBlock` | `POST /projects/{projectId}/phase-blocks` |
| `updatePhaseBlock(id, updates)` | `PATCH /phase-blocks/{id}` hoặc endpoint con tương ứng (items/comments/attachments) |
| `deletePhaseBlock` | `DELETE /phase-blocks/{id}` |
| `buildDefaultChecklist/Outcomes` (types.ts) | `GET /templates/phase-tasks?phase=...` |
| Workload (Team view) | Tính ở FE từ phase blocks; hoặc BE cấp `GET /organizations/{orgId}/members/workload` |

## Công thức derived (FE và BE phải khớp)

Các số liệu này không lưu DB, tính khi đọc. Định nghĩa thống nhất:

- **Tiến độ phase block** (`progressPct`) = `done / total` của checklist items (`kind=checklist`), làm tròn %. Phase không có checklist → 0%.
- **Tiến độ dự án** (`projects.progress`) = hiện do người dùng đặt thủ công (slider trong Project Detail). BE giữ là cột lưu trực tiếp, không auto-tính.
- **Workload thành viên** (Team view) = số checklist item `done=false` trong các phase block **đang hoạt động** (`tag ∈ {Backlog, Todo, Inprogress}`) mà user là `assignee` **hoặc** có trong `participantIds`. Quy đổi %: `min(100, openTasks / CAPACITY * 100)` với `CAPACITY = 15` task mở ≈ 100%.
- **Phân bổ phase** (Dashboard) = đếm phase block theo `phaseType` trong workspace.
- **Deadline sắp tới** (Dashboard) = phase block có `tag ∉ {Complete, Canceled}`, sắp theo `endDate` tăng dần, lọc còn ≥ -5 ngày so với hôm nay.

## Versioning & mở rộng

- Prefix `/api/v1` — thay đổi breaking sẽ lên `/api/v2`.
- Pagination chưa cần ở v1 (dataset nhỏ); khi cần sẽ thêm `?limit=&offset=` + header `X-Total-Count`, không đổi shape item.
- Realtime (nhiều người cùng kéo timeline) để sau: cân nhắc WebSocket `/ws/organizations/{orgId}` phát event `phase-block.updated`.
