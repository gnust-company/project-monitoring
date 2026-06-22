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


async def _upload(client, token, block_id, name=b"x.txt", content=b"file body"):
    resp = await client.post(
        f"{API}/phase-blocks/{block_id}/attachments/file",
        files={"file": ("x.txt", content, "text/plain")},
        headers=auth(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["url"]


async def _is_gone(url: str) -> bool:
    async with httpx.AsyncClient() as real:
        return (await real.get(url)).status_code == 404


async def test_delete_phase_purges_minio_file(client: AsyncClient, make_user):
    # #21: xóa phase → object file của phase phải biến mất khỏi MinIO.
    token, _, block = await _block(client, make_user)
    url = await _upload(client, token, block["id"])
    async with httpx.AsyncClient() as real:
        assert (await real.get(url)).status_code == 200

    dele = await client.delete(
        f"{API}/phase-blocks/{block['id']}?reason=dọn dẹp", headers=auth(token)
    )
    assert dele.status_code == 204
    assert await _is_gone(url)


async def test_delete_project_purges_all_phase_files(client: AsyncClient, make_user):
    # #21: xóa dự án → file của mọi phase con phải biến mất.
    token, _, block = await _block(client, make_user)
    url = await _upload(client, token, block["id"])
    # project_id lấy gián tiếp: tạo block trả về projectId
    proj_id = block["projectId"]

    dele = await client.delete(f"{API}/projects/{proj_id}?reason=hủy dự án", headers=auth(token))
    assert dele.status_code == 204
    assert await _is_gone(url)


async def test_delete_account_purges_avatar(client: AsyncClient, make_user):
    # #21: xóa tài khoản → avatar trên MinIO phải biến mất.
    token, _, _ = await _block(client, make_user)
    avatar = await client.post(
        f"{API}/users/me/avatar",
        files={"file": ("me.png", b"\x89PNG\r\n", "image/png")},
        headers=auth(token),
    )
    url = avatar.json()["avatar"]
    async with httpx.AsyncClient() as real:
        assert (await real.get(url)).status_code == 200

    dele = await client.delete(f"{API}/users/me", headers=auth(token))
    assert dele.status_code == 204
    assert await _is_gone(url)


async def test_update_profile_and_avatar(client: AsyncClient, make_user):
    token, user, _ = await _block(client, make_user)

    patched = await client.patch(f"{API}/users/me", json={"name": "New Name"},
                                 headers=auth(token))
    assert patched.status_code == 200
    assert patched.json()["name"] == "New Name"

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
