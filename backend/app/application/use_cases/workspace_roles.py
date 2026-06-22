"""Use cases #26 (mảng B) — role công việc theo workspace + gán role cho member.

Authz CRUD role = owner (enforce ở router). Gán role member: owner cho bất kỳ ai,
HOẶC user tự đổi role của chính mình.
"""
import re
from typing import Any
from uuid import UUID, uuid4

from app.application.ports import OrganizationRepository, WorkspaceRoleRepository
from app.domain.entities import User, WorkspaceRoleDef
from app.domain.value_objects import WorkspaceRole


class RoleNotFoundError(Exception):
    pass


class RoleForbiddenError(Exception):
    """Không phải owner và không phải chính mình → không được gán role."""


def _slugify(name: str) -> str:
    base = re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_").upper()[:32]
    return base or "ROLE"


def _unique_code(existing: set[str], desired: str | None, name: str) -> str:
    code = (desired or "").strip().upper() or _slugify(name)
    if code not in existing:
        return code
    i = 2
    while f"{code}{i}" in existing:
        i += 1
    return f"{code}{i}"


class ListRoles:
    def __init__(self, roles: WorkspaceRoleRepository) -> None:
        self._roles = roles

    async def execute(self, org_id: UUID) -> list[WorkspaceRoleDef]:
        return await self._roles.list_by_org(org_id)


class CreateRole:
    def __init__(self, roles: WorkspaceRoleRepository) -> None:
        self._roles = roles

    async def execute(self, org_id: UUID, payload: dict[str, Any]) -> WorkspaceRoleDef:
        existing = await self._roles.list_by_org(org_id)
        code = _unique_code({r.code for r in existing}, payload.get("code"), payload["name"])
        position = payload.get("position")
        if position is None:
            position = max((r.position for r in existing), default=-1) + 1
        return await self._roles.create(WorkspaceRoleDef(
            id=uuid4(), org_id=org_id, code=code, name=payload["name"], position=position,
        ))


class UpdateRole:
    def __init__(self, roles: WorkspaceRoleRepository) -> None:
        self._roles = roles

    async def execute(self, org_id: UUID, role_id: UUID, payload: dict[str, Any]) -> WorkspaceRoleDef:
        role = await self._roles.get(role_id)
        if role is None or role.org_id != org_id:
            raise RoleNotFoundError(str(role_id))
        if "name" in payload:
            role.name = payload["name"]
        if "position" in payload and payload["position"] is not None:
            role.position = payload["position"]
        return await self._roles.update(role)


class DeleteRole:
    def __init__(self, roles: WorkspaceRoleRepository) -> None:
        self._roles = roles

    async def execute(self, org_id: UUID, role_id: UUID) -> None:
        role = await self._roles.get(role_id)
        if role is None or role.org_id != org_id:
            raise RoleNotFoundError(str(role_id))
        # Link Role↔Phase (#26): xóa role kéo theo checklist/outcome mặc định gắn role,
        # gỡ role khỏi item phase đang chạy + khỏi membership.
        await self._roles.cascade_remove_role(org_id, role.code)
        await self._roles.delete(role_id)


class ReorderRoles:
    def __init__(self, roles: WorkspaceRoleRepository) -> None:
        self._roles = roles

    async def execute(self, org_id: UUID, ordered_ids: list[UUID]) -> list[WorkspaceRoleDef]:
        roles = {r.id: r for r in await self._roles.list_by_org(org_id)}
        for pos, rid in enumerate(ordered_ids):
            role = roles.get(rid)
            if role is not None and role.position != pos:
                role.position = pos
                await self._roles.update(role)
        return await self._roles.list_by_org(org_id)


class AssignMemberRole:
    """Gán job role cho 1 member. Owner/superuser gán cho bất kỳ ai; user thường chỉ
    đổi role của chính mình."""

    def __init__(self, orgs: OrganizationRepository, roles: WorkspaceRoleRepository) -> None:
        self._orgs = orgs
        self._roles = roles

    async def execute(
        self, org_id: UUID, user_id: UUID, code: str | None, actor: User,
    ) -> None:
        membership = await self._orgs.get_membership(org_id, actor.id)
        is_owner = actor.is_superuser or (membership is not None and membership.role == WorkspaceRole.OWNER)
        if not (is_owner or actor.id == user_id):
            raise RoleForbiddenError("Chỉ owner hoặc chính bạn mới đổi được role này")
        if code is not None:
            valid = {r.code for r in await self._roles.list_by_org(org_id)}
            if code not in valid:
                raise RoleNotFoundError(code)
        await self._orgs.set_member_job_role(org_id, user_id, code)
