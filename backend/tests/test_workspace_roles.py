"""#26 (mảng B) — role công việc động theo workspace."""
from httpx import AsyncClient

from tests.conftest import auth

API = "/api/v1"


async def _make_org(client: AsyncClient, token: str, name: str = "WS") -> dict:
    resp = await client.post(f"{API}/organizations", json={"name": name}, headers=auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_new_org_seeds_eight_default_roles(client: AsyncClient, make_user):
    token, _ = await make_user("r-owner@hub.io")
    org = await _make_org(client, token)
    resp = await client.get(f"{API}/organizations/{org['id']}/roles", headers=auth(token))
    assert resp.status_code == 200, resp.text
    roles = resp.json()
    assert [r["code"] for r in roles] == [
        "PM", "BA", "SW_Architect", "SysOps", "UI_Designer", "GUI", "SW_Developer", "SW_Tester",
    ]
    # người tạo được gán job role mặc định (PM)
    detail = await client.get(f"{API}/organizations/{org['id']}", headers=auth(token))
    me = detail.json()["members"][0]
    assert me["jobRole"] == "PM"


async def test_owner_crud_role_member_cannot(client: AsyncClient, make_user):
    o_token, _ = await make_user("r-o@hub.io")
    m_token, m_user = await make_user("r-m@hub.io")
    org = await _make_org(client, o_token)
    await client.post(f"{API}/organizations/{org['id']}/members",
                      json={"email": "r-m@hub.io"}, headers=auth(o_token))

    # member đọc được role
    assert (await client.get(f"{API}/organizations/{org['id']}/roles", headers=auth(m_token))).status_code == 200
    # member KHÔNG tạo được role
    denied = await client.post(f"{API}/organizations/{org['id']}/roles",
                               json={"name": "Tester Lead"}, headers=auth(m_token))
    assert denied.status_code == 403

    # owner tạo + đổi tên role
    created = await client.post(f"{API}/organizations/{org['id']}/roles",
                                json={"name": "Tester Lead"}, headers=auth(o_token))
    assert created.status_code == 201, created.text
    rid = created.json()["id"]
    assert created.json()["code"] and created.json()["code"].isupper()
    renamed = await client.patch(f"{API}/organizations/{org['id']}/roles/{rid}",
                                 json={"name": "QA Lead"}, headers=auth(o_token))
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "QA Lead"


async def test_delete_role_cascades_to_phase_checklist_and_members(client: AsyncClient, make_user):
    token, _ = await make_user("r-del@hub.io")
    org = await _make_org(client, token)
    roles = (await client.get(f"{API}/organizations/{org['id']}/roles", headers=auth(token))).json()
    pm = next(r for r in roles if r["code"] == "PM")

    # phase PA mặc định có checklist gắn role PM
    phases = (await client.get(f"{API}/organizations/{org['id']}/phases", headers=auth(token))).json()
    pa = next(p for p in phases if p["code"] == "PA")
    assert any(c["role"] == "PM" for c in pa["checklist"])

    # xóa role PM → cascade
    resp = await client.delete(f"{API}/organizations/{org['id']}/roles/{pm['id']}", headers=auth(token))
    assert resp.status_code == 204

    # checklist mặc định gắn PM biến mất
    phases2 = (await client.get(f"{API}/organizations/{org['id']}/phases", headers=auth(token))).json()
    pa2 = next(p for p in phases2 if p["code"] == "PA")
    assert not any(c["role"] == "PM" for c in pa2["checklist"])

    # job role của người tạo (PM) bị gỡ về null
    detail = await client.get(f"{API}/organizations/{org['id']}", headers=auth(token))
    assert detail.json()["members"][0]["jobRole"] is None


async def test_assign_member_role_owner_and_self(client: AsyncClient, make_user):
    o_token, _ = await make_user("r-o2@hub.io")
    m_token, m_user = await make_user("r-m2@hub.io")
    x_token, x_user = await make_user("r-x2@hub.io")
    org = await _make_org(client, o_token)
    await client.post(f"{API}/organizations/{org['id']}/members", json={"email": "r-m2@hub.io"}, headers=auth(o_token))
    await client.post(f"{API}/organizations/{org['id']}/members", json={"email": "r-x2@hub.io"}, headers=auth(o_token))

    # owner gán role cho member
    r1 = await client.patch(f"{API}/organizations/{org['id']}/members/{m_user['id']}/role",
                            json={"role": "BA"}, headers=auth(o_token))
    assert r1.status_code == 204

    # member tự đổi role của chính mình
    r2 = await client.patch(f"{API}/organizations/{org['id']}/members/{m_user['id']}/role",
                            json={"role": "SW_Developer"}, headers=auth(m_token))
    assert r2.status_code == 204

    # member KHÔNG đổi được role của người khác
    r3 = await client.patch(f"{API}/organizations/{org['id']}/members/{x_user['id']}/role",
                            json={"role": "BA"}, headers=auth(m_token))
    assert r3.status_code == 403

    # gán code không tồn tại → 404
    r4 = await client.patch(f"{API}/organizations/{org['id']}/members/{m_user['id']}/role",
                            json={"role": "NOPE"}, headers=auth(o_token))
    assert r4.status_code == 404

    # xác nhận role member đã đổi
    detail = await client.get(f"{API}/organizations/{org['id']}", headers=auth(o_token))
    m = next(u for u in detail.json()["members"] if u["id"] == m_user["id"])
    assert m["jobRole"] == "SW_Developer"
