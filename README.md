# ProjectHub — Development Process Pipeline

Nền tảng theo dõi và quản lý quy trình phát triển phần mềm qua 7 phase chuẩn (PA → SA → SD → SI → ST → DEP → OM) trên timeline Gantt tương tác.

Mô tả sản phẩm đầy đủ: [docs/APP_DESCRIPTION.md](docs/APP_DESCRIPTION.md)

## Cấu trúc repo

```
project-monitoring/
├── frontend/        # React 19 + TypeScript + Vite + Tailwind (hiện chạy mock data)
├── backend/         # Python 3.12 + FastAPI + PostgreSQL — Clean Architecture
└── docs/
    ├── APP_DESCRIPTION.md   # Sản phẩm là gì, giải quyết vấn đề gì, kiến trúc hệ thống
    ├── API_CONTRACT.md      # Hợp đồng REST API v1 giữa FE và BE
    ├── SCHEMA.md            # Schema PostgreSQL (DDL + mapping với FE types)
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

## Tính năng chính (frontend)

- **Pipeline Timeline** — Gantt theo Tuần/Tháng/Quý; 2 chế độ: Xem (pan) và Tạo phase (kéo-thả trên hàng dự án để tạo)
- **Phase Block** — kéo di chuyển, resize 2 đầu; block bị va chạm tự xuống dòng mới, không lệch lịch
- **Checklist & Outcomes theo role** — tự sinh từ nguồn chuẩn theo loại phase, tracking tiến độ
- **Document** — đính kèm file hoặc link tài liệu ngoài
- **Workspace đa tổ chức** — sidebar thu gọn được, lọc theo dự án

## Lộ trình thay mock data

FE đang dùng dữ liệu in-memory tại `frontend/src/data/mockData.ts`. Việc chuyển sang data thật bám theo [docs/API_CONTRACT.md](docs/API_CONTRACT.md) và [docs/SCHEMA.md](docs/SCHEMA.md) — xem mục "Lộ trình thay mock data" trong APP_DESCRIPTION.md.
