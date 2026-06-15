# Scratch: verify_supplier_payments.py
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
    # 1. Login as Admin
    header("1. LOGIN AS ADMIN")
    code, data = api("POST", "/auth/login/admin", {
        "email": "ayan@visionary.in",
        "password": "Admin@123",
    })
    test("Login returns 200", code == 200)
    if code != 200:
        print(f"Login failed: {data}")
        sys.exit(1)

    token = data["access_token"]
    test("Token received", bool(token))

    # 2. Fetch Suppliers
    header("2. FETCH SUPPLIERS")
    code, data = api("GET", "/suppliers/?store_id=1&limit=1000", token=token)
    test("Fetch suppliers returns 200", code == 200)
    suppliers = data.get("items", [])
    test("Suppliers list is not empty", len(suppliers) > 0)
    if suppliers:
        print(f"Found {len(suppliers)} suppliers. First: {suppliers[0]['company_name']}")

    # 3. Fetch Purchase Orders with Dues
    header("3. FETCH PURCHASE ORDERS WITH DUES")
    code, data = api("GET", "/purchase-orders/?has_due=true", token=token)
    test("Fetch POs returns 200", code == 200)
    pos_with_dues = data
    test("Dues PO list is not empty", len(pos_with_dues) > 0)
    
    if not pos_with_dues:
        print("No purchase orders with dues found. Please run seed_data or record a purchase first.")
        sys.exit(1)

    target_po = pos_with_dues[0]
    po_id = target_po["id"]
    due_amount = float(target_po["due_amount"])
    paid_amount = float(target_po["paid_amount"])
    print(f"Target PO: {target_po['po_number']} (ID: {po_id})")
    print(f"  Total Amount: Rs. {target_po['total_amount']}")
    print(f"  Current Paid: Rs. {paid_amount}")
    print(f"  Current Due:  Rs. {due_amount}")

    # 4. Record Supplier Payment
    header("4. RECORD SUPPLIER PAYMENT")
    payment_amt = 100.00
    if due_amount < payment_amt:
        payment_amt = due_amount
        
    payment_payload = {
        "payment_date": "2026-06-13",
        "amount": payment_amt,
        "payment_method": "UPI",
        "reference_number": "TXN123456",
        "remarks": "Automated verification payment",
    }
    
    code_pay, data_pay = api("POST", f"/purchase-orders/{po_id}/payments", body=payment_payload, token=token)
    test("Payment registration returns 201 Created", code_pay == 201)
    
    # 5. Fetch PO again and verify amounts
    header("5. VERIFY PO BALANCE DECREASE")
    code_po, data_po = api("GET", f"/purchase-orders/{po_id}", token=token)
    test("Fetch updated PO returns 200", code_po == 200)
    
    new_due = float(data_po["due_amount"])
    new_paid = float(data_po["paid_amount"])
    print(f"Updated PO: {data_po['po_number']}")
    print(f"  New Paid: Rs. {new_paid}")
    print(f"  New Due:  Rs. {new_due}")
    
    test("Paid amount increased correctly", new_paid == paid_amount + payment_amt)
    test("Due amount decreased correctly", new_due == due_amount - payment_amt)

    # 6. Summary
    header("SUMMARY")
    passed = sum(results)
    total = len(results)
    print(f"\n  {passed}/{total} tests passed\n")
    if passed < total:
        print(f"  {FAIL}  {total - passed} test(s) failed!")
        sys.exit(1)
    else:
        print(f"  {PASS}  All supplier payment flow tests passed successfully!\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
