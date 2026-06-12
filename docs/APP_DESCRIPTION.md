# ProjectHub — APP Description

## 1. ProjectHub là gì?

**ProjectHub** là nền tảng **theo dõi và quản lý quy trình phát triển phần mềm** dành cho các đội ngũ phát triển (development teams) và quản lý dự án (project managers).

Hệ thống trả lời 3 câu hỏi cốt lõi:

1. **Dự án đang ở đâu?** — Visualize toàn bộ lifecycle qua 7 phase chuẩn
2. **Ai đang làm gì?** — Tracking người tham gia, task, deadline theo thời gian thực
3. **Có rủi ro không?** — Cảnh báo sớm dự án At Risk / Delayed

---

## 2. Vấn đề đang giải quyết

### Pain points của PM / Team Lead:
- **Không có cái nhìn tổng thể** — Nhiều dự án, nhiều phase, không biết cái nào đang
- **Communication gap** — Developer không biết phase trước đã xong chưa, tester không biết khi nào bắt đầu
- **Deadline mờ nhạt** — Không có visual timeline → dễ miss deadline
- **Status meeting lãng phí** — Mỗi tuần họp 30 phút chỉ để hỏi "Đâu rồi?" → thay bằng 1 cái nhìn dashboard

### Pain points của Developer / Tester:
- **Không rõ context** — Không biết phase mình làm nằm ở đâu trong tổng thể
- **Checklist phân tán** — Task rải rác trong Excel, Jira, Slack, email
- **Không thấy progress** — Làm xong task nhưng không thấy nó contribute thế nào vào phase

---

## 3. Target Users

| User | Role | Mục đích chính |
|------|------|----------------|
| **Project Manager** | Quản lý nhiều dự án | Overview, tracking, risk management, reporting |
| **Team Lead** | Quản lý 1 dự án cụ thể | Phase tracking, task assignment, timeline |
| **Business Analyst** | Phân tích yêu cầu | PA, SA phases — requirements, BRD |
| **Developer** | Code implementation | SI phase — task checklist, code tracking |
| **UI/UX Designer** | Thiết kế giao diện | SD phase — wireframes, design handoff |
| **Tester** | Kiểm thử | ST phase — test cases, bug tracking |
| **SysOps** | Vận hành hệ thống | DEP, OM phases — deployment, monitoring |

---

## 4. Core Features

### 4.1. 7-Phase Development Pipeline
Hệ thống xây dựng quy trình chuẩn 7 phase cho MỖI dự án:

```
PA → SA → SD → SI → ST → DEP → OM
│    │    │    │    │    │     │
│    │    │    │    │    │     └── Operation & Maintenance
│    │    │    │    │    └──────── Deployment
│    │    │    │    └───────────── Software Test
│    │    │    └────────────────── Software Implementation
│    │    └─────────────────────── Software Design
│    └──────────────────────────── Software Analysis
└───────────────────────────────── Project Assessment
```

**Mỗi phase có:**
- Checklist công việc cụ thể
- Người tham gia (participants)
- Timeline (start → end date)
- Attachments (tài liệu)
- Comments (thảo luận)
- Activity log (lịch sử thay đổi)

### 4.2. Interactive Pipeline Timeline
- **Visual Gantt-like** — Thấy toàn bộ phase blocks trên timeline
- **Zoom levels** — Week / Month / Quarter — từ chi tiết đến tổng quan
- **Drag & Drop** — Kéo phase block để điều chỉnh timeline
- **Resize** — Kéo 2 đầu để thay đổi start/end date
- **Today marker** — Biết chính xác "bây giờ đang ở đâu"
- **Overlap detection** — Tự mở rộng hàng khi phase trùng thời gian

### 4.3. Workspace & Organization
- **Multi-workspace** — Mỗi workspace là 1 tổ chức/công ty
- **Multi-project** — Mỗi workspace có nhiều dự án
- **Team management** — Xem thành viên, vai trò, assignment
- **Role-based** — PM, BA, Developer, Tester, Designer, SysOps

### 4.4. Project Dashboard
- **Overview metrics** — Tổng dự án, trạng thái, deadline sắp tới
- **Status distribution** — On Track / At Risk / Delayed
- **Phase distribution** — Phase nào đang active nhiều nhất
- **Quick actions** — Tạo dự án, tạo phase, navigate nhanh

### 4.5. Project Detail Modal
- Click vào dự án (panel trái của Pipeline hoặc card trên Dashboard) → modal giữa màn hình
- **Sửa inline**: tên, mô tả, trạng thái, ngày bắt đầu/mục tiêu, tiến độ (slider)
- **Stats nhanh**: số phase, phase hoàn thành, ngày còn lại tới deadline, phân bố phase theo loại
- **Xóa dự án** — xác nhận 2 bước, xóa kèm toàn bộ phase blocks

### 4.6. Collaboration
- **Checklist** — Task breakdown trong mỗi phase
- **Comments** — Thảo luận trực tiếp trên phase
- **Attachments** — Đính kèm tài liệu
- **Activity Log** — Ai đã làm gì, khi nào

---

## 5. User Journey

```
┌─────────────┐    ┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Landing     │───→│  Login/      │───→│  Workspace       │───→│  Workspace      │
│  Page        │    │  Register    │    │  Selector        │    │  (Dashboard)    │
└─────────────┘    └─────────────┘    └──────────────────┘    └────────┬────────┘
                                                                            │
                                          ┌─────────────────────────────────┤
                                          │                                  │
                                          ▼                                  ▼
                                   ┌─────────────┐                    ┌─────────────┐
                                   │  Pipeline    │                    │  Team View  │
                                   │  Timeline    │                    │             │
                                   └──────┬──────┘                    └─────────────┘
                                          │
                                    ┌─────┴──────┐
                                    │            │
                                    ▼            ▼
                              ┌───────────┐ ┌───────────┐
                              │  Create   │ │  Phase    │
              │  Phase   │ │  Detail   │
                              └───────────┘ └───────────┘
```

### Flow chi tiết:
1. **Landing Page** — Hiểu ProjectHub là gì, features, CTA đăng ký/dùng thử
2. **Login** — Xác thực (email/password hoặc SSO)
3. **Workspace Selector** — Chọn workspace hoặc tạo mới
4. **Dashboard** — Tổng quan workspace: projects, stats, upcoming deadlines
5. **Pipeline Timeline** — Xem và tương tác với Gantt chart
6. **Phase Detail** — Click vào phase → xem checklist, comments, attachments
7. **Team View** — Xem thành viên, vai trò, assignment

---

## 6. Differentiation (Điểm khác biệt)

| Feature | Jira / Azure DevOps | ProjectHub |
|---------|---------------------|------------|
| Visual pipeline | Gantt chart cơ bản | 7-phase Gantt với drag & drop realtime |
| Phase structure | Custom, không chuẩn | 7 phase chuẩn hóa cho software dev |
| Learning curve | Cao — nhiều config | Thấp — ready-to-use |
| Timeline zoom | Giới hạn | Week / Month / Quarter seamless |
| Focus | Issue tracking | Process pipeline tracking |

---

## 7. Design Principles

1. **Clarity over density** — Mỗi screen chỉ show thông tin user cần RIGHT NOW
2. **Progressive disclosure** — Không dump hết data, mở dần theo tương tác
3. **Status at a glance** — 1 giây nhìn thấy cái gì OK, cái nào cần attention
4. **Context-aware actions** — Action buttons xuất hiện khi cần, không lúc nào cũng hiện
5. **Vietnamese-first UI** — Giữ technical terms (Phase, Pipeline, Dashboard) nhưng labels tiếng Việt

---

## 8. Kiến trúc hệ thống

Monorepo 2 phần, giao tiếp qua REST API:

```
project-monitoring/
├── frontend/    # React SPA (hiện chạy mock data)
├── backend/     # Python API (Clean Architecture)
└── docs/        # APP_DESCRIPTION.md · API_CONTRACT.md · SCHEMA.md
```

### Frontend

| Thành phần | Công nghệ |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS (Linear/Cal.com design system) |
| Animation | framer-motion |
| State | React Context (`AppContext`) — hiện dùng mock data trong `src/data/mockData.ts` |

### Backend

| Thành phần | Công nghệ |
|---|---|
| Ngôn ngữ / Framework | Python 3.12 · FastAPI |
| Kiến trúc | **Clean Architecture** — 4 tầng: `domain → application → infrastructure / presentation` |
| Database | **PostgreSQL 16** · SQLAlchemy 2.0 (async) + asyncpg |
| Migrations | Alembic |
| Auth | JWT (python-jose) |

Quy tắc phụ thuộc: tầng trong không biết tầng ngoài — `domain` (entities thuần) ← `application` (use cases + ports) ← `infrastructure` (PostgreSQL repos) / `presentation` (FastAPI routers). Chi tiết: `backend/README.md`.

### Lộ trình thay mock data

1. **Hợp đồng trước, code sau** — FE và BE cùng bám [API_CONTRACT.md](./API_CONTRACT.md); database theo [SCHEMA.md](./SCHEMA.md)
2. BE implement các router theo contract (Projects đã có làm mẫu end-to-end)
3. Seed `phase_task_templates` từ `PHASE_ROLE_TASKS`/`PHASE_ROLE_OUTCOMES` (frontend/src/types.ts)
4. FE thay `mockData.ts` bằng API client (fetch theo contract), `AppContext` giữ nguyên interface để components không phải sửa
