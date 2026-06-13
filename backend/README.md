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

## Chạy cả stack (khuyến nghị)

Một lệnh dựng Postgres + MinIO + backend + frontend:

```bash
cp .env.example .env          # ở thư mục gốc repo
docker compose up --build
```

- API + Swagger: http://localhost:8000/docs
- Frontend: http://localhost:5173
- MinIO console: http://localhost:9001 (minioadmin / minioadmin)

Backend tự chạy `alembic upgrade head` khi khởi động (tạo schema + seed templates).

## Chạy backend riêng (dev)

```bash
cd backend
uv sync --extra dev
# Postgres + MinIO qua docker compose:
docker compose up -d postgres minio minio-setup
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

## Test (TDD)

Chạy trên Postgres test DB thật (`projecthub_test`), mỗi test 1 transaction rollback;
slice MinIO cần `minio` + `minio-setup` đang chạy.

```bash
docker exec project-monitoring-postgres-1 psql -U projecthub -c "CREATE DATABASE projecthub_test"  # lần đầu
uv run pytest -q
```

## Trạng thái

Backend đã implement đầy đủ (32 test xanh), thay mock data của frontend:
- ✅ Clean Architecture 4 tầng + ports + ORM khớp `docs/SCHEMA.md`
- ✅ Auth JWT + first-run setup super-user
- ✅ Permission 2 chiều: `is_superuser` + workspace `owner|member`; member sửa/xóa dự án qua **approval queue**
- ✅ Organizations + members, Projects, Phase blocks (+ items / comments / changelog)
- ✅ Changelog 2 cấp (phase + dự án), Notifications in-app
- ✅ Attachments (link + file) & avatar qua **MinIO**, Templates (seed 56 dòng)
- ✅ Alembic migrations + docker-compose toàn stack
- ⬜ Frontend wiring (thay `AppContext` mock bằng API client)
