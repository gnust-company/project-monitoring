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
| 422 | Validation error (FastAPI) — bao gồm #9: outcome `done=true` khi chưa có tài liệu |
| 409 | Resource tồn tại (VD: first-run setup đã tạo user) |

## Resources

### Auth & first-run setup

| Method | Path | Mô tả |
|---|---|---|
| GET | `/auth/setup-status` | `{ needsSetup: bool }` — `true` khi DB chưa có user nào (FE hiện view tạo super-user) |
| POST | `/auth/setup` | Tạo tài khoản đầu tiên (`isSuperuser=true`). Body như `register`. **Khóa** sau khi đã có user (409). → `{ accessToken, user }` |
| POST | `/auth/register` | Đăng ký. Body: `{ email, password, name }` — #26 mảng B: **không còn `role`** (vai trò gán theo workspace khi vào). → `{ accessToken, user }` |
| POST | `/auth/login` | Body: `{ email, password }` → `{ accessToken, user }` |
| GET | `/auth/me` | User hiện tại từ token |

**User shape** (mọi nơi trả user đều dùng shape này):

```json
{ "id": "uuid", "email": "a@b.c", "name": "Sarah Chen", "avatar": "https://...", "isSuperuser": false }
```

> #26 mảng B: `User` **không còn `role` toàn cục**. Vai trò công việc theo workspace — khi list theo org, mỗi member kèm `jobRole` (code workspace role); xem `GET /organizations/{orgId}/roles`.

### Phân quyền (permission)

Hai chiều **độc lập**:
- `user.isSuperuser` — admin toàn cục (tạo ở first-run setup), làm được mọi thứ.
- Cấp workspace (`organization_members.role`) ∈ `owner | member`:
  - **owner** (người tạo) / **superuser**: toàn quyền workspace (đổi tên/xóa/thành viên).
  - **mọi member**: tạo dự án/phase được; **sửa/xóa *metadata* chỉ PIC mới được** (xem dưới).

> **PIC** (#11): mỗi dự án có PIC = `picUserId` (mặc định `createdBy`, đổi qua
> `PATCH /projects/{id}/pic`); phase PIC = `createdBy`. **Chỉ PIC (hoặc superuser)** mới
> sửa/xóa metadata dự án/phase (→ 403 nếu không phải). Checklist/outcome item & comment
> thì ai trong workspace cũng tick/note được (ghi activity log). Cơ chế `change_requests`
> (approval queue) cũ đã **deprecated**.

| Mã | Khi nào |
|---|---|
| 403 | không thuộc workspace, hoặc không phải PIC/superuser mà sửa/xóa metadata, hoặc member làm hành động owner-only |

### Users / Profile

Nguồn cho **Profile view** (FE: trang Hồ sơ mở từ avatar/sidebar).

| Method | Path | Mô tả |
|---|---|---|
| GET | `/users/me` | = `/auth/me` |
| PATCH | `/users/me` | Cập nhật hồ sơ tài khoản. Body (partial): `{ name? }` (#26 mảng B: bỏ `role`) |
| POST | `/users/me/avatar` | `multipart/form-data` field `file` → upload MinIO (bucket `avatars`), set `avatar` → trả User |

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
| PATCH | `/organizations/{orgId}` | Cập nhật `{ name?, description? }` (gửi field nào cập nhật field đó) — owner-only |
| DELETE | `/organizations/{orgId}` | Xóa workspace → 204. **Cascade**: xóa toàn bộ projects + phase blocks bên trong (xem SCHEMA.md) |
| GET | `/organizations/{orgId}/members` | Danh sách thành viên |
| POST | `/organizations/{orgId}/members` | Mời thành viên. Body: `{ email }` (BE tạo/ghép user rồi thêm vào) |
| DELETE | `/organizations/{orgId}/members/{userId}` | Xóa thành viên khỏi workspace → 204 |
| GET | `/organizations/{orgId}/recent-activity` | #26: feed hoạt động workspace (vận hành + vòng đời dự án) cho Dashboard |

#### Phase definitions (#26 mảng A — phase động per-workspace)

Mọi member **đọc** được (FE render timeline/dashboard theo phase của workspace); thêm/sửa/xóa/sắp xếp là **owner-only**.

| Method | Path | Mô tả |
|---|---|---|
| GET | `/organizations/{orgId}/phases` | Danh sách phase definition (kèm `checklist`/`outcomes` mặc định), sắp theo `position` |
| POST | `/organizations/{orgId}/phases` | Tạo phase. Body: `{ name, code?, fullName?, description?, color?, checklist?, outcomes? }`. `code` tự sinh (slug) nếu thiếu, duy nhất trong org → 201 |
| PATCH | `/organizations/{orgId}/phases/{phaseId}` | Cập nhật `{ code?, name?, fullName?, description?, color?, position?, checklist?, outcomes? }`. Gửi `checklist`/`outcomes` = thay-toàn-bộ items. Đổi `code` → **cascade** cập nhật `phase_blocks.phase_type` của mọi block đang dùng; trùng mã trong org → **409** |
| DELETE | `/organizations/{orgId}/phases/{phaseId}?force=false` | Xóa phase. Nếu đang được block dùng và `force=false` → **409** `{ detail: { message, count } }`; `?force=true` để xóa (block giữ nguyên, hiển thị màu trung tính) → 204 |
| POST | `/organizations/{orgId}/phases/reorder` | Sắp xếp lại. Body: `{ orderedIds: [phaseId…] }` → trả danh sách mới |

#### Workspace roles (#26 mảng B — vai trò công việc per-workspace)

Mọi member **đọc** được; thêm/sửa/xóa/sắp xếp là **owner-only**. Seed 8 role mặc định khi tạo org. Đăng ký KHÔNG còn hỏi role; member mới được gán role mặc định, owner/chính chủ đổi sau.

| Method | Path | Mô tả |
|---|---|---|
| GET | `/organizations/{orgId}/roles` | Danh sách role công việc, sắp theo `position` → `[{ id, orgId, code, name, position }]` |
| POST | `/organizations/{orgId}/roles` | Tạo role. Body: `{ name, code? }` (`code` tự sinh slug nếu thiếu) → 201 |
| PATCH | `/organizations/{orgId}/roles/{roleId}` | Cập nhật `{ code?, name?, position? }`. Đổi `name` → checklist/outcome hiển thị tên mới (tham chiếu `code`). Đổi `code` → **cascade** cập nhật `phase_(definition_)items.role` + `members.job_role`; trùng mã trong org → **409** |
| DELETE | `/organizations/{orgId}/roles/{roleId}` | Xóa role → **cascade**: xóa checklist/outcome mặc định gắn role + đặt `phase_items.role`/`members.job_role` về NULL → 204 |
| POST | `/organizations/{orgId}/roles/reorder` | Sắp xếp. Body: `{ orderedIds: [roleId…] }` |
| PATCH | `/organizations/{orgId}/members/{userId}/role` | Gán vai trò cho member. Body: `{ role: code \| null }`. **Owner** đổi cho bất kỳ ai; **user thường** chỉ đổi role của chính mình (khác → 403); code không tồn tại → 404 → 204 |

```json
{
  "id": "uuid", "orgId": "uuid", "code": "SD", "name": "Thiết kế Phần mềm",
  "fullName": "Software Design", "description": "...", "color": "violet", "position": 2,
  "checklist": [ { "id": "...", "kind": "checklist", "text": "Create HLD", "role": "SW_Architect", "position": 0 } ],
  "outcomes":  [ { "id": "...", "kind": "outcome", "text": "SRS", "role": "BA", "position": 0 } ]
}
```

`color` ∈ `gray | cyan | violet | blue | orange | emerald | slate | rose | amber | teal` (FE map sang class Tailwind).

```json
{
  "id": "uuid",
  "name": "TechNova Solutions",
  "members": [ { "id": "...", "name": "...", "avatar": "...", "jobRole": "PM" } ]
}
```

### Projects

| Method | Path | Mô tả |
|---|---|---|
| GET | `/organizations/{orgId}/projects` | Dự án trong workspace — sắp theo `position` rồi `createdAt` (#31) |
| POST | `/organizations/{orgId}/projects` | Body: `{ name, description, startDate, targetDate?, status? }` — `targetDate` optional (#20). Dự án mới xuống cuối (`position` = max+1) |
| POST | `/organizations/{orgId}/projects/reorder` | #31: sắp lại thứ tự hiển thị. Body `{ orderedIds: [projectId…] }` → trả danh sách đã sắp. **Chỉ owner/superuser** → 200; khác → 403 |
| GET | `/projects/{projectId}` | Chi tiết |
| PATCH | `/projects/{projectId}` | Partial update (`name`/`description`/`status`/`progress`/`startDate`/`targetDate`). **Chỉ PIC/superuser** → 200; không phải → 403. `targetDate: null` = xóa ngày kết thúc |
| PATCH | `/projects/{projectId}/pic` | Đổi PIC. Body `{ picUserId }`. PIC hiện tại / owner / superuser → 200; khác → 403 (#11) |
| DELETE | `/projects/{projectId}` | **Chỉ PIC/superuser** → 204; không phải → 403 |
| GET | `/projects/{projectId}/activity` | Changelog dự án (ai tạo/sửa/xóa phase) — nguồn cho Project Detail Modal |

```json
{
  "id": "uuid",
  "orgId": "uuid",
  "name": "Cloud Migration",
  "description": "Migrate infra to AWS",
  "status": "On Track",
  "startDate": "2026-04-03",
  "targetDate": null,
  "progress": 55,
  "position": 0,
  "createdBy": "uuid",
  "picUserId": "uuid"
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

**POST body** — `phaseType` là `code` của một phase definition trong workspace (#26 mảng A). Nếu không gửi `checklist`/`outcomes`, BE tự sinh từ checklist/outcome mặc định của phase definition đó; `assignee` mặc định = người tạo:

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

`phaseType` = `code` của phase definition trong workspace (động, #26 mảng A — không còn enum cố định; xem `GET /organizations/{orgId}/phases`) · `tag` ∈ `Backlog | Todo | Inprogress | Complete | Canceled`

### Phase Items (checklist & outcomes)

`kind` ∈ `checklist | outcome`.

| Method | Path | Mô tả |
|---|---|---|
| POST | `/phase-blocks/{blockId}/items` | Body: `{ kind, text, role? }` |
| PATCH | `/phase-blocks/{blockId}/items/{itemId}` | Body: `{ text?, done?, role?, position? }` — toggle done dùng cái này. **#9**: nếu `kind=outcome` và `done=true` khi chưa có attachment (`outcome_item_id` trỏ tới item) → **422** |
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
| POST | `/phase-blocks/{blockId}/attachments/link` | JSON `{ fileName, url, outcomeItemId? }` → `kind: "link"`; `outcomeItemId` trỏ vào `phase_items` kind=`outcome` (#9) |
| POST | `/phase-blocks/{blockId}/attachments/file` | `multipart/form-data` field `file`, optional `outcomeItemId` (UUID) → upload MinIO (bucket `attachments`), BE set `kind: "file"` + `url` |
| DELETE | `/phase-blocks/{blockId}/attachments/{attachmentId}` | xóa row + object MinIO → 204 |

```json
{ "id": "uuid", "kind": "link", "fileName": "Spec (Google Docs)", "url": "https://...", "outcomeItemId": "uuid", "uploadedBy": "uuid", "uploadedAt": "..." }
```

> **#9 — Outcome bắt buúc có tài liệu**: attachment có `outcomeItemId` là tài liệu đính kèm cho outcome item đó. Khi tick outcome item `done=true`, BE kiểm tra ≥1 attachment trỏ tới nó — không có → **422**.

### Change Requests (approval queue)

Owner/superuser xử lý yêu cầu sửa/xóa dự án của member.

> ⚠️ **DEPRECATED (#11)**: các endpoint change-requests vẫn được mount (backward-compat) nhưng
> **không còn tạo change request mới** — sửa/xóa dự án giờ do PIC quyết định trực tiếp (xem
> Projects). Endpoint `GET /organizations/{orgId}/change-requests` sẽ luôn trả danh sách rỗng
> sau khi nâng cấp.

| Method | Path | Mô tả |
|---|---|---|
| GET | `/organizations/{orgId}/change-requests` | Danh sách `pending` (owner-only) — deprecated, thường rỗng |
| POST | `/change-requests/{id}/approve` | Owner duyệt → áp dụng thay đổi/xóa, báo người tạo — deprecated |
| POST | `/change-requests/{id}/reject` | Owner từ chối → báo người tạo — deprecated |

### Notifications (in-app)

FE poll định kỳ + badge chưa đọc. BE tự sinh khi có sự kiện.

| Method | Path | Mô tả |
|---|---|---|
| GET | `/notifications?unreadOnly=false` | Thông báo của user hiện tại (mới nhất trước) |
| GET | `/notifications/unread-count` | `{ count }` |
| POST | `/notifications/{id}/read` | Đánh dấu đã đọc → 204 |
| POST | `/notifications/read-all` | Đánh dấu tất cả đã đọc → `{ count }` |

```json
{ "id": "uuid", "type": "phase_assigned", "title": "...", "body": "",
  "orgId": "uuid", "projectId": "uuid", "phaseBlockId": "uuid", "changeRequestId": null,
  "read": false, "createdAt": "..." }
```

`type` ∈ `member_added | member_removed | phase_assigned | phase_created | phase_updated | phase_deleted | comment_added | change_request_created | change_request_approved | change_request_rejected`

### Announcements (#27 — kênh thông báo từ admin)

Admin (superuser) broadcast thông báo (body markdown) hiển thị trong khoảng `[startsAt, endsAt]`. User thấy modal khi đăng nhập; có thể tự ẩn "hôm nay / tuần này".

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/announcements/active` | mọi user | Thông báo đang trong time-range **và** user chưa tự ẩn (mới nhất trước) |
| POST | `/announcements/{id}/dismiss` | mọi user | Ẩn 1 thông báo: body `{ scope }` (`day` \| `week`) → 204. `scope` khác → 422 |
| GET | `/announcements` | superuser | Toàn bộ thông báo (cả sắp tới / hết hạn) để quản lý |
| POST | `/announcements` | superuser | Tạo → 201. `startsAt >= endsAt` → 422 |
| PATCH | `/announcements/{id}` | superuser | Sửa (title/body/startsAt/endsAt) — 404 nếu không tồn tại, 422 nếu time-range sai |
| DELETE | `/announcements/{id}` | superuser | Xóa → 204 |

```json
{ "id": "uuid", "title": "Bảo trì hệ thống", "body": "# Markdown...",
  "startsAt": "2026-06-22T00:00:00Z", "endsAt": "2026-06-25T00:00:00Z",
  "createdBy": "uuid", "createdAt": "...", "updatedAt": "..." }
```

> Hạn ẩn tính theo UTC: `day` → hết 00:00 ngày kế; `week` → hết 00:00 thứ Hai kế tiếp. Dismiss là **per-user** (`announcement_dismissals`), không ảnh hưởng user khác.

### Activity Log (changelog)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/phase-blocks/{blockId}/activity` | Changelog 1 phase (đổi ngày, thêm người, đổi trạng thái...) |
| GET | `/projects/{projectId}/activity` | Changelog dự án (tạo/sửa/xóa phase) — giữ cả dòng của phase đã xóa |

```json
{ "id": "uuid", "projectId": "uuid", "phaseBlockId": "uuid", "userId": "uuid",
  "action": "changed end date", "target": "2026-06-20 → 2026-06-24", "createdAt": "..." }
```

### Templates (đã bỏ — #26 mảng A)

> Endpoint `GET /templates/phase-tasks` và bảng global `phase_task_templates` đã bị xóa. Checklist/outcome mặc định nay thuộc từng **phase definition** của workspace — xem `GET /organizations/{orgId}/phases` (mỗi phase trả kèm `checklist`/`outcomes`).

## Mapping AppContext → API

Lộ trình thay mock data trong `frontend/src/context/AppContext.tsx`:

| FE hiện tại | Thay bằng |
|---|---|
| `login(email, password)` | `POST /auth/login` (login) / `POST /auth/register` (đăng ký, KHÔNG role — #26 mảng B) |
| Vai trò công việc per-workspace | `GET/POST/PATCH/DELETE /organizations/{id}/roles` + `PATCH /organizations/{id}/members/{userId}/role` |
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
| `deleteProject(id, reason?)` — FE xóa kèm phase blocks | `DELETE /projects/{id}?reason=…` (#14: BE log "deleted project — lý do …" vào activity workspace; cascade phase theo SCHEMA.md) |
| `orgPhaseBlocks` (filter local) | `GET /organizations/{orgId}/phase-blocks` |
| `addPhaseBlock` | `POST /projects/{projectId}/phase-blocks` |
| `updatePhaseBlock(id, updates)` | `PATCH /phase-blocks/{id}` hoặc endpoint con tương ứng (items/comments/attachments) |
| `deletePhaseBlock(id, reason?)` | `DELETE /phase-blocks/{id}?reason=…` (#14: BE log "deleted phase — lý do …" vào activity dự án) |
| Checklist/outcome mặc định khi tạo phase | `GET /organizations/{orgId}/phases` (mỗi phase definition kèm `checklist`/`outcomes`) |
| Quản lý phase per-workspace (Settings) | `GET/POST/PATCH/DELETE /organizations/{orgId}/phases` + `POST …/phases/reorder` |
| Workload (Team view) | Tính ở FE từ phase blocks; hoặc BE cấp `GET /organizations/{orgId}/members/workload` |

## Công thức derived (FE và BE phải khớp)

Các số liệu này không lưu DB, tính khi đọc. Định nghĩa thống nhất:

- **Tiến độ phase block** (`progressPct`) = `(done checklist + done outcomes) / (total checklist + total outcomes)`, làm tròn %. Phase không có items → 0% (#8).
- **Tiến độ dự án** (`projects.progress`) = hiện do người dùng đặt thủ công (slider trong Project Detail). BE giữ là cột lưu trực tiếp, không auto-tính.
- **Workload thành viên** (Team view) = số checklist item `done=false` trong các phase block **đang hoạt động** (`tag ∈ {Backlog, Todo, Inprogress}`) mà user là `assignee` **hoặc** có trong `participantIds`. Quy đổi %: `min(100, openTasks / CAPACITY * 100)` với `CAPACITY = 15` task mở ≈ 100%.
- **Phân bổ phase** (Dashboard) = đếm phase block theo `phaseType` trong workspace.
- **Deadline sắp tới** (Dashboard) = phase block có `tag ∉ {Complete, Canceled}`, sắp theo `endDate` tăng dần, lọc còn ≥ -5 ngày so với hôm nay.

## Versioning & mở rộng

- Prefix `/api/v1` — thay đổi breaking sẽ lên `/api/v2`.
- Pagination chưa cần ở v1 (dataset nhỏ); khi cần sẽ thêm `?limit=&offset=` + header `X-Total-Count`, không đổi shape item.
- Realtime (nhiều người cùng kéo timeline) để sau: cân nhắc WebSocket `/ws/organizations/{orgId}` phát event `phase-block.updated`.
