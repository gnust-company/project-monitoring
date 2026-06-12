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

## Chạy Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

## Chạy Backend

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -e ".[dev]"
copy .env.example .env          # sửa DATABASE_URL trỏ tới PostgreSQL
uvicorn app.main:app --reload   # http://localhost:8000/docs
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
