# Scratch: test_manager_apis.py
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
    # 1. Login
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

    # 2. Get Managers in Store 1
    header("2. LIST MANAGERS IN STORE 1")
    code, data = api("GET", "/stores/1/managers", token=token)
    test("List managers returns 200", code == 200)
    items = data.get("items", [])
    test("Contains at least one manager", len(items) >= 1)
    if items:
        test("Manager name matches seeded Rajesh Sharma", items[0]["first_name"] == "Rajesh")
        print(f"Managers in store 1: {[m['first_name'] + ' ' + m['last_name'] for m in items]}")

    # 3. Get Single Manager by ID
    header("3. GET SINGLE MANAGER BY ID")
    code, data = api("GET", "/stores/managers/1", token=token)
    test("Get single manager returns 200", code == 200)
    test("Manager ID is 1", data.get("id") == 1)

    # 4. Create a new manager
    header("4. CREATE NEW MANAGER")
    new_manager_payload = {
        "first_name": "Test",
        "last_name": "Manager",
        "email": "test.mgr@visionary.in",
        "phone": "9999888877",
        "password": "TestManager@123",
        "employee_code": "MGR-VO-TEST",
        "joining_date": "2026-06-02",
    }
    code, data = api("POST", "/stores/1/managers", body=new_manager_payload, token=token)
    test("Create manager returns 201", code == 201)
    new_manager_id = data.get("id")
    test("New manager has an ID", bool(new_manager_id))

    # 5. Update the manager
    header("5. UPDATE MANAGER")
    update_payload = {
        "first_name": "UpdatedTest",
        "last_name": "ManagerUpdated",
    }
    code, data = api("PUT", f"/stores/managers/{new_manager_id}", body=update_payload, token=token)
    test("Update manager returns 200", code == 200)
    test("First name updated", data.get("first_name") == "UpdatedTest")

    # 6. Delete the manager (soft-delete)
    header("6. DELETE MANAGER")
    code, data = api("DELETE", f"/stores/managers/{new_manager_id}", token=token)
    test("Delete manager returns 200", code == 200)
    test("Confirmation message present", "deleted" in data.get("message", "").lower())

    # 7. Get soft-deleted manager (should be 404)
    header("7. VERIFY SOFT-DELETED MANAGER IS NOT ACCESSIBLE")
    code, data = api("GET", f"/stores/managers/{new_manager_id}", token=token)
    test("Deleted manager returns 404", code == 404)

    # 8. Summary
    header("SUMMARY")
    passed = sum(results)
    total = len(results)
    print(f"\n  {passed}/{total} tests passed\n")
    if passed < total:
        print(f"  {FAIL}  {total - passed} test(s) failed!")
        sys.exit(1)
    else:
        print(f"  {PASS}  All API integration tests passed successfully!\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
