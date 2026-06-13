"""Slice 5 — notifications read API (list, unread-count, mark-read, mark-all-read).

Sự kiện được sinh ở Slice 2 (member_added). Ở đây kiểm tra phần đọc/đánh dấu.
"""
from httpx import AsyncClient

from tests.conftest import auth

API = "/api/v1"


async def _org_with_member(client, make_user):
    o_token, _ = await make_user("no@hub.io")
    m_token, m_user = await make_user("nm@hub.io", role="BA")
    org = (await client.post(f"{API}/organizations", json={"name": "N"}, headers=auth(o_token))).json()
    await client.post(f"{API}/organizations/{org['id']}/members",
                      json={"email": "nm@hub.io"}, headers=auth(o_token))
    return m_token


async def test_unread_count_and_mark_read(client: AsyncClient, make_user):
    m_token = await _org_with_member(client, make_user)

    count = await client.get(f"{API}/notifications/unread-count", headers=auth(m_token))
    assert count.json()["count"] == 1

    notifs = (await client.get(f"{API}/notifications", headers=auth(m_token))).json()
    nid = notifs[0]["id"]
    assert notifs[0]["read"] is False

    read = await client.post(f"{API}/notifications/{nid}/read", headers=auth(m_token))
    assert read.status_code == 204

    after = await client.get(f"{API}/notifications/unread-count", headers=auth(m_token))
    assert after.json()["count"] == 0


async def test_mark_all_read(client: AsyncClient, make_user):
    m_token = await _org_with_member(client, make_user)
    res = await client.post(f"{API}/notifications/read-all", headers=auth(m_token))
    assert res.status_code == 200
    assert res.json()["count"] >= 1
    assert (await client.get(f"{API}/notifications/unread-count", headers=auth(m_token))).json()["count"] == 0


async def test_cannot_read_others_notification(client: AsyncClient, make_user):
    m_token = await _org_with_member(client, make_user)
    other_token, _ = await make_user("other@hub.io")
    notifs = (await client.get(f"{API}/notifications", headers=auth(m_token))).json()
    nid = notifs[0]["id"]
    # user khác không sở hữu thông báo này → 404
    resp = await client.post(f"{API}/notifications/{nid}/read", headers=auth(other_token))
    assert resp.status_code == 404
