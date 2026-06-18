# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ProjectHub is a development-process-pipeline tracker: software projects move through 7 standard phases (PA → SA → SD → SI → ST → DEP → OM), visualized as draggable phase blocks on an interactive Gantt timeline. `frontend/` (React 19 + Vite) and `backend/` (FastAPI + PostgreSQL) are independent apps wired by a versioned REST contract.

Most design docs are written in Vietnamese and are the source of truth — read them before changing cross-cutting behavior:
- [docs/API_CONTRACT.md](docs/API_CONTRACT.md) — REST API v1 contract between FE and BE
- [docs/SCHEMA.md](docs/SCHEMA.md) — PostgreSQL DDL and its mapping to FE types
- [docs/APP_DESCRIPTION.md](docs/APP_DESCRIPTION.md) — what the product is and how the system fits together

## Commands

Full stack (Postgres + MinIO + backend + frontend) from repo root:
```bash
cp .env.example .env
docker compose up --build       # API/Swagger :8000/docs · FE :5173 · MinIO console :9001
```
The backend container runs `alembic upgrade head` on startup (creates schema + seeds templates).

Frontend ([frontend/](frontend/)):
```bash
npm install
npm run dev        # :5173
npm run build      # tsc -b && vite build
npm run lint       # eslint
```

Backend ([backend/](backend/)), uses **uv**:
```bash
uv sync --extra dev
docker compose up -d postgres minio minio-setup   # deps for running locally
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
uv run ruff check .
uv run mypy app
```

Backend tests run against a **real** Postgres test DB (`projecthub_test`); each test runs in a transaction that rolls back. Create the DB once, then:
```bash
docker exec project-monitoring-postgres-1 psql -U projecthub -c "CREATE DATABASE projecthub_test"
uv run pytest -q
uv run pytest tests/test_phase_blocks.py::test_name   # single test
```
The MinIO attachment/avatar tests require `minio` + `minio-setup` to be running. Override the test DB with `TEST_DATABASE_URL`.

## Backend architecture (Clean Architecture)

Dependencies point **inward only**: `presentation → application → domain`. `infrastructure` implements ports the `application` layer defines. See [backend/README.md](backend/README.md).

- [app/domain/](backend/app/domain/) — pure-Python entities ([entities.py](backend/app/domain/entities.py)) and enums ([value_objects.py](backend/app/domain/value_objects.py)). **No** framework/DB/Pydantic imports. Enums (`DevPhase`, `UserRole`, `PhaseTag`, …) map 1-1 to `frontend/src/types.ts` and `docs/SCHEMA.md` — change all three together.
- [app/application/](backend/app/application/) — one use-case class per operation, receiving repository **ports** ([ports.py](backend/app/application/ports.py)) via constructor; never imports `infrastructure`. Authorization lives in pure functions in [authz.py](backend/app/application/authz.py).
- [app/infrastructure/](backend/app/infrastructure/) — SQLAlchemy async ORM ([db/models.py](backend/app/infrastructure/db/models.py)), repository implementations, and S3/MinIO storage. Swapping DB/storage should only touch this layer.
- [app/presentation/api/](backend/app/presentation/api/) — FastAPI routers + Pydantic DTOs. [deps.py](backend/app/presentation/api/deps.py) is the wiring hub: `session → repo → use case`, plus `get_current_user` (JWT) and workspace permission guards.

Key domain rules:
- **PIC-based permissions** ([authz.py](backend/app/application/authz.py), issue #11): two independent axes — `User.is_superuser` (global admin, created at first-run setup) and per-workspace `Membership.role` (`owner` | `member`). Every project/phase has a **PIC = its creator** (project PIC stored in `Project.pic_user_id`, changeable in detail via `PATCH /projects/{id}/pic`; phase PIC = `created_by`). **Only the PIC (or superuser) may edit/delete project & phase *metadata*.** Anyone can tick checklist/outcome items + comment (logged in activity). The old `change_requests` approval queue is **deprecated** (table/repos kept dormant; no longer created). Workspace management (rename/delete/members) is still owner-only.
- **Projects have no end date** (issue #20): `Project.target_date` is nullable. Project status is auto-derived from phases in `computeProjectStatus` — Delayed = a phase past its `endDate` not complete; At Risk = a phase due within 7 days; On Track = otherwise. Dashboard "deadline" is based on the nearest phase `endDate`, not a project target date.
- **Phase assignee is just a note** (issue #13): `PhaseBlock.assignee` is nullable/deprecated; the phase PIC is `created_by`.
- [phase_templates.py](backend/app/domain/phase_templates.py) holds the default checklist/outcome items per `(phase, role)`. It is the source of truth for seeding `phase_task_templates` and for auto-generating phase items — keep it in sync with the FE's `PHASE_ROLE_TASKS` / `PHASE_ROLE_OUTCOMES`.
- DB schema changes require an Alembic migration in [backend/migrations/versions/](backend/migrations/versions/) (the migration env reads the URL from `app.core.config`, not `alembic.ini`).

## Frontend architecture

React 19 + TypeScript + Vite + Tailwind, with Radix UI primitives under [src/components/ui/](frontend/src/components/ui/) (shadcn-style).

- **Global state is a single [AppContext](frontend/src/context/AppContext.tsx)** (`useApp()`), not Redux/Zustand. It holds the whole UI state machine — `currentView` cycles `landing → login → setup → workspace-selector → workspace` — plus all server data and the actions that mutate it. Most features are added by extending this context.
- **API layer**: [src/api/client.ts](frontend/src/api/client.ts) is a thin fetch wrapper that injects the JWT (stored in `localStorage` under `projecthub.token`) and throws `ApiError`. [src/api/index.ts](frontend/src/api/index.ts) groups endpoints by resource (`auth`, `orgsApi`, `projectsApi`, `phaseBlocksApi`, …). Base URL comes from `VITE_API_BASE` (default `http://localhost:8000/api/v1`).
- **The core feature is the Gantt timeline** in [src/components/Pipeline/](frontend/src/components/Pipeline/): Week/Month/Quarter zoom, a View (pan) mode and a Create-phase (drag-to-create) mode, with phase blocks that drag/resize and auto-flow to a new row on collision without shifting dates.
- `frontend/src/types.ts` mirrors the backend enums/entities — keep aligned with `app/domain/value_objects.py`.

Note: [frontend/src/config.ts](frontend/src/config.ts) and [frontend/src/components/AsciiCanvas.tsx](frontend/src/components/AsciiCanvas.tsx) belong to an unrelated landing-page scaffold and are not part of the ProjectHub app.
