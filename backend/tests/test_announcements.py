"""Slice #27 — kênh thông báo từ admin (announcements).

CRUD chỉ superuser; /active + /dismiss cho mọi user; time-range lọc + dismiss
hôm nay/tuần này.
"""
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient

from tests.conftest import auth

API = "/api/v1"


async def _make_superuser(client: AsyncClient, email: str = "root@hub.io") -> tuple[str, dict]:
    resp = await client.post(f"{API}/auth/setup", json={
        "email": email, "password": "rootpw123", "name": "Root",
    })
    assert resp.status_code == 201, resp.text
    data = resp.json()
    return data["accessToken"], data["user"]


def _window(start_offset_h: int, end_offset_h: int) -> dict[str, str]:
    now = datetime.now(timezone.utc)
    return {
        "startsAt": (now + timedelta(hours=start_offset_h)).isoformat(),
        "endsAt": (now + timedelta(hours=end_offset_h)).isoformat(),
    }


# ─── Guard ───────────────────────────────────────────────────────────
async def test_create_requires_superuser(client: AsyncClient, make_user):
    await _make_superuser(client)
    token, _ = await make_user("regular@hub.io")
    resp = await client.post(f"{API}/announcements", headers=auth(token), json={
        "title": "Hi", "body": "x", **_window(-1, 1),
    })
    assert resp.status_code == 403


async def test_active_requires_auth(client: AsyncClient):
    resp = await client.get(f"{API}/announcements/active")
    assert resp.status_code == 401


# ─── CRUD ────────────────────────────────────────────────────────────
async def test_admin_crud_announcement(client: AsyncClient):
    su, su_user = await _make_superuser(client)
    create = await client.post(f"{API}/announcements", headers=auth(su), json={
        "title": "Bảo trì", "body": "# Hệ thống\nbảo trì", **_window(-1, 24),
    })
    assert create.status_code == 201, create.text
    a = create.json()
    assert a["title"] == "Bảo trì"
    assert a["createdBy"] == su_user["id"]

    # list-all (admin)
    listed = await client.get(f"{API}/announcements", headers=auth(su))
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    # update
    patch = await client.patch(f"{API}/announcements/{a['id']}", headers=auth(su),
                               json={"title": "Bảo trì (đã dời)"})
    assert patch.status_code == 200
    assert patch.json()["title"] == "Bảo trì (đã dời)"

    # delete
    dele = await client.delete(f"{API}/announcements/{a['id']}", headers=auth(su))
    assert dele.status_code == 204
    after = await client.get(f"{API}/announcements", headers=auth(su))
    assert after.json() == []


async def test_create_invalid_window_422(client: AsyncClient):
    su, _ = await _make_superuser(client)
    resp = await client.post(f"{API}/announcements", headers=auth(su), json={
        "title": "Sai", "body": "", **_window(5, 1),  # start sau end
    })
    assert resp.status_code == 422


# ─── /active lọc theo time-range ─────────────────────────────────────
async def test_active_filters_by_window(client: AsyncClient, make_user):
    su, _ = await _make_superuser(client)
    # đang chạy
    await client.post(f"{API}/announcements", headers=auth(su), json={
        "title": "Đang chạy", "body": "", **_window(-1, 1)})
    # tương lai
    await client.post(f"{API}/announcements", headers=auth(su), json={
        "title": "Tương lai", "body": "", **_window(10, 20)})
    # đã hết hạn
    await client.post(f"{API}/announcements", headers=auth(su), json={
        "title": "Hết hạn", "body": "", **_window(-20, -10)})

    token, _ = await make_user("u@hub.io")
    active = await client.get(f"{API}/announcements/active", headers=auth(token))
    assert active.status_code == 200
    titles = [x["title"] for x in active.json()]
    assert titles == ["Đang chạy"]


# ─── Dismiss ─────────────────────────────────────────────────────────
async def test_dismiss_day_hides_for_user(client: AsyncClient, make_user):
    su, _ = await _make_superuser(client)
    created = await client.post(f"{API}/announcements", headers=auth(su), json={
        "title": "Thông báo", "body": "", **_window(-1, 24)})
    aid = created.json()["id"]

    token, _ = await make_user("viewer@hub.io")
    assert len((await client.get(f"{API}/announcements/active", headers=auth(token))).json()) == 1

    dismiss = await client.post(f"{API}/announcements/{aid}/dismiss", headers=auth(token),
                                json={"scope": "day"})
    assert dismiss.status_code == 204
    # ẩn với người đã dismiss
    assert (await client.get(f"{API}/announcements/active", headers=auth(token))).json() == []

    # nhưng user khác vẫn thấy
    other, _ = await make_user("other@hub.io")
    assert len((await client.get(f"{API}/announcements/active", headers=auth(other))).json()) == 1


async def test_dismiss_invalid_scope_422(client: AsyncClient, make_user):
    su, _ = await _make_superuser(client)
    created = await client.post(f"{API}/announcements", headers=auth(su), json={
        "title": "X", "body": "", **_window(-1, 1)})
    aid = created.json()["id"]
    token, _ = await make_user("v@hub.io")
    resp = await client.post(f"{API}/announcements/{aid}/dismiss", headers=auth(token),
                             json={"scope": "month"})
    assert resp.status_code == 422


async def test_dismiss_missing_announcement_404(client: AsyncClient, make_user):
    await _make_superuser(client)
    token, _ = await make_user("v@hub.io")
    resp = await client.post(
        f"{API}/announcements/00000000-0000-0000-0000-000000000000/dismiss",
        headers=auth(token), json={"scope": "day"})
    assert resp.status_code == 404
