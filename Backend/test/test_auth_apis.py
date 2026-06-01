"""
Test all Auth API endpoints end-to-end.
Run with:  python test_auth_apis.py
Requires the server to be running at http://127.0.0.1:8000
"""
import json
import urllib.request
import urllib.error
import sys

BASE = "http://127.0.0.1:8000"
PASS = "\033[92m✅ PASS\033[0m"
FAIL = "\033[91m❌ FAIL\033[0m"
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
        return e.code, json.loads(e.read())


def test(name, passed, detail=""):
    status = PASS if passed else FAIL
    results.append(passed)
    print(f"  {status}  {name}")
    if detail:
        print(f"         ↳ {detail}")


def header(text):
    print(f"\n{'═' * 60}")
    print(f"  {text}")
    print(f"{'═' * 60}")


# ──────────────────────────────────────────────────────────────
header("0. HEALTH CHECK  —  GET /")
# ──────────────────────────────────────────────────────────────
code, data = api("GET", "/")
test("Health check returns 200", code == 200)
test("Status is 'healthy'", data.get("status") == "healthy")

# ──────────────────────────────────────────────────────────────
header("1. LOGIN  —  POST /auth/login")
# ──────────────────────────────────────────────────────────────

# 1a. Valid login
code, data = api("POST", "/auth/login", {
    "email": "admin@optical.store",
    "password": "Admin@123",
})
test("Valid login returns 200", code == 200)
test("Response has access_token", "access_token" in data)
test("Response has refresh_token", "refresh_token" in data)
test("token_type is bearer", data.get("token_type") == "bearer")
ACCESS_TOKEN = data.get("access_token", "")
REFRESH_TOKEN = data.get("refresh_token", "")

# 1b. Wrong password
code, data = api("POST", "/auth/login", {
    "email": "admin@optical.store",
    "password": "WrongPass@999",
})
test("Wrong password returns 401", code == 401)
test("Error detail present", "detail" in data)

# 1c. Non-existent user
code, data = api("POST", "/auth/login", {
    "email": "nobody@optical.store",
    "password": "Whatever@1",
})
test("Non-existent user returns 401", code == 401)

# ──────────────────────────────────────────────────────────────
header("2. GET CURRENT USER  —  GET /auth/me")
# ──────────────────────────────────────────────────────────────

# 2a. With valid token
code, data = api("GET", "/auth/me", token=ACCESS_TOKEN)
test("GET /me returns 200", code == 200)
test("Email matches admin", data.get("email") == "admin@optical.store")
test("Role is admin", data.get("role") == "admin")
test("full_name present", "full_name" in data)

# 2b. Without token
code, data = api("GET", "/auth/me")
test("GET /me without token returns 403", code == 403)

# 2c. With invalid token
code, data = api("GET", "/auth/me", token="invalid.jwt.token")
test("GET /me with bad token returns 401", code == 401)

# ──────────────────────────────────────────────────────────────
header("3. REFRESH TOKEN  —  POST /auth/refresh")
# ──────────────────────────────────────────────────────────────

# 3a. Valid refresh
code, data = api("POST", "/auth/refresh", {
    "refresh_token": REFRESH_TOKEN,
})
test("Refresh returns 200", code == 200)
test("New access_token received", "access_token" in data)
test("New refresh_token received", "refresh_token" in data)
NEW_ACCESS = data.get("access_token", "")
NEW_REFRESH = data.get("refresh_token", "")

# 3b. Re-using the same (now revoked) refresh token
code, data = api("POST", "/auth/refresh", {
    "refresh_token": REFRESH_TOKEN,
})
test("Re-used refresh token returns 401", code == 401,
     "Old token should be single-use")

# 3c. Invalid refresh token
code, data = api("POST", "/auth/refresh", {
    "refresh_token": "totally.invalid.token",
})
test("Invalid refresh token returns 401", code == 401)

# 3d. Verify new access token works
code, data = api("GET", "/auth/me", token=NEW_ACCESS)
test("New access token works on /me", code == 200)

# ──────────────────────────────────────────────────────────────
header("4. LOGOUT  —  POST /auth/logout")
# ──────────────────────────────────────────────────────────────

# 4a. Logout without auth header
code, data = api("POST", "/auth/logout", {
    "refresh_token": NEW_REFRESH,
})
test("Logout without auth returns 403", code == 403)

# 4b. Valid logout
code, data = api("POST", "/auth/logout", {
    "refresh_token": NEW_REFRESH,
}, token=NEW_ACCESS)
test("Logout returns 200", code == 200)
test("Success message received", "message" in data)

# 4c. Logout again (token already revoked)
code, data = api("POST", "/auth/logout", {
    "refresh_token": NEW_REFRESH,
}, token=NEW_ACCESS)
test("Re-logout returns 400", code == 400,
     "Token already revoked")

# 4d. Revoked refresh token can't be used to refresh
code, data = api("POST", "/auth/refresh", {
    "refresh_token": NEW_REFRESH,
})
test("Revoked refresh token returns 401", code == 401)

# ──────────────────────────────────────────────────────────────
header("5. CROSS-ROLE LOGIN TEST")
# ──────────────────────────────────────────────────────────────

for user in [
    {"email": "cashier@optical.store", "password": "Cashier@123", "role": "cashier"},
    {"email": "optom@optical.store", "password": "Optom@123", "role": "optometrist"},
    {"email": "manager@optical.store", "password": "Manager@123", "role": "manager"},
]:
    code, data = api("POST", "/auth/login", {
        "email": user["email"],
        "password": user["password"],
    })
    test(f"{user['role'].capitalize()} login returns 200", code == 200)
    if code == 200:
        code2, data2 = api("GET", "/auth/me", token=data["access_token"])
        test(f"{user['role'].capitalize()} /me role correct",
             data2.get("role") == user["role"],
             f"role={data2.get('role')}")


# ──────────────────────────────────────────────────────────────
header("SUMMARY")
# ──────────────────────────────────────────────────────────────
passed = sum(results)
total = len(results)
print(f"\n  {passed}/{total} tests passed\n")
if passed < total:
    print(f"  {FAIL}  {total - passed} test(s) failed!")
    sys.exit(1)
else:
    print(f"  {PASS}  All tests passed! APIs are ready for frontend integration.\n")
    sys.exit(0)
