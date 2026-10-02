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


# ─── Create / seed (#26 mảng A: seed từ phase definition mặc định của workspace) ─
async def test_create_block_seeds_from_phase_definition(client: AsyncClient, make_user):
    token, user, _, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"])
    # assignee mặc định = người tạo
    assert block["assignee"] == user["id"]
    assert block["createdBy"] == user["id"]
    # checklist + outcomes seed từ phase definition SD (7 phase mặc định seed khi tạo org)
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


# ─── #9 Outcome bắt buộc có tài liệu mới được mark done ───────────────
async def test_outcome_requires_attachment_to_complete(client: AsyncClient, make_user):
    token, *_, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"], checklist=[],
                              outcomes=[{"text": "SRS", "role": "BA"}])
    oid = block["outcomes"][0]["id"]

    # chưa có tài liệu → tick done bị từ chối (422)
    bad = await client.patch(f"{API}/phase-blocks/{block['id']}/items/{oid}",
                             json={"done": True}, headers=auth(token))
    assert bad.status_code == 422

    # đính kèm link cho outcome
    att = await client.post(f"{API}/phase-blocks/{block['id']}/attachments/link",
                            json={"fileName": "SRS doc", "url": "https://x.com/srs",
                                  "outcomeItemId": oid}, headers=auth(token))
    assert att.status_code == 201
    assert att.json()["outcomeItemId"] == oid

    # giờ tick được
    ok = await client.patch(f"{API}/phase-blocks/{block['id']}/items/{oid}",
                            json={"done": True}, headers=auth(token))
    assert ok.status_code == 200
    assert ok.json()["done"] is True


# ─── #8 progressPct gộp checklist + outcomes ─────────────────────────
async def test_progress_includes_outcomes(client: AsyncClient, make_user):
    token, *_, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"],
                              checklist=[{"text": "A", "role": "BA"}],
                              outcomes=[{"text": "O", "role": "BA"}])
    cid = block["checklist"][0]["id"]
    oid = block["outcomes"][0]["id"]

    # tick checklist → 1/2 = 50% (outcome chưa xong)
    await client.patch(f"{API}/phase-blocks/{block['id']}/items/{cid}",
                       json={"done": True}, headers=auth(token))
    detail = (await client.get(f"{API}/phase-blocks/{block['id']}", headers=auth(token))).json()
    assert detail["progressPct"] == 50

    # đính kèm + tick outcome → 2/2 = 100%
    await client.post(f"{API}/phase-blocks/{block['id']}/attachments/link",
                      json={"fileName": "d", "url": "https://x.com/d", "outcomeItemId": oid},
                      headers=auth(token))
    await client.patch(f"{API}/phase-blocks/{block['id']}/items/{oid}",
                       json={"done": True}, headers=auth(token))
    detail2 = (await client.get(f"{API}/phase-blocks/{block['id']}", headers=auth(token))).json()
    assert detail2["progressPct"] == 100


# ─── #17 đổi phase type ──────────────────────────────────────────────
async def test_change_phase_type(client: AsyncClient, make_user):
    token, *_, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"])  # SD
    resp = await client.patch(f"{API}/phase-blocks/{block['id']}",
                              json={"phaseType": "ST"}, headers=auth(token))
    assert resp.status_code == 200
    assert resp.json()["phaseType"] == "ST"


# ─── #26 feed Dashboard gộp: vận hành (phase) + vòng đời dự án ────────
async def test_dashboard_feed_merges_phase_and_project_events(client: AsyncClient, make_user):
    token, _, org, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"])
    await client.post(f"{API}/phase-blocks/{block['id']}/comments",
                      json={"content": "Nhìn ổn"}, headers=auth(token))

    # feed Dashboard gộp cả sự kiện cấp phase ("commented") lẫn vòng đời dự án ("created project")
    feed = await client.get(f"{API}/organizations/{org['id']}/recent-activity", headers=auth(token))
    assert feed.status_code == 200
    actions = [a["action"] for a in feed.json()]
    assert "commented" in actions
    assert "created project" in actions


# ─── #34: người tham gia theo RACI (user hệ thống + tên tự do) ───────
async def test_create_block_with_raci_participants(client: AsyncClient, make_user):
    token, user, _, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"], participants=[
        {"userId": user["id"], "raci": "A"},
        {"name": "  Nguyễn Văn Khách  ", "raci": "C"},
        {"userId": user["id"], "raci": "R"},          # trùng user → giữ bản đầu
        {"name": "nguyễn văn khách", "raci": "I"},    # trùng tên (không phân biệt hoa thường)
    ])
    assert block["participants"] == [
        {"userId": user["id"], "name": None, "raci": "A"},
        {"userId": None, "name": "Nguyễn Văn Khách", "raci": "C"},
    ]
    # round-trip qua GET list
    listed = (await client.get(f"{API}/projects/{proj['id']}/phase-blocks", headers=auth(token))).json()
    assert listed[0]["participants"] == block["participants"]


async def test_participant_requires_exactly_one_identity(client: AsyncClient, make_user):
    token, user, _, proj = await _setup(client, make_user)
    for bad in ({"raci": "R"}, {"userId": user["id"], "name": "Ai đó", "raci": "R"},
                {"name": "   ", "raci": "R"}, {"name": "X", "raci": "Z"}):
        resp = await client.post(f"{API}/projects/{proj['id']}/phase-blocks", json={
            "phaseType": "SD", "title": "T", "startDate": "2026-06-10", "endDate": "2026-06-24",
            "participants": [bad],
        }, headers=auth(token))
        assert resp.status_code == 422, bad


async def test_patch_participants_replaces_and_logs_changes(client: AsyncClient, make_user):
    token, user, _, proj = await _setup(client, make_user)
    block = await _make_block(client, token, proj["id"], participants=[
        {"name": "Khách A", "raci": "C"}, {"userId": user["id"], "raci": "R"},
    ])
    resp = await client.patch(f"{API}/phase-blocks/{block['id']}", json={"participants": [
        {"userId": user["id"], "raci": "A"},      # đổi vai trò
        {"name": "Khách B", "raci": "I"},         # thêm mới; Khách A bị gỡ
    ]}, headers=auth(token))
    assert resp.status_code == 200, resp.text
    assert {(p["userId"], p["name"], p["raci"]) for p in resp.json()["participants"]} == {
        (user["id"], None, "A"), (None, "Khách B", "I"),
    }
    acts = (await client.get(f"{API}/phase-blocks/{block['id']}/activity", headers=auth(token))).json()
    got = {(a["action"], a["target"]) for a in acts}
    assert ("added participant", "Khách B — I") in got
    assert ("removed participant", "Khách A — C") in got
    assert ("changed participant role", f"{user['id']} — A") in got

    # PATCH không gửi participants → giữ nguyên
    keep = await client.patch(f"{API}/phase-blocks/{block['id']}", json={"title": "Mới"}, headers=auth(token))
    assert len(keep.json()["participants"]) == 2
