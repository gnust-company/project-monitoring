# ProjectHub — APP Description

## 1. ProjectHub là gì?

**ProjectHub** là nền tảng **theo dõi quy trình phát triển phần mềm theo phase**, dành cho đội phát triển và người quản lý dự án. Mỗi dự án được đặt lên một **timeline Gantt** và đi qua các phase — mặc định 7 phase PA → SA → SD → SI → ST → DEP → OM, mỗi workspace tuỳ biến được.

Hệ thống trả lời 3 câu hỏi cốt lõi:

1. **Dự án đang ở đâu?** — Mọi dự án của workspace trên một timeline, theo từng phase
2. **Ai đang làm gì?** — PIC cho mỗi dự án/phase, checklist theo vai trò, người tham gia theo RACI
3. **Có rủi ro không?** — Trạng thái Đúng tiến độ / Có rủi ro / Chậm tiến độ tự tính từ phase

---

## 2. Vấn đề đang giải quyết

### PM / Team Lead
- **Không có cái nhìn tổng thể** — nhiều dự án, nhiều phase, không biết cái nào đang chậm
- **Communication gap** — developer không biết phase trước xong chưa, tester không biết khi nào bắt đầu
- **Deadline mờ nhạt** — không có timeline trực quan → dễ trễ hạn
- **Status meeting lãng phí** — họp chỉ để hỏi "đến đâu rồi?" → thay bằng một cái nhìn Dashboard

### Developer / Tester
- **Không rõ context** — không biết phase mình làm nằm ở đâu trong tổng thể
- **Checklist phân tán** — việc rải rác trong Excel, Jira, chat, email
- **Không thấy progress** — làm xong việc nhưng không thấy nó đóng góp gì vào phase

---

## 3. Target Users

| User | Mục đích chính |
|------|----------------|
| **Project Manager / Team Lead** | Tổng quan workspace, tạo dự án/phase, theo dõi rủi ro và deadline |
| **Business Analyst** | PA, SA, SD — yêu cầu, BRD, SRS |
| **SW Architect / Developer** | SD, SI — thiết kế, mã nguồn |
| **UI / GUI Designer** | SD — wireframe, giao diện |
| **Tester** | SI, ST — test case, test report |
| **SysOps** | SA, SI, DEP, OM — hạ tầng, triển khai, vận hành |
| **Admin hệ thống** | Quản lý workspace, người dùng, quyền admin, thông báo hệ thống |

Vai trò công việc là **theo từng workspace** và tuỳ biến được (8 vai trò mặc định ở trên).

---

## 4. Core Features

### 4.1. Quy trình theo phase — tuỳ biến theo workspace
- Mỗi workspace có **bộ phase riêng** (`phase_definitions`): mã, tên đầy đủ, màu, thứ tự, mô tả. Mặc định seed 7 phase:

```
PA → SA → SD → SI → ST → DEP → OM
│    │    │    │    │    │     └── Operation & Maintenance
│    │    │    │    │    └──────── Software Deployment
│    │    │    │    └───────────── Software Testing
│    │    │    └────────────────── Software Implementation
│    │    └─────────────────────── Software Design
│    └──────────────────────────── Software Analysis
└───────────────────────────────── Project Assessment
```

- Mỗi phase mang **checklist + outcome mặc định theo vai trò** — tạo phase là có sẵn danh sách việc.
- **Vai trò công việc** (8 mặc định, có màu) cũng tuỳ biến theo workspace; đổi mã vai trò/phase tự cập nhật mọi tham chiếu.
- Tạo workspace qua **wizard 3 bước**: Thông tin → Vai trò → Phase.

### 4.2. Pipeline Timeline
- **Gantt cho mọi dự án** của workspace; zoom **3 ngày / tuần / tháng / quý**; vạch **Hôm nay**.
- **3 chế độ**: *Chỉ xem* (kéo để di chuyển lịch) · *Sắp xếp* (kéo/giãn phase, thay đổi chỉ áp dụng khi bấm **Lưu**, có **Hủy**) · *Tạo phase* (kéo ngang trên hàng dự án, lịch giữ cố định).
- Phase trùng lịch **tự xuống hàng mới**, không xô lệch ngày.
- **Lọc & tìm**: theo tên dự án hoặc PIC (không phân biệt dấu), trạng thái, khoảng thời gian, "chỉ dự án của tôi"; sidebar đồng bộ với timeline.
- Owner **kéo-thả sắp thứ tự** dự án (dùng chung cho cả workspace).

### 4.3. Phase Detail
- **Checklist & outcome theo vai trò**; tiến độ phase = (checklist + outcome đã xong) / tổng.
- **Outcome cần bằng chứng**: chỉ đánh dấu xong khi đã đính kèm tài liệu.
- **Tài liệu**: tải file lên (MinIO, có thanh tiến độ) hoặc đính kèm link ngoài; gắn với phase hoặc với từng outcome.
- **Bình luận**; người liên quan nhận thông báo.
- **Người tham gia theo RACI** (Thực hiện / Chịu trách nhiệm / Tham vấn / Được thông báo); thêm được **người ngoài hệ thống** chỉ bằng tên.
- Sửa thông tin phase theo kiểu **nháp → Lưu**; **xoá phải nêu lý do**.

### 4.4. Dự án & PIC
- Mỗi dự án có **PIC** (mặc định là người tạo, đổi được). Dự án **không có ngày kết thúc** — mốc tham chiếu là `endDate` xa nhất của các phase.
- **Trạng thái tự tính** (`computeProjectStatus`):
  - **Chậm tiến độ** — có phase quá `endDate` mà chưa hoàn tất
  - **Có rủi ro** — tiến độ thực (checklist + outcome) chậm hơn tiến độ theo lịch
  - **Đúng tiến độ** — còn lại
- **Project Detail Modal**: sửa thông tin, đổi PIC, tiến độ theo phase / theo ngày, changelog dự án, xoá có lý do.

### 4.5. Dashboard
- **KPI**: Tổng dự án · Đúng tiến độ · Có rủi ro · Chậm tiến độ (click để lọc sang Pipeline).
- **Sức khỏe workspace** (vòng tiến độ + phân bổ trạng thái), **Deadline sắp tới**, **Phân bổ phase**, **Hoạt động gần đây** (gộp sự kiện phase + vòng đời dự án), **Dự án gần đây**.

### 4.6. Nhóm & hồ sơ
- **Trang Nhóm**: thành viên, vai trò, dự án đang tham gia, **khối lượng việc** (số việc đang mở; 15 việc ≈ 100%).
- **Hồ sơ**: tài khoản toàn cục (tên, avatar, đổi mật khẩu) tách khỏi **hồ sơ trong workspace** (thống kê, tự đổi vai trò, danh sách phase của tôi).

### 4.7. Quyền
- **Admin hệ thống (superuser)**: tài khoản đầu tiên tạo qua màn hình *thiết lập lần đầu*; cấp/thu hồi quyền admin cho người khác.
- **Trong workspace**: `owner` quản lý workspace (đổi tên, thành viên, vai trò, phase, xoá); `member` tham gia bình thường. Hiện owner **thêm thẳng** thành viên bằng email (luồng mời có accept/từ chối: #28).
- **Theo PIC**: chỉ PIC (hoặc admin) sửa/xoá **thông tin** dự án & phase; **ai cũng** tick checklist/outcome, đính kèm và bình luận — mọi thao tác được ghi lại. *(Hàng đợi duyệt thay đổi cũ đã bỏ.)*

### 4.8. Thông báo
- **In-app**: được thêm vào workspace, được giao phase, có bình luận… — badge số chưa đọc, đánh dấu đã đọc (FE poll 30 giây).
- **Thông báo hệ thống** từ admin: nội dung markdown, khoảng thời gian hiển thị; người dùng ẩn được "hôm nay" hoặc "tuần này".

### 4.9. Bảng quản trị (admin)
- Tổng quan số liệu, danh sách workspace, người dùng (đặt lại mật khẩu, cấp/thu hồi admin, xoá người dùng), thông báo hệ thống.

### 4.10. Changelog 2 cấp
- **Phase**: đổi ngày, đổi trạng thái, thêm/gỡ người tham gia, đổi vai trò RACI, hoàn thành việc, tài liệu… — hiển thị thành câu dễ đọc theo ngôn ngữ người dùng chọn.
- **Dự án**: tạo / sửa / xoá phase (dòng "đã xoá phase X" vẫn giữ sau khi phase bị xoá), tạo/đổi tên dự án.

### 4.11. Đăng ký & bảo mật
- Đăng ký bằng email/mật khẩu (JWT); có thể **giới hạn domain email** (`ALLOWED_EMAIL_DOMAINS`).
- Form đăng nhập/đăng ký báo lỗi rõ từng ô.

---

## 5. User Journey

```
Landing ──→ Đăng nhập / Đăng ký ──→ Chọn workspace (hoặc tạo mới) ──→ Workspace
                                                                         │
                     ┌───────────────┬───────────────┬───────────────────┤
                     ▼               ▼               ▼                   ▼
                 Dashboard       Pipeline          Nhóm         Cài đặt workspace
                                     │                          (owner: thành viên,
                          ┌──────────┴──────────┐                vai trò, phase)
                          ▼                     ▼
                     Tạo phase             Phase Detail
```

1. **Landing** — ProjectHub là gì; theo chân một dự án qua 7 phase; demo Pipeline chạy trên trình duyệt
2. **Đăng nhập / Đăng ký** — email + mật khẩu (lần đầu chạy hệ thống: tạo admin)
3. **Chọn workspace** — hoặc tạo mới qua wizard 3 bước
4. **Dashboard** — tổng quan, rủi ro, deadline, hoạt động
5. **Pipeline** — xem và thao tác trên Gantt
6. **Phase Detail** — checklist, outcome, tài liệu, bình luận, RACI, lịch sử
7. **Nhóm** — thành viên, vai trò, khối lượng việc

---

## 6. Differentiation (Điểm khác biệt)

| Feature | Jira / Azure DevOps | ProjectHub |
|---------|---------------------|------------|
| Visual pipeline | Gantt cơ bản | Gantt theo phase, kéo-thả có Lưu/Hủy |
| Phase structure | Tuỳ biến tự do, không định hướng | 7 phase mặc định cho software dev, tuỳ biến theo workspace |
| Việc trong phase | Tự tạo ticket | Checklist + outcome mặc định theo vai trò |
| Trạng thái dự án | Cập nhật tay | Tự tính từ phase |
| Learning curve | Cao — nhiều cấu hình | Thấp — dùng được ngay |
| Focus | Issue tracking | Process pipeline tracking |

---

## 7. Design Principles

1. **Clarity over density** — mỗi màn hình chỉ hiện thông tin cần ngay lúc đó
2. **Progressive disclosure** — mở dần theo tương tác
3. **Status at a glance** — một giây biết cái gì ổn, cái gì cần chú ý
4. **Context-aware actions** — nút hành động xuất hiện khi cần
5. **Song ngữ VI/EN** (#29) — mặc định theo ngôn ngữ trình duyệt, đổi bằng nút VI | EN (nhớ trong trình duyệt); giữ thuật ngữ kỹ thuật (Phase, Pipeline, PIC, RACI) ở cả hai ngôn ngữ; dữ liệu người dùng (tên phase, vai trò, checklist) không dịch

---

## 8. Kiến trúc hệ thống

Monorepo 2 phần, giao tiếp qua REST API v1 ([API_CONTRACT.md](./API_CONTRACT.md)):

```
project-monitoring/
├── frontend/    # React SPA
├── backend/     # Python API (Clean Architecture)
├── docs/        # APP_DESCRIPTION · API_CONTRACT · SCHEMA · ROADMAP · UX_DESIGN
├── docker-compose.yml
└── .env.example # nguồn cấu hình duy nhất
```

### Frontend

| Thành phần | Công nghệ |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS + Radix UI (shadcn-style) |
| Animation | framer-motion |
| State | React Context (`AppContext`) — dữ liệu thật từ API (`src/api/`); `src/data/mockData.ts` chỉ còn phục vụ bản demo ở landing |

### Backend

| Thành phần | Công nghệ |
|---|---|
| Ngôn ngữ / Framework | Python 3.12 · FastAPI |
| Kiến trúc | **Clean Architecture** — `domain → application → infrastructure / presentation` |
| Database | **PostgreSQL 16** · SQLAlchemy 2.0 (async) + asyncpg · Alembic |
| Lưu file | **MinIO** (S3-compatible) — tài liệu đính kèm, avatar |
| Auth | JWT |

Quy tắc phụ thuộc: tầng trong không biết tầng ngoài — `domain` (entities thuần) ← `application` (use cases + ports) ← `infrastructure` (PostgreSQL/MinIO) / `presentation` (FastAPI routers). Chi tiết: `backend/README.md`.

### Triển khai
- `docker compose up -d` dựng Postgres + MinIO + backend + frontend; backend tự chạy migration khi khởi động.
- Mọi cấu hình nằm trong **một file `.env`** ở gốc repo (xem `.env.example`).
