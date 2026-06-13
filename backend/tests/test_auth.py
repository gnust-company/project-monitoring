"""Slice 1 — auth, first-run setup, JWT guard, permission foundation."""
from httpx import AsyncClient

API = "/api/v1"


async def test_setup_status_true_when_no_users(client: AsyncClient):
    resp = await client.get(f"{API}/auth/setup-status")
    assert resp.status_code == 200
    assert resp.json() == {"needsSetup": True}


async def test_setup_creates_superuser_then_locks(client: AsyncClient):
    body = {"email": "admin@hub.io", "password": "secret123", "name": "Admin", "role": "PM"}
    resp = await client.post(f"{API}/auth/setup", json=body)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["accessToken"]
    assert data["user"]["email"] == "admin@hub.io"
    assert data["user"]["isSuperuser"] is True
    assert data["user"]["role"] == "PM"

    # Sau khi đã có user, setup-status phải False và setup phải bị khóa
    status_resp = await client.get(f"{API}/auth/setup-status")
    assert status_resp.json() == {"needsSetup": False}

    again = await client.post(f"{API}/auth/setup", json=body)
    assert again.status_code == 409


async def test_register_login_me_flow(client: AsyncClient):
    reg = await client.post(f"{API}/auth/register", json={
        "email": "sara@hub.io", "password": "pw12345", "name": "Sara", "role": "BA",
    })
    assert reg.status_code == 201, reg.text
    assert reg.json()["user"]["isSuperuser"] is False  # register không tạo superuser

    login = await client.post(f"{API}/auth/login", json={
        "email": "sara@hub.io", "password": "pw12345",
    })
    assert login.status_code == 200
    token = login.json()["accessToken"]

    me = await client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "sara@hub.io"
    assert me.json()["role"] == "BA"


async def test_login_wrong_password_401(client: AsyncClient):
    await client.post(f"{API}/auth/register", json={
        "email": "bob@hub.io", "password": "rightpw1", "name": "Bob", "role": "GUI",
    })
    bad = await client.post(f"{API}/auth/login", json={
        "email": "bob@hub.io", "password": "wrongpw",
    })
    assert bad.status_code == 401


async def test_register_duplicate_email_409(client: AsyncClient):
    body = {"email": "dup@hub.io", "password": "pw123456", "name": "Dup", "role": "PM"}
    first = await client.post(f"{API}/auth/register", json=body)
    assert first.status_code == 201
    second = await client.post(f"{API}/auth/register", json=body)
    assert second.status_code == 409


async def test_me_without_token_401(client: AsyncClient):
    resp = await client.get(f"{API}/auth/me")
    assert resp.status_code == 401
