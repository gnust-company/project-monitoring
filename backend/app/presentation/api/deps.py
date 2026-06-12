"""Dependency injection cho FastAPI — lắp ráp session → repository → use case."""
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.projects import CreateProject, GetProject, ListProjectsByOrg
from app.infrastructure.db.session import get_session
from app.infrastructure.repositories.projects import SqlAlchemyProjectRepository

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_project_repo(session: SessionDep) -> SqlAlchemyProjectRepository:
    return SqlAlchemyProjectRepository(session)


ProjectRepoDep = Annotated[SqlAlchemyProjectRepository, Depends(get_project_repo)]


def list_projects_uc(repo: ProjectRepoDep) -> ListProjectsByOrg:
    return ListProjectsByOrg(repo)


def get_project_uc(repo: ProjectRepoDep) -> GetProject:
    return GetProject(repo)


def create_project_uc(repo: ProjectRepoDep) -> CreateProject:
    return CreateProject(repo)
