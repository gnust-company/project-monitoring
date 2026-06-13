"""Slice 2 — organizations, membership roles, projects, approval queue, notifications."""
from httpx import AsyncClient

from tests.conftest import auth

API = "/api/v1"


async def _make_org(client: AsyncClient, token: str, name: str = "TechNova") -> dict:
    resp = await client.post(f"{API}/organizations", json={"name": name}, headers=auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


# ─── Workspace CRUD + permissions ────────────────────────────────────
async def test_create_org_makes_creator_owner(client: AsyncClient, make_user):
    token, user = await make_user("owner@hub.io")
    org = await _make_org(client, token)
    assert org["name"] == "TechNova"

    # creator thấy org trong danh sách của mình
    mine = await client.get(f"{API}/organizations", headers=auth(token))
    assert any(o["id"] == org["id"] for o in mine.json())

    # detail có creator là member
    detail = await client.get(f"{API}/organizations/{org['id']}", headers=auth(token))
    assert detail.status_code == 200
    member_ids = [m["id"] for m in detail.json()["members"]]
    assert user["id"] in member_ids


async def test_owner_can_rename_member_cannot(client: AsyncClient, make_user):
    o_token, _ = await make_user("o1@hub.io")
    m_token, m_user = await make_user("m1@hub.io", role="BA")
    org = await _make_org(client, o_token)
    await client.post(f"{API}/organizations/{org['id']}/members",
                      json={"email": "m1@hub.io"}, headers=auth(o_token))

    ok = await client.patch(f"{API}/organizations/{org['id']}",
                            json={"name": "Renamed"}, headers=auth(o_token))
    assert ok.status_code == 200
    assert ok.json()["name"] == "Renamed"

    denied = await client.patch(f"{API}/organizations/{org['id']}",
                                json={"name": "Hacked"}, headers=auth(m_token))
    assert denied.status_code == 403


async def test_add_member_notifies_and_grants_access(client: AsyncClient, make_user):
    o_token, _ = await make_user("o2@hub.io")
    m_token, m_user = await make_user("m2@hub.io", role="GUI")
    org = await _make_org(client, o_token)

    add = await client.post(f"{API}/organizations/{org['id']}/members",
                            json={"email": "m2@hub.io"}, headers=auth(o_token))
    assert add.status_code == 201, add.text

    # member giờ thấy org
    mine = await client.get(f"{API}/organizations", headers=auth(m_token))
    assert any(o["id"] == org["id"] for o in mine.json())

    # member nhận được thông báo member_added
    notifs = await client.get(f"{API}/notifications", headers=auth(m_token))
    assert any(n["type"] == "member_added" for n in notifs.json())


async def test_non_member_forbidden(client: AsyncClient, make_user):
    o_token, _ = await make_user("o3@hub.io")
    x_token, _ = await make_user("stranger@hub.io")
    org = await _make_org(client, o_token)

    resp = await client.get(f"{API}/organizations/{org['id']}", headers=auth(x_token))
    assert resp.status_code == 403


# ─── Projects + approval queue ───────────────────────────────────────
async def _make_project(client: AsyncClient, token: str, org_id: str) -> dict:
    resp = await client.post(f"{API}/organizations/{org_id}/projects", json={
        "name": "Cloud Migration", "description": "", "startDate": "2026-04-01",
        "targetDate": "2026-07-01",
    }, headers=auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_member_can_create_project(client: AsyncClient, make_user):
    o_token, _ = await make_user("o4@hub.io")
    m_token, _ = await make_user("m4@hub.io", role="SW_Developer")
    org = await _make_org(client, o_token)
    await client.post(f"{API}/organizations/{org['id']}/members",
                      json={"email": "m4@hub.io"}, headers=auth(o_token))

    proj = await _make_project(client, m_token, org["id"])
    assert proj["name"] == "Cloud Migration"


async def test_owner_edits_project_directly(client: AsyncClient, make_user):
    o_token, _ = await make_user("o5@hub.io")
    org = await _make_org(client, o_token)
    proj = await _make_project(client, o_token, org["id"])

    resp = await client.patch(f"{API}/projects/{proj['id']}",
                              json={"name": "Renamed", "progress": 40}, headers=auth(o_token))
    assert resp.status_code == 200
    assert resp.json()["name"] == "Renamed"
    assert resp.json()["progress"] == 40


async def test_member_edit_creates_pending_change_request(client: AsyncClient, make_user):
    o_token, o_user = await make_user("o6@hub.io")
    m_token, m_user = await make_user("m6@hub.io", role="BA")
    org = await _make_org(client, o_token)
    await client.post(f"{API}/organizations/{org['id']}/members",
                      json={"email": "m6@hub.io"}, headers=auth(o_token))
    proj = await _make_project(client, o_token, org["id"])

    # member PATCH → 202, KHÔNG áp dụng ngay
    resp = await client.patch(f"{API}/projects/{proj['id']}",
                              json={"name": "Proposed"}, headers=auth(m_token))
    assert resp.status_code == 202, resp.text
    cr = resp.json()
    assert cr["status"] == "pending"
    assert cr["action"] == "update_project"

    unchanged = await client.get(f"{API}/projects/{proj['id']}", headers=auth(o_token))
    assert unchanged.json()["name"] == "Cloud Migration"

    # owner thấy change request đang chờ + nhận notification
    pending = await client.get(f"{API}/organizations/{org['id']}/change-requests",
                               headers=auth(o_token))
    assert len(pending.json()) == 1
    owner_notifs = await client.get(f"{API}/notifications", headers=auth(o_token))
    assert any(n["type"] == "change_request_created" for n in owner_notifs.json())

    # owner duyệt → áp dụng + requester được báo
    approve = await client.post(f"{API}/change-requests/{cr['id']}/approve", headers=auth(o_token))
    assert approve.status_code == 200
    applied = await client.get(f"{API}/projects/{proj['id']}", headers=auth(o_token))
    assert applied.json()["name"] == "Proposed"
    m_notifs = await client.get(f"{API}/notifications", headers=auth(m_token))
    assert any(n["type"] == "change_request_approved" for n in m_notifs.json())


async def test_member_delete_request_then_reject(client: AsyncClient, make_user):
    o_token, _ = await make_user("o7@hub.io")
    m_token, _ = await make_user("m7@hub.io", role="BA")
    org = await _make_org(client, o_token)
    await client.post(f"{API}/organizations/{org['id']}/members",
                      json={"email": "m7@hub.io"}, headers=auth(o_token))
    proj = await _make_project(client, o_token, org["id"])

    resp = await client.delete(f"{API}/projects/{proj['id']}", headers=auth(m_token))
    assert resp.status_code == 202
    cr = resp.json()
    assert cr["action"] == "delete_project"

    # project vẫn còn
    assert (await client.get(f"{API}/projects/{proj['id']}", headers=auth(o_token))).status_code == 200

    reject = await client.post(f"{API}/change-requests/{cr['id']}/reject", headers=auth(o_token))
    assert reject.status_code == 200
    # vẫn còn sau khi từ chối
    assert (await client.get(f"{API}/projects/{proj['id']}", headers=auth(o_token))).status_code == 200


async def test_owner_deletes_project_directly(client: AsyncClient, make_user):
    o_token, _ = await make_user("o8@hub.io")
    org = await _make_org(client, o_token)
    proj = await _make_project(client, o_token, org["id"])

    resp = await client.delete(f"{API}/projects/{proj['id']}", headers=auth(o_token))
    assert resp.status_code == 204
    assert (await client.get(f"{API}/projects/{proj['id']}", headers=auth(o_token))).status_code == 404
