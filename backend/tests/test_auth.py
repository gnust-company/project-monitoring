"""Slice 1 — auth, first-run setup, JWT guard, permission foundation."""
import pytest
from httpx import AsyncClient

from app.core.config import get_settings

API = "/api/v1"


@pytest.fixture
def email_allowlist(monkeypatch):
    """Bật allowlist domain (company.com, company.vn) cho đúng test này; khôi phục sau."""
    monkeypatch.setenv("ALLOWED_EMAIL_DOMAINS", "company.com,company.vn")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def no_email_allowlist(monkeypatch):
    """Ép allowlist rỗng (= không giới hạn) cho đúng test này."""
    monkeypatch.delenv("ALLOWED_EMAIL_DOMAINS", raising=False)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


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
    # #26 mảng B: user không còn role toàn cục

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


# ─── #5: Allowlist domain email ──────────────────────────────────────
async def test_register_blocked_when_domain_not_allowed(client: AsyncClient, email_allowlist):
    resp = await client.post(f"{API}/auth/register", json={
        "email": "spy@evil.com", "password": "pw123456", "name": "Spy", "role": "PM",
    })
    assert resp.status_code == 422, resp.text
    assert "not allowed" in resp.text.lower()


async def test_register_allowed_when_domain_in_list(client: AsyncClient, email_allowlist):
    resp = await client.post(f"{API}/auth/register", json={
        "email": "ok@company.vn", "password": "pw123456", "name": "Ok", "role": "PM",
    })
    assert resp.status_code == 201, resp.text
    assert resp.json()["user"]["email"] == "ok@company.vn"


async def test_register_any_domain_when_no_allowlist(client: AsyncClient, no_email_allowlist):
    resp = await client.post(f"{API}/auth/register", json={
        "email": "anyone@whatever.net", "password": "pw123456", "name": "Any", "role": "PM",
    })
    assert resp.status_code == 201, resp.text


async def test_setup_not_blocked_by_allowlist(client: AsyncClient, email_allowlist):
    """/auth/setup (admin đầu tiên) không bị giới hạn domain (#5.3)."""
    resp = await client.post(f"{API}/auth/setup", json={
        "email": "first@anywhere.net", "password": "pw123456", "name": "First", "role": "PM",
    })
    assert resp.status_code == 201, resp.text
