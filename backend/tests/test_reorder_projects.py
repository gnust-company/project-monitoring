"""#31 — sắp lại thứ tự hiển thị dự án trong workspace (owner kéo-thả)."""
from httpx import AsyncClient

from tests.conftest import auth

API = "/api/v1"


async def _make_org(client: AsyncClient, token: str, name: str = "OrderCo") -> dict:
    resp = await client.post(f"{API}/organizations", json={"name": name}, headers=auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _make_project(client: AsyncClient, token: str, org_id: str, name: str) -> dict:
    resp = await client.post(f"{API}/organizations/{org_id}/projects", json={
        "name": name, "description": "", "startDate": "2026-04-01",
    }, headers=auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_new_projects_get_increasing_position(client: AsyncClient, make_user):
    o_token, _ = await make_user("ord-o1@hub.io")
    org = await _make_org(client, o_token)
    a = await _make_project(client, o_token, org["id"], "Alpha")
    b = await _make_project(client, o_token, org["id"], "Beta")
    c = await _make_project(client, o_token, org["id"], "Gamma")
    assert (a["position"], b["position"], c["position"]) == (0, 1, 2)

    listed = await client.get(f"{API}/organizations/{org['id']}/projects", headers=auth(o_token))
    assert [p["name"] for p in listed.json()] == ["Alpha", "Beta", "Gamma"]


async def test_owner_reorders_and_it_persists(client: AsyncClient, make_user):
    o_token, _ = await make_user("ord-o2@hub.io")
    org = await _make_org(client, o_token)
    a = await _make_project(client, o_token, org["id"], "Alpha")
    b = await _make_project(client, o_token, org["id"], "Beta")
    c = await _make_project(client, o_token, org["id"], "Gamma")

    # Kéo Gamma lên đầu: [Gamma, Alpha, Beta]
    resp = await client.post(
        f"{API}/organizations/{org['id']}/projects/reorder",
        json={"orderedIds": [c["id"], a["id"], b["id"]]},
        headers=auth(o_token),
    )
    assert resp.status_code == 200, resp.text
    assert [p["name"] for p in resp.json()] == ["Gamma", "Alpha", "Beta"]
    assert [p["position"] for p in resp.json()] == [0, 1, 2]

    # Thứ tự mới bền qua lần GET sau (đọc lại từ DB).
    after = await client.get(f"{API}/organizations/{org['id']}/projects", headers=auth(o_token))
    assert [p["name"] for p in after.json()] == ["Gamma", "Alpha", "Beta"]


async def test_member_cannot_reorder(client: AsyncClient, make_user):
    o_token, _ = await make_user("ord-o3@hub.io")
    m_token, _ = await make_user("ord-m3@hub.io")
    org = await _make_org(client, o_token)
    await client.post(f"{API}/organizations/{org['id']}/members",
                      json={"email": "ord-m3@hub.io"}, headers=auth(o_token))
    a = await _make_project(client, o_token, org["id"], "Alpha")
    b = await _make_project(client, o_token, org["id"], "Beta")

    resp = await client.post(
        f"{API}/organizations/{org['id']}/projects/reorder",
        json={"orderedIds": [b["id"], a["id"]]},
        headers=auth(m_token),
    )
    assert resp.status_code == 403, resp.text


async def test_reorder_ignores_ids_from_other_org(client: AsyncClient, make_user):
    o_token, _ = await make_user("ord-o4@hub.io")
    org1 = await _make_org(client, o_token, "Org1")
    org2 = await _make_org(client, o_token, "Org2")
    a = await _make_project(client, o_token, org1["id"], "A1")
    b = await _make_project(client, o_token, org1["id"], "B1")
    other = await _make_project(client, o_token, org2["id"], "X2")

    # id ngoài org bị bỏ qua; các dự án trong org vẫn được sắp theo phần còn lại.
    resp = await client.post(
        f"{API}/organizations/{org1['id']}/projects/reorder",
        json={"orderedIds": [other["id"], b["id"], a["id"]]},
        headers=auth(o_token),
    )
    assert resp.status_code == 200, resp.text
    assert [p["name"] for p in resp.json()] == ["B1", "A1"]
