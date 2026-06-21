"""FastAPI entrypoint — mount routers, CORS cho frontend dev server."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.presentation.api.routers import (
    admin,
    auth,
    change_requests,
    health,
    notifications,
    organizations,
    phase_blocks,
    projects,
    users,
)

settings = get_settings()

app = FastAPI(
    title="ProjectHub API",
    version="0.1.0",
    description="Development Process Pipeline API — hợp đồng chi tiết: docs/API_CONTRACT.md",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(organizations.router)
app.include_router(projects.router)
app.include_router(change_requests.router)
app.include_router(notifications.router)
app.include_router(phase_blocks.router)
app.include_router(users.router)
app.include_router(admin.router)
