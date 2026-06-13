"""Slice 4 — attachments (link + file via MinIO) và avatar. Cần MinIO đang chạy."""
import httpx
from httpx import AsyncClient

from tests.conftest import auth

API = "/api/v1"


async def _block(client, make_user):
    token, user = await make_user("att@hub.io")
    org = (await client.post(f"{API}/organizations", json={"name": "A"}, headers=auth(token))).json()
    proj = (await client.post(f"{API}/organizations/{org['id']}/projects", json={
        "name": "P", "description": "", "startDate": "2026-04-01", "targetDate": "2026-08-01",
    }, headers=auth(token))).json()
    block = (await client.post(f"{API}/projects/{proj['id']}/phase-blocks", json={
        "phaseType": "SD", "title": "T", "startDate": "2026-06-10", "endDate": "2026-06-24",
    }, headers=auth(token))).json()
    return token, user, block


async def test_add_link_attachment(client: AsyncClient, make_user):
    token, _, block = await _block(client, make_user)
    resp = await client.post(f"{API}/phase-blocks/{block['id']}/attachments/link", json={
        "kind": "link", "fileName": "Spec (Google Docs)", "url": "https://docs.google.com/x",
    }, headers=auth(token))
    assert resp.status_code == 201, resp.text
    assert resp.json()["kind"] == "link"

    lst = await client.get(f"{API}/phase-blocks/{block['id']}/attachments", headers=auth(token))
    assert len(lst.json()) == 1


async def test_upload_file_attachment_lands_in_minio(client: AsyncClient, make_user):
    token, _, block = await _block(client, make_user)
    content = b"hello document content"
    resp = await client.post(
        f"{API}/phase-blocks/{block['id']}/attachments/file",
        files={"file": ("spec.txt", content, "text/plain")},
        headers=auth(token),
    )
    assert resp.status_code == 201, resp.text
    att = resp.json()
    assert att["kind"] == "file"
    assert "/attachments/" in att["url"]

    # object tải được từ MinIO (bucket public-download)
    async with httpx.AsyncClient() as real:
        got = await real.get(att["url"])
    assert got.status_code == 200
    assert got.content == content


async def test_delete_file_attachment(client: AsyncClient, make_user):
    token, _, block = await _block(client, make_user)
    resp = await client.post(
        f"{API}/phase-blocks/{block['id']}/attachments/file",
        files={"file": ("d.txt", b"data", "text/plain")},
        headers=auth(token),
    )
    att = resp.json()
    dele = await client.delete(
        f"{API}/phase-blocks/{block['id']}/attachments/{att['id']}", headers=auth(token)
    )
    assert dele.status_code == 204
    assert (await client.get(f"{API}/phase-blocks/{block['id']}/attachments", headers=auth(token))).json() == []


async def test_update_profile_and_avatar(client: AsyncClient, make_user):
    token, user, _ = await _block(client, make_user)

    patched = await client.patch(f"{API}/users/me", json={"name": "New Name", "role": "SW_Architect"},
                                 headers=auth(token))
    assert patched.status_code == 200
    assert patched.json()["name"] == "New Name"
    assert patched.json()["role"] == "SW_Architect"

    avatar = await client.post(
        f"{API}/users/me/avatar",
        files={"file": ("me.png", b"\x89PNG\r\n", "image/png")},
        headers=auth(token),
    )
    assert avatar.status_code == 200
    url = avatar.json()["avatar"]
    assert "/avatars/" in url
    async with httpx.AsyncClient() as real:
        got = await real.get(url)
    assert got.status_code == 200
