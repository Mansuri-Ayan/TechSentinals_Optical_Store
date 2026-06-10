# Scratch: verify_pos.py
import json
import urllib.request
import urllib.error
import sys

BASE = "http://127.0.0.1:8000"
PASS = "[PASS]"
FAIL = "[FAIL]"
results = []


def api(method, path, body=None, token=None):
    """Low-level helper – returns (status, json_body)."""
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {"detail": str(e.reason)}


def test(name, passed, detail=""):
    status = PASS if passed else FAIL
    results.append(passed)
    print(f"  {status}  {name}")
    if detail:
        print(f"         ↳ {detail}")


def header(text):
    print(f"\n============================================================")
    print(f"  {text}")
    print(f"============================================================")


def main():
    # 1. Login as Store 1 Manager
    header("1. LOGIN AS STORE 1 MANAGER")
    code, data = api("POST", "/auth/login/manager", {
        "email": "rajesh.sharma@visionary.in",
        "password": "Manager@123",
    })
    test("Login returns 200", code == 200)
    if code != 200:
        print(f"Login failed: {data}")
        sys.exit(1)

    token = data["access_token"]
    test("Token received", bool(token))

    # Get manager's store details
    code_me, data_me = api("GET", "/auth/me", token=token)
    store_id = data_me.get("store_id")
    test("Manager is assigned to a store", bool(store_id))
    print(f"Manager Store ID: {store_id}")

    # 2. Fetch inventory
    header("2. FETCH STORE INVENTORY")
    code, data = api("GET", f"/inventory/?owner_type=STORE&owner_id={store_id}", token=token)
    test("Fetch inventory returns 200", code == 200)
    inv_items = data.get("items", [])
    test("Inventory is not empty", len(inv_items) > 0)
    
    first_item = None
    if inv_items:
        first_item = inv_items[0]
        print(f"First inventory item: {first_item['product_name']} (Qty: {first_item['available_quantity']})")
    else:
        print(f"Fetch inventory response: {data}")

    # 3. Create customer for Store 1
    header("3. CREATE NEW CUSTOMER")
    cust_payload = {
        "first_name": "Test",
        "last_name": "Customer",
        "phone": "9999900001",
        "email": "test.cust@gmail.com",
        "store_id": store_id,
        "gender": "MALE",
    }
    code, data = api("POST", "/customers/", body=cust_payload, token=token)
    test("Customer creation returns 201/200", code in [200, 201])
    customer_id = data.get("id")
    test("Customer has an ID", bool(customer_id))
    print(f"Created Customer ID: {customer_id}")

    # 4. Create Prescription
    header("4. RECORD PRESCRIPTION FOR CUSTOMER")
    pres_payload = {
        "customer_id": customer_id,
        "sph_right": "-1.50",
        "cyl_right": "-0.50",
        "axis_right": "180",
        "sph_left": "-1.25",
        "cyl_left": "-0.25",
        "axis_left": "175",
        "lens_type": "Single Vision",
        "doctor_name": "Dr. Meera Shah",
        "prescription_date": "2026-06-09",
    }
    code_pres, data_pres = api("POST", "/prescriptions/", body=pres_payload, token=token)
    test("Prescription creation returns 201/200", code_pres in [200, 201])
    if code_pres not in [200, 201]:
        print(f"Prescription creation failed: {data_pres}")
    
    # 5. Create Sale
    header("5. RECORD SALE TRANSACTION (CHECKOUT)")
    if first_item:
        price = float(first_item["selling_price"])
        if price <= 0:
            price = 1500.00
            
        sale_payload = {
            "store_id": store_id,
            "customer_id": customer_id,
            "sold_by_type": "MANAGER",
            "sold_by_id": data_me.get("id", 1),
            "sale_date": "2026-06-09",
            "items": [
                {
                    "product_id": first_item["product_id"],
                    "inventory_id": first_item["id"],
                    "quantity": 1,
                    "unit_price": price,
                }
            ],
            "payments": [
                {
                    "amount": price,
                    "payment_method": "CASH",
                    "remarks": "Paid in full"
                }
            ]
        }
        code_sale, data_sale = api("POST", "/sales/", body=sale_payload, token=token)
        print(f"Sale endpoint returned HTTP status: {code_sale}")
        test("Sale creation returns 201/200", code_sale in [200, 201])
        if code_sale not in [200, 201]:
            print(f"Sale creation error: {data_sale}")
        else:
            test("Sale total amount matches unit price", float(data_sale.get("total_amount", 0)) == price)
            print(f"Generated Invoice Number: {data_sale.get('invoice_number')}")
    else:
        print("Skipped sale creation: no inventory item found")

    # 6. Verify Database Isolation (Cross-Store post should fail)
    header("6. VERIFY ISOLATION: CROSS-POST SALE TO STORE 2")
    invalid_store_id = store_id + 1
    if first_item:
        price = float(first_item["selling_price"])
        if price <= 0:
            price = 1500.00
            
        sale_payload_invalid = {
            "store_id": invalid_store_id,
            "customer_id": customer_id,
            "sold_by_type": "MANAGER",
            "sold_by_id": data_me.get("id", 1),
            "sale_date": "2026-06-09",
            "items": [
                {
                    "product_id": first_item["product_id"],
                    "inventory_id": first_item["id"],
                    "quantity": 1,
                    "unit_price": price,
                }
            ],
            "payments": []
        }
        code_inv, data_inv = api("POST", "/sales/", body=sale_payload_invalid, token=token)
        test("Cross-store sale returns 403 Forbidden", code_inv == 403)
        print(f"Cross-store error response: {data_inv}")
    else:
        print("Skipped isolation verification")

    # 7. Summary
    header("SUMMARY")
    passed = sum(results)
    total = len(results)
    print(f"\n  {passed}/{total} tests passed\n")
    if passed < total:
        print(f"  {FAIL}  {total - passed} test(s) failed!")
        sys.exit(1)
    else:
        print(f"  {PASS}  All POS checkout and isolation tests passed successfully!\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
