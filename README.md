# ProjectHub — Development Process Pipeline

Nền tảng theo dõi quy trình phát triển phần mềm theo phase: mọi dự án trên một timeline Gantt, đi qua các phase (mặc định 7 phase PA → SA → SD → SI → ST → DEP → OM, mỗi workspace tuỳ biến được) với checklist theo vai trò, PIC rõ ràng và trạng thái tự cảnh báo khi dự án chậm.

Mô tả sản phẩm đầy đủ: [docs/APP_DESCRIPTION.md](docs/APP_DESCRIPTION.md)

## Cấu trúc repo

```
project-monitoring/
├── frontend/        # React 19 + TypeScript + Vite + Tailwind
├── backend/         # Python 3.12 + FastAPI + PostgreSQL — Clean Architecture
└── docs/
    ├── APP_DESCRIPTION.md   # Sản phẩm là gì, giải quyết vấn đề gì, kiến trúc hệ thống
    ├── API_CONTRACT.md      # Hợp đồng REST API v1 giữa FE và BE
    ├── SCHEMA.md            # Schema PostgreSQL (DDL + mapping với FE types)
    ├── ROADMAP.md           # Tiến độ các issue theo wave
    └── UX_DESIGN.md
```

## Cấu hình

Toàn bộ cấu hình nằm trong **một file `.env` ở gốc repo** — mọi biến đều được giải thích trong `.env.example`:

```bash
cp .env.example .env     # rồi sửa giá trị (JWT_SECRET, IP/port khi deploy…)
```

- `docker compose` nạp `.env` cho mọi service (`env_file`) và đọc cổng từ đó; compose không đặt giá trị riêng.
- Backend chạy ngoài docker đọc thẳng `<repo>/.env`; frontend `npm run dev` đọc `VITE_API_BASE` từ đó.
- Thiếu biến bắt buộc → compose/backend báo lỗi ngay, không âm thầm dùng mặc định.

## Chạy cả stack (khuyến nghị)

```bash
docker compose up --build    # FE :5173 · API/Swagger :8000/docs · MinIO console :9001
```

## Chạy riêng để dev

```bash
docker compose up -d postgres minio minio-setup

# Backend (uv). `.env` trỏ host theo mạng docker → ghi đè sang localhost cho phiên shell này:
cd backend
uv sync --extra dev
export POSTGRES_HOST=localhost:5432 MINIO_ENDPOINT=http://localhost:9000
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

Chi tiết kiến trúc Clean Architecture và trạng thái implement: [backend/README.md](backend/README.md)

## Tính năng chính

- **Pipeline Gantt** — mọi dự án của workspace trên một timeline; zoom 3 ngày/tuần/tháng/quý; 3 chế độ Chỉ xem · Sắp xếp (kéo/giãn rồi Lưu/Hủy) · Tạo phase; phase trùng lịch tự xuống hàng; lọc theo tên/PIC, trạng thái, khoảng thời gian, "của tôi"
- **Quy trình tuỳ biến** — phase và vai trò công việc theo từng workspace, kèm checklist/outcome mặc định theo vai trò; wizard tạo workspace 3 bước
- **Phase Detail** — checklist & outcome theo vai trò (outcome cần tài liệu mới được tick), tài liệu file/link, bình luận, người tham gia theo RACI (kể cả người ngoài hệ thống), lịch sử thay đổi
- **PIC & quyền** — chỉ PIC/admin sửa thông tin dự án & phase; ai cũng tick việc, bình luận
- **Sức khỏe tự động** — Đúng tiến độ / Có rủi ro / Chậm tiến độ tự tính từ phase; Dashboard, trang Nhóm (khối lượng việc)
- **Quản trị** — bảng admin (workspace, người dùng, quyền admin), thông báo in-app và thông báo hệ thống
- **Song ngữ VI/EN** — mặc định theo ngôn ngữ trình duyệt, đổi bằng nút VI | EN (nhớ trong trình duyệt); ngày giờ, thông báo và thông báo lỗi đều theo ngôn ngữ đã chọn

Mô tả đầy đủ: [docs/APP_DESCRIPTION.md](docs/APP_DESCRIPTION.md) · tiến độ issue: [docs/ROADMAP.md](docs/ROADMAP.md)
