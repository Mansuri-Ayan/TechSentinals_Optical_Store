"""Auth flow: login, wrong password, token refresh."""


async def test_login_success(client, seeded_admin):
    resp = await client.post(
        "/auth/login/admin",
        json={"email": seeded_admin["admin_email"], "password": seeded_admin["password"]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body


async def test_login_wrong_password(client, seeded_admin):
    resp = await client.post(
        "/auth/login/admin",
        json={"email": seeded_admin["admin_email"], "password": "WrongPassword!"},
    )
    assert resp.status_code == 401


async def test_login_invalid_role_rejected(client):
    resp = await client.post(
        "/auth/login/superadmin",
        json={"email": "nobody@example.test", "password": "irrelevant"},
    )
    assert resp.status_code == 400


async def test_refresh_rotates_token(client, seeded_admin):
    login_resp = await client.post(
        "/auth/login/admin",
        json={"email": seeded_admin["admin_email"], "password": seeded_admin["password"]},
    )
    old_refresh = login_resp.json()["refresh_token"]

    refresh_resp = await client.post(
        "/auth/refresh", json={"refresh_token": old_refresh}
    )
    assert refresh_resp.status_code == 200
    new_pair = refresh_resp.json()
    assert new_pair["access_token"] != login_resp.json()["access_token"]

    # Old refresh token is single-use — reusing it must fail.
    reuse_resp = await client.post(
        "/auth/refresh", json={"refresh_token": old_refresh}
    )
    assert reuse_resp.status_code == 401


async def test_unauthenticated_request_rejected(client):
    resp = await client.get("/auth/me")
    assert resp.status_code == 401
