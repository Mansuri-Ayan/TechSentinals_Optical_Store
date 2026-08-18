"""H1: SKU/barcode uniqueness must be scoped per tenant, not global."""


async def _login(client, email, password):
    resp = await client.post("/auth/login/admin", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


async def _make_category(client, token):
    resp = await client.post(
        "/categories/", headers={"Authorization": f"Bearer {token}"}, json={"name": "Test Category"}
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def test_same_tenant_duplicate_sku_rejected(client, seeded_admin):
    token = await _login(client, seeded_admin["admin_email"], seeded_admin["password"])
    category_id = await _make_category(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    first = await client.post(
        "/products/",
        headers=headers,
        json={"category_id": category_id, "sku": "DUPTEST", "name": "First", "cost_price": 10, "selling_price": 20},
    )
    assert first.status_code == 201

    second = await client.post(
        "/products/",
        headers=headers,
        json={"category_id": category_id, "sku": "DUPTEST", "name": "Second", "cost_price": 10, "selling_price": 20},
    )
    assert second.status_code == 409


async def test_cross_tenant_same_sku_allowed(client, seeded_admin, seeded_admin_2):
    token1 = await _login(client, seeded_admin["admin_email"], seeded_admin["password"])
    cat1 = await _make_category(client, token1)
    resp1 = await client.post(
        "/products/",
        headers={"Authorization": f"Bearer {token1}"},
        json={"category_id": cat1, "sku": "SHARED-SKU", "name": "Tenant 1 Product", "cost_price": 10, "selling_price": 20},
    )
    assert resp1.status_code == 201

    token2 = await _login(client, seeded_admin_2["admin_email"], seeded_admin_2["password"])
    cat2 = await _make_category(client, token2)
    resp2 = await client.post(
        "/products/",
        headers={"Authorization": f"Bearer {token2}"},
        json={"category_id": cat2, "sku": "SHARED-SKU", "name": "Tenant 2 Product", "cost_price": 15, "selling_price": 25},
    )
    # Different tenant — same SKU must be allowed (this is the H1 fix).
    assert resp2.status_code == 201
