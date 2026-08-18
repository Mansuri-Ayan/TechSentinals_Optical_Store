"""Sale creation math, and regression coverage for the C3/C4 partial-return fixes."""
from decimal import Decimal


async def _login(client, email, password):
    resp = await client.post("/auth/login/admin", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


async def _create_sale_with_discount_and_tax(client, seeded_admin):
    """Sets up a category/product/inventory/customer and creates one sale.

    Returns (response_body, headers) — used both as a standalone test of
    the sale-creation math and as setup for the partial-return test below.
    """
    token = await _login(client, seeded_admin["admin_email"], seeded_admin["password"])
    headers = {"Authorization": f"Bearer {token}"}
    store_id = seeded_admin["store_id"]

    cat = await client.post("/categories/", headers=headers, json={"name": "Sales Test Category"})
    category_id = cat.json()["id"]

    prod = await client.post(
        "/products/",
        headers=headers,
        json={"category_id": category_id, "sku": "SALES-TEST-1", "name": "Sales Test Product", "cost_price": 1000, "selling_price": 1200},
    )
    product_id = prod.json()["id"]

    inv = await client.post(
        "/inventory/",
        headers=headers,
        json={"product_id": product_id, "owner_type": "STORE", "owner_id": store_id, "quantity": 10, "reorder_level": 2},
    )
    assert inv.status_code == 201
    inventory_id = inv.json()["id"]

    customer = await client.post(
        "/customers/quick-create",
        headers=headers,
        json={"first_name": "Sale", "last_name": "Tester", "phone": "9123456789", "store_id": store_id},
    )
    assert customer.status_code == 200
    customer_id = customer.json()["id"]

    sale = await client.post(
        "/sales/",
        headers=headers,
        json={
            "store_id": store_id,
            "customer_id": customer_id,
            "sold_by_type": "ADMIN",
            "sold_by_id": seeded_admin["admin_id"],
            "sale_date": "2026-01-01",
            "items": [
                {
                    "product_id": product_id,
                    "inventory_id": inventory_id,
                    "quantity": 2,
                    "unit_price": "1200.00",
                    "discount_percent": "10.00",
                    "tax_percent": "5.00",
                }
            ],
            "payments": [{"amount": "1000.00", "payment_method": "CASH"}],
        },
    )
    assert sale.status_code == 201
    return sale.json(), headers


async def test_sale_creation_math_and_staff_attribution(client, seeded_admin):
    body, _headers = await _create_sale_with_discount_and_tax(client, seeded_admin)

    # subtotal = 1200*2 = 2400; discount 10% = 240; tax 5% of (2400-240) = 108
    assert Decimal(body["subtotal"]) == Decimal("2400.00")
    assert Decimal(body["discount_amount"]) == Decimal("240.00")
    assert Decimal(body["tax_amount"]) == Decimal("108.00")
    assert Decimal(body["total_amount"]) == Decimal("2268.00")
    assert Decimal(body["due_amount"]) == Decimal("1268.00")

    # NOTE: sold_by_type=ADMIN intentionally resolves no staff_name in both
    # the create and read response-shaping code (neither has an ADMIN branch
    # in their staff lookup) — this test uses ADMIN for simplicity, so it
    # can't exercise the H7 fix directly; see test_manager_sale_has_staff_attribution.


async def test_manager_sale_has_staff_attribution(client, seeded_admin, seeded_manager):
    """H7 regression: POST /sales/ must return staff_name/code/role, not nulls."""
    admin_token = await _login(client, seeded_admin["admin_email"], seeded_admin["password"])
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    store_id = seeded_admin["store_id"]

    cat = await client.post("/categories/", headers=admin_headers, json={"name": "Manager Sale Category"})
    category_id = cat.json()["id"]
    prod = await client.post(
        "/products/",
        headers=admin_headers,
        json={"category_id": category_id, "sku": "MGR-SALE-1", "name": "Manager Sale Product", "cost_price": 500, "selling_price": 700},
    )
    product_id = prod.json()["id"]
    inv = await client.post(
        "/inventory/",
        headers=admin_headers,
        json={"product_id": product_id, "owner_type": "STORE", "owner_id": store_id, "quantity": 5, "reorder_level": 1},
    )
    inventory_id = inv.json()["id"]

    mgr_login = await client.post(
        "/auth/login/manager",
        json={"email": seeded_manager["manager_email"], "password": seeded_manager["password"]},
    )
    assert mgr_login.status_code == 200
    mgr_headers = {"Authorization": f"Bearer {mgr_login.json()['access_token']}"}

    sale = await client.post(
        "/sales/",
        headers=mgr_headers,
        json={
            "store_id": store_id,
            "sold_by_type": "MANAGER",
            "sold_by_id": seeded_manager["manager_id"],
            "sale_date": "2026-01-01",
            "items": [{"product_id": product_id, "inventory_id": inventory_id, "quantity": 1, "unit_price": "700.00"}],
            "payments": [{"amount": "700.00", "payment_method": "CASH"}],
        },
    )
    assert sale.status_code == 201
    body = sale.json()
    assert body["staff_name"] == "Test Manager"
    assert body["staff_role"] == "Manager"
    assert body["staff_code"]


async def test_partial_return_no_longer_crashes(client, seeded_admin):
    """Regression test for C3 (500 crash) + the MissingGreenlet bug found fixing it."""
    body, headers = await _create_sale_with_discount_and_tax(client, seeded_admin)
    sale_id = body["id"]
    sale_item_id = body["items"][0]["id"]

    resp = await client.post(
        f"/sales/{sale_id}/partial-return",
        headers=headers,
        json={"items": [{"sale_item_id": sale_item_id, "quantity": 1}], "reason": "test"},
    )
    assert resp.status_code == 200
    returned = resp.json()
    # 1 unit remains: subtotal 1200, discount 10% = 120, tax 5% of 1080 = 54
    assert Decimal(returned["subtotal"]) == Decimal("1200.00")
    assert returned["items"][0]["quantity"] == 1
