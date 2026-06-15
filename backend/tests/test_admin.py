"""Slice admin — khu vực quản trị (superuser): thống kê, danh sách user/workspace, reset password."""
from httpx import AsyncClient

from tests.conftest import auth

API = "/api/v1"


async def _make_superuser(client: AsyncClient, email: str = "root@hub.io") -> tuple[str, dict]:
    """First-run setup → user đầu tiên là superuser. Chỉ gọi 1 lần / test."""
    resp = await client.post(f"{API}/auth/setup", json={
        "email": email, "password": "rootpw123", "name": "Root", "role": "PM",
    })
    assert resp.status_code == 201, resp.text
    data = resp.json()
    return data["accessToken"], data["user"]


# ─── Guard: chỉ superuser ────────────────────────────────────────────
async def test_non_superuser_forbidden(client: AsyncClient, make_user):
    await _make_superuser(client)  # khóa first-run
    token, _ = await make_user("regular@hub.io")
    for path in ("/admin/stats", "/admin/users", "/admin/workspaces"):
        resp = await client.get(f"{API}{path}", headers=auth(token))
        assert resp.status_code == 403, f"{path} → {resp.status_code}"


async def test_admin_endpoints_require_auth(client: AsyncClient):
    resp = await client.get(f"{API}/admin/stats")
    assert resp.status_code == 401


# ─── Stats ───────────────────────────────────────────────────────────
async def test_stats_counts(client: AsyncClient, make_user):
    su_token, _ = await _make_superuser(client)
    await make_user("u1@hub.io")
    m_token, _ = await make_user("u2@hub.io")
    # tạo 1 workspace + 1 project
    org = (await client.post(f"{API}/organizations", json={"name": "Acme"},
                             headers=auth(m_token))).json()
    await client.post(f"{API}/organizations/{org['id']}/projects", json={
        "name": "P1", "startDate": "2026-01-01", "targetDate": "2026-02-01",
    }, headers=auth(m_token))

    resp = await client.get(f"{API}/admin/stats", headers=auth(su_token))
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["userCount"] == 3           # root + u1 + u2
    assert data["superuserCount"] == 1
    assert data["workspaceCount"] == 1
    assert data["projectCount"] == 1
    assert data["phaseBlockCount"] == 0


# ─── List users ──────────────────────────────────────────────────────
async def test_list_users_includes_workspace_count(client: AsyncClient, make_user):
    su_token, _ = await _make_superuser(client)
    owner_token, owner = await make_user("owner@hub.io")
    await client.post(f"{API}/organizations", json={"name": "W1"}, headers=auth(owner_token))
    await client.post(f"{API}/organizations", json={"name": "W2"}, headers=auth(owner_token))

    resp = await client.get(f"{API}/admin/users", headers=auth(su_token))
    assert resp.status_code == 200, resp.text
    users = {u["email"]: u for u in resp.json()}
    assert users["owner@hub.io"]["workspaceCount"] == 2
    assert users["root@hub.io"]["isSuperuser"] is True
    assert "createdAt" in users["owner@hub.io"]


# ─── List workspaces ─────────────────────────────────────────────────
async def test_list_workspaces_detail(client: AsyncClient, make_user):
    su_token, _ = await _make_superuser(client)
    owner_token, owner = await make_user("o@hub.io")
    org = (await client.post(f"{API}/organizations", json={"name": "Globex"},
                             headers=auth(owner_token))).json()
    await client.post(f"{API}/organizations/{org['id']}/projects", json={
        "name": "P", "startDate": "2026-01-01", "targetDate": "2026-02-01",
    }, headers=auth(owner_token))

    resp = await client.get(f"{API}/admin/workspaces", headers=auth(su_token))
    assert resp.status_code == 200, resp.text
    ws = next(w for w in resp.json() if w["name"] == "Globex")
    assert ws["memberCount"] == 1
    assert ws["projectCount"] == 1
    assert [o["id"] for o in ws["owners"]] == [owner["id"]]


# ─── Reset password ──────────────────────────────────────────────────
async def test_reset_password_then_login(client: AsyncClient, make_user):
    su_token, _ = await _make_superuser(client)
    _, user = await make_user("forgot@hub.io", password="oldpw123")

    resp = await client.post(f"{API}/admin/users/{user['id']}/reset-password",
                             json={"newPassword": "brandnew1"}, headers=auth(su_token))
    assert resp.status_code == 204, resp.text

    # mật khẩu cũ không còn dùng được, mật khẩu mới đăng nhập được
    old = await client.post(f"{API}/auth/login", json={"email": "forgot@hub.io", "password": "oldpw123"})
    assert old.status_code == 401
    new = await client.post(f"{API}/auth/login", json={"email": "forgot@hub.io", "password": "brandnew1"})
    assert new.status_code == 200


async def test_reset_password_unknown_user_404(client: AsyncClient):
    su_token, _ = await _make_superuser(client)
    resp = await client.post(
        f"{API}/admin/users/00000000-0000-0000-0000-000000000000/reset-password",
        json={"newPassword": "whatever1"}, headers=auth(su_token),
    )
    assert resp.status_code == 404


async def test_reset_password_too_short_422(client: AsyncClient, make_user):
    su_token, _ = await _make_superuser(client)
    _, user = await make_user("x@hub.io")
    resp = await client.post(f"{API}/admin/users/{user['id']}/reset-password",
                             json={"newPassword": "123"}, headers=auth(su_token))
    assert resp.status_code == 422


# ─── Grant / revoke admin ────────────────────────────────────────────
async def test_grant_admin_unlocks_admin_area(client: AsyncClient, make_user):
    su_token, _ = await _make_superuser(client)
    norm_token, norm = await make_user("normal@hub.io")

    # ban đầu user thường bị chặn
    assert (await client.get(f"{API}/admin/stats", headers=auth(norm_token))).status_code == 403

    # superuser cấp quyền admin
    grant = await client.post(f"{API}/admin/users/{norm['id']}/superuser",
                              json={"isSuperuser": True}, headers=auth(su_token))
    assert grant.status_code == 204, grant.text

    # giờ user đó truy cập được admin + me phản ánh isSuperuser
    assert (await client.get(f"{API}/admin/stats", headers=auth(norm_token))).status_code == 200
    me = await client.get(f"{API}/auth/me", headers=auth(norm_token))
    assert me.json()["isSuperuser"] is True


async def test_revoke_admin(client: AsyncClient, make_user):
    su_token, _ = await _make_superuser(client)
    _, target = await make_user("temp-admin@hub.io")
    await client.post(f"{API}/admin/users/{target['id']}/superuser",
                      json={"isSuperuser": True}, headers=auth(su_token))

    revoke = await client.post(f"{API}/admin/users/{target['id']}/superuser",
                               json={"isSuperuser": False}, headers=auth(su_token))
    assert revoke.status_code == 204, revoke.text

    users = {u["email"]: u for u in (await client.get(f"{API}/admin/users", headers=auth(su_token))).json()}
    assert users["temp-admin@hub.io"]["isSuperuser"] is False


async def test_cannot_change_own_admin_status(client: AsyncClient):
    su_token, su = await _make_superuser(client)
    resp = await client.post(f"{API}/admin/users/{su['id']}/superuser",
                             json={"isSuperuser": False}, headers=auth(su_token))
    assert resp.status_code == 400


async def test_grant_admin_requires_superuser(client: AsyncClient, make_user):
    await _make_superuser(client)
    a_token, _ = await make_user("a@hub.io")
    _, b = await make_user("b@hub.io")
    resp = await client.post(f"{API}/admin/users/{b['id']}/superuser",
                             json={"isSuperuser": True}, headers=auth(a_token))
    assert resp.status_code == 403
