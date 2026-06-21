"""#26 (mảng A) — phase definitions động theo workspace."""
from httpx import AsyncClient

from tests.conftest import auth

API = "/api/v1"


async def _make_org(client: AsyncClient, token: str, name: str = "WS") -> dict:
    resp = await client.post(f"{API}/organizations", json={"name": name}, headers=auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_new_org_seeds_seven_default_phases(client: AsyncClient, make_user):
    token, _ = await make_user("pd-owner@hub.io")
    org = await _make_org(client, token)

    resp = await client.get(f"{API}/organizations/{org['id']}/phases", headers=auth(token))
    assert resp.status_code == 200, resp.text
    phases = resp.json()
    assert [p["code"] for p in phases] == ["PA", "SA", "SD", "SI", "ST", "DEP", "OM"]
    sd = next(p for p in phases if p["code"] == "SD")
    assert sd["color"] == "violet"
    assert any(c["text"] == "Create HLD" for c in sd["checklist"])
    assert any(o["text"] == "SRS" for o in sd["outcomes"])


async def test_owner_can_add_and_edit_phase(client: AsyncClient, make_user):
    token, _ = await make_user("pd-owner2@hub.io")
    org = await _make_org(client, token)

    # thêm phase mới
    created = await client.post(f"{API}/organizations/{org['id']}/phases", json={
        "name": "Khám phá", "fullName": "Discovery", "color": "rose",
        "checklist": [{"text": "Phỏng vấn người dùng", "role": "BA"}],
        "outcomes": [{"text": "Báo cáo nghiên cứu"}],
    }, headers=auth(token))
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["code"] and body["code"].isupper()  # code tự sinh (slug), duy nhất trong org
    assert body["color"] == "rose"
    assert body["checklist"][0]["text"] == "Phỏng vấn người dùng"

    # đổi tên + đổi màu
    patched = await client.patch(
        f"{API}/organizations/{org['id']}/phases/{body['id']}",
        json={"name": "Khám phá v2", "color": "teal"}, headers=auth(token),
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "Khám phá v2"
    assert patched.json()["color"] == "teal"


async def test_member_cannot_manage_phases(client: AsyncClient, make_user):
    o_token, _ = await make_user("pd-o@hub.io")
    m_token, _ = await make_user("pd-m@hub.io", role="BA")
    org = await _make_org(client, o_token)
    await client.post(f"{API}/organizations/{org['id']}/members",
                      json={"email": "pd-m@hub.io"}, headers=auth(o_token))

    # member đọc được
    assert (await client.get(f"{API}/organizations/{org['id']}/phases",
                             headers=auth(m_token))).status_code == 200
    # nhưng không tạo được
    denied = await client.post(f"{API}/organizations/{org['id']}/phases",
                               json={"name": "X"}, headers=auth(m_token))
    assert denied.status_code == 403


async def test_edit_default_checklist_reflected_in_new_block(client: AsyncClient, make_user):
    token, _ = await make_user("pd-chk@hub.io")
    org = await _make_org(client, token)
    proj = (await client.post(f"{API}/organizations/{org['id']}/projects", json={
        "name": "App", "description": "", "startDate": "2026-04-01",
    }, headers=auth(token))).json()

    phases = (await client.get(f"{API}/organizations/{org['id']}/phases", headers=auth(token))).json()
    pa = next(p for p in phases if p["code"] == "PA")

    # sửa checklist mặc định của PA (replace-all)
    await client.patch(f"{API}/organizations/{org['id']}/phases/{pa['id']}", json={
        "checklist": [{"text": "Đầu việc tùy biến", "role": "PM"}],
        "outcomes": [{"text": "Sản phẩm tùy biến"}],
    }, headers=auth(token))

    # tạo block PA không kèm checklist → seed từ definition đã sửa
    block = (await client.post(f"{API}/projects/{proj['id']}/phase-blocks", json={
        "phaseType": "PA", "tag": "Todo", "title": "B1",
        "startDate": "2026-06-10", "endDate": "2026-06-24",
    }, headers=auth(token))).json()
    assert [c["text"] for c in block["checklist"]] == ["Đầu việc tùy biến"]
    assert [o["text"] for o in block["outcomes"]] == ["Sản phẩm tùy biến"]


async def test_delete_phase_in_use_requires_force(client: AsyncClient, make_user):
    token, _ = await make_user("pd-del@hub.io")
    org = await _make_org(client, token)
    proj = (await client.post(f"{API}/organizations/{org['id']}/projects", json={
        "name": "App", "description": "", "startDate": "2026-04-01",
    }, headers=auth(token))).json()
    phases = (await client.get(f"{API}/organizations/{org['id']}/phases", headers=auth(token))).json()
    sd = next(p for p in phases if p["code"] == "SD")

    # tạo block dùng phase SD
    await client.post(f"{API}/projects/{proj['id']}/phase-blocks", json={
        "phaseType": "SD", "tag": "Todo", "title": "B", "checklist": [], "outcomes": [],
        "startDate": "2026-06-10", "endDate": "2026-06-24",
    }, headers=auth(token))

    # xóa không force → 409 kèm count
    denied = await client.delete(f"{API}/organizations/{org['id']}/phases/{sd['id']}", headers=auth(token))
    assert denied.status_code == 409
    assert denied.json()["detail"]["count"] == 1

    # force → 204
    forced = await client.delete(
        f"{API}/organizations/{org['id']}/phases/{sd['id']}?force=true", headers=auth(token)
    )
    assert forced.status_code == 204
    remaining = (await client.get(f"{API}/organizations/{org['id']}/phases", headers=auth(token))).json()
    assert "SD" not in [p["code"] for p in remaining]
