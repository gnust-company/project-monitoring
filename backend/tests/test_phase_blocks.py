"""Slice 3 + 6 — phase blocks, items, comments, changelogs, templates."""
from httpx import AsyncClient

from tests.conftest import auth

API = "/api/v1"


async def _setup(client: AsyncClient, make_user):
    """1 owner + workspace + project. Trả (token, user, org, project)."""
    token, user = await make_user("pb-owner@hub.io")
    org = (await client.post(f"{API}/organizations", json={"name": "PB"}, headers=auth(token))).json()
    proj = (await client.post(f"{API}/organizations/{org['id']}/projects", json={
        "name": "App", "description": "", "startDate": "2026-04-01", "targetDate": "2026-08-01",
    }, headers=auth(token))).json()
    return token, user, org, proj


async def _make_block(client, token, project_id, **over):
    body = {
        "phaseType": "SD", "tag": "Todo", "title": "UI Components", "description": "",
        "startDate": "2026-06-10", "endDate": "2026-06-24",
    }
    body.update(over)
    resp = await client.post(f"{API}/projects/{project_id}/phase-blocks", json=body, headers=auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


# ─── Templates (Slice 6) ─────────────────────────────────────────────
async def test_templates_endpoint(client: AsyncClient, make_user):
    token, *_ = await _setup(client, make_user)
    resp = await client.get(f"{API}/templates/phase-tasks?phase=SD", headers=auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["phase"] == "SD"
    roles = {g["role"] for g in data["checklist"]}
    assert "UI_Designer" in roles and "SW_Architect" in roles
    assert any("SRS" in g["outcomes"] for g in data["outcomes"])


# ─── Create / seed ───────────────────────────────────────────────────
async def test_create_block_seeds_from_templates(client: AsyncClient, make_user):
    token, user, _, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"])
    # assignee mặc định = người tạo
    assert block["assignee"] == user["id"]
    assert block["createdBy"] == user["id"]
    # checklist + outcomes seed từ template SD
    checklist_texts = [c["text"] for c in block["checklist"]]
    assert "Design wireframes" in checklist_texts
    assert "Create HLD" in checklist_texts
    assert any(o["text"] == "SRS" for o in block["outcomes"])
    assert block["progressPct"] == 0


async def test_create_block_with_explicit_checklist(client: AsyncClient, make_user):
    token, *_, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"], checklist=[
        {"text": "Custom task", "role": "BA", "done": False},
    ], outcomes=[])
    assert [c["text"] for c in block["checklist"]] == ["Custom task"]
    assert block["outcomes"] == []


# ─── List + detail ───────────────────────────────────────────────────
async def test_list_blocks_by_org_and_project(client: AsyncClient, make_user):
    token, _, org, proj = await _setup(client, make_user)
    await _make_block(client, token, proj["id"])
    by_proj = await client.get(f"{API}/projects/{proj['id']}/phase-blocks", headers=auth(token))
    assert len(by_proj.json()) == 1
    by_org = await client.get(f"{API}/organizations/{org['id']}/phase-blocks", headers=auth(token))
    assert len(by_org.json()) == 1


# ─── Items toggle → progress ─────────────────────────────────────────
async def test_toggle_item_updates_progress(client: AsyncClient, make_user):
    token, *_, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"], checklist=[
        {"text": "A", "role": "BA", "done": False},
        {"text": "B", "role": "BA", "done": False},
    ], outcomes=[])
    item_id = block["checklist"][0]["id"]
    resp = await client.patch(f"{API}/phase-blocks/{block['id']}/items/{item_id}",
                              json={"done": True}, headers=auth(token))
    assert resp.status_code == 200
    detail = (await client.get(f"{API}/phase-blocks/{block['id']}", headers=auth(token))).json()
    assert detail["progressPct"] == 50


async def test_add_and_delete_item(client: AsyncClient, make_user):
    token, *_, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"], checklist=[], outcomes=[])
    add = await client.post(f"{API}/phase-blocks/{block['id']}/items",
                            json={"kind": "checklist", "text": "New", "role": "PM"}, headers=auth(token))
    assert add.status_code == 201
    item_id = add.json()["id"]
    dele = await client.delete(f"{API}/phase-blocks/{block['id']}/items/{item_id}", headers=auth(token))
    assert dele.status_code == 204


# ─── PATCH block → phase changelog ───────────────────────────────────
async def test_patch_block_writes_phase_activity(client: AsyncClient, make_user):
    token, *_, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"])
    resp = await client.patch(f"{API}/phase-blocks/{block['id']}", json={
        "endDate": "2026-07-01", "tag": "Inprogress",
    }, headers=auth(token))
    assert resp.status_code == 200
    acts = (await client.get(f"{API}/phase-blocks/{block['id']}/activity", headers=auth(token))).json()
    blob = " ".join(a["action"] + " " + a["target"] for a in acts)
    assert "2026-07-01" in blob or "end" in blob.lower()


# ─── Comments ────────────────────────────────────────────────────────
async def test_add_and_list_comments(client: AsyncClient, make_user):
    token, *_, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"])
    add = await client.post(f"{API}/phase-blocks/{block['id']}/comments",
                            json={"content": "Looks good"}, headers=auth(token))
    assert add.status_code == 201
    lst = await client.get(f"{API}/phase-blocks/{block['id']}/comments", headers=auth(token))
    assert lst.json()[0]["content"] == "Looks good"


# ─── Delete block → project changelog survives ───────────────────────
async def test_delete_block_keeps_project_changelog(client: AsyncClient, make_user):
    token, _, _, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"], title="Phase X")

    # project changelog có "created"
    log1 = (await client.get(f"{API}/projects/{proj['id']}/activity", headers=auth(token))).json()
    assert any("Phase X" in a["target"] or "Phase X" in a["action"] for a in log1)

    dele = await client.delete(f"{API}/phase-blocks/{block['id']}", headers=auth(token))
    assert dele.status_code == 204
    assert (await client.get(f"{API}/phase-blocks/{block['id']}", headers=auth(token))).status_code == 404

    # changelog dự án vẫn còn dòng nhắc tới phase đã xóa
    log2 = (await client.get(f"{API}/projects/{proj['id']}/activity", headers=auth(token))).json()
    assert any("Phase X" in a["target"] or "Phase X" in a["action"] for a in log2)


# ─── PIC phase (#11) ─────────────────────────────────────────────────
async def test_non_creator_cannot_edit_phase_but_can_tick_items(client: AsyncClient, make_user):
    """#11: chỉ PIC phase (= người tạo) sửa/xóa metadata; ai cũng tick checklist được."""
    o_token, _ = await make_user("pb-owner2@hub.io")
    m_token, _ = await make_user("pb-member2@hub.io", role="SW_Developer")
    org = (await client.post(f"{API}/organizations", json={"name": "PB2"}, headers=auth(o_token))).json()
    await client.post(f"{API}/organizations/{org['id']}/members",
                      json={"email": "pb-member2@hub.io"}, headers=auth(o_token))
    proj = (await client.post(f"{API}/organizations/{org['id']}/projects", json={
        "name": "App2", "description": "", "startDate": "2026-04-01",
    }, headers=auth(o_token))).json()
    block = await _make_block(client, o_token, proj["id"], checklist=[{"text": "Task"}])

    # member (không phải creator) sửa metadata → 403
    bad = await client.patch(f"{API}/phase-blocks/{block['id']}",
                             json={"title": "Hacked"}, headers=auth(m_token))
    assert bad.status_code == 403

    # member vẫn tick checklist được (không bị PIC khóa)
    item_id = block["checklist"][0]["id"]
    tick = await client.patch(f"{API}/phase-blocks/{block['id']}/items/{item_id}",
                              json={"done": True}, headers=auth(m_token))
    assert tick.status_code == 200
    assert tick.json()["done"] is True

    # member xóa phase → 403
    dele = await client.delete(f"{API}/phase-blocks/{block['id']}", headers=auth(m_token))
    assert dele.status_code == 403

    # owner (creator phase) sửa được
    ok = await client.patch(f"{API}/phase-blocks/{block['id']}",
                            json={"title": "Renamed"}, headers=auth(o_token))
    assert ok.status_code == 200
    assert ok.json()["title"] == "Renamed"
