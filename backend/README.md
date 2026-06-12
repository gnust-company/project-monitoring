# ProjectHub Backend

API backend cho ProjectHub — Python · FastAPI · PostgreSQL, tổ chức theo **Clean Architecture**.

Hợp đồng API và schema database: xem [docs/API_CONTRACT.md](../docs/API_CONTRACT.md) và [docs/SCHEMA.md](../docs/SCHEMA.md).

## Kiến trúc

Phụ thuộc chỉ hướng **vào trong**: `presentation → application → domain`. Tầng `infrastructure` cài đặt các port (interface) do `application` định nghĩa.

```
app/
├── domain/              # Tầng trong cùng — entities & value objects thuần Python,
│   │                    # KHÔNG import framework/DB
│   ├── entities.py      # User, Organization, Project, PhaseBlock, PhaseItem, ...
│   └── value_objects.py # Enums: DevPhase, PhaseTag, UserRole, ProjectStatus, ...
│
├── application/         # Use cases + ports
│   ├── ports.py         # Abstract repositories (interface) — infrastructure cài đặt
│   └── use_cases/       # Business logic, mỗi use case 1 class, nhận port qua constructor
│
├── infrastructure/      # Tầng ngoài — chi tiết kỹ thuật
│   ├── db/
│   │   ├── session.py   # Async engine / session factory (SQLAlchemy + asyncpg)
│   │   └── models.py    # ORM models ánh xạ docs/SCHEMA.md
│   └── repositories/    # Cài đặt ports bằng SQLAlchemy
│
├── presentation/        # FastAPI — routers + Pydantic schemas (DTO)
│   └── api/
│       ├── schemas.py
│       ├── deps.py      # Dependency injection: session, repos, use cases
│       └── routers/
│
├── core/
│   └── config.py        # Settings từ env (pydantic-settings)
└── main.py              # Khởi tạo FastAPI app, mount routers
```

Quy tắc:
- `domain` không biết gì về FastAPI, SQLAlchemy hay PostgreSQL.
- `application` chỉ thao tác qua entities và ports; không import `infrastructure`.
- Đổi DB/framework chỉ đụng `infrastructure` và `presentation`.

## Chạy dev

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -e ".[dev]"
copy .env.example .env                            # rồi sửa DATABASE_URL

# PostgreSQL local (ví dụ qua Docker):
docker run -d --name projecthub-pg -e POSTGRES_USER=projecthub \
  -e POSTGRES_PASSWORD=projecthub -e POSTGRES_DB=projecthub -p 5432:5432 postgres:16

# Tạo schema lần đầu: chạy docs/SCHEMA.md (phần DDL) hoặc alembic upgrade head (khi đã có migration)

uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

## Trạng thái

Đây là skeleton chuẩn bị thay mock data của frontend bằng data thật:
- ✅ Cấu trúc Clean Architecture đầy đủ 4 tầng
- ✅ Domain entities + enums khớp `frontend/src/types.ts`
- ✅ Ports (abstract repositories) cho toàn bộ aggregate
- ✅ ORM models khớp `docs/SCHEMA.md`
- ✅ Ví dụ wiring end-to-end: **Projects** (router → use case → repository)
- ⬜ Các use case / router còn lại — implement theo `docs/API_CONTRACT.md`
- ⬜ Auth JWT (đã có config, chưa có endpoint)
- ⬜ Alembic migrations
