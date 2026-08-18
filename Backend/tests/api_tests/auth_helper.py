"""
Auth helper — login and get JWT tokens for any seeded user.
"""
import requests
import sys
import os
import sys; sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Allow importing config from same directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import BASE_URL, CREDENTIALS

import json

CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "token_cache.json")

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_cache(cache):
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f)
    except Exception:
        pass


def is_token_expired(token: str) -> bool:
    import base64
    import json
    import time
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return True
        payload_b64 = parts[1]
        payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
        payload_bytes = base64.b64decode(payload_b64)
        payload = json.loads(payload_bytes)
        exp = payload.get("exp")
        if not exp:
            return True
        return time.time() > (exp - 30)
    except Exception:
        return True


def login(user_key: str) -> dict:
    """
    Login as user_key and return {"access_token": ..., "refresh_token": ...}.
    Caches tokens per user_key in a file to share across separate test processes and bypass rate limiting.
    """
    cache = load_cache()
    if user_key in cache:
        tokens = cache[user_key]
        if isinstance(tokens, dict) and "access_token" in tokens:
            if not is_token_expired(tokens["access_token"]):
                return tokens

    cred = CREDENTIALS.get(user_key)
    if not cred:
        raise ValueError(f"Unknown user key: {user_key}. Available: {list(CREDENTIALS.keys())}")

    role = cred["role"]
    url = f"{BASE_URL}/auth/login/{role}"
    payload = {"email": cred["email"], "password": cred["password"]}

    resp = requests.post(url, json=payload, timeout=15)
    if resp.status_code == 200:
        tokens = resp.json()
        cache[user_key] = tokens
        save_cache(cache)
        return tokens
    else:
        # Return error info instead of raising so tests can handle failures
        return {"error": True, "status_code": resp.status_code, "detail": resp.text}


def get_headers(user_key: str) -> dict:
    """Get Authorization headers for user_key."""
    tokens = login(user_key)
    if "error" in tokens:
        return {"X-Auth-Error": f"Login failed for {user_key}: {tokens['detail']}"}
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def get_token(user_key: str) -> str:
    """Get just the access_token string."""
    tokens = login(user_key)
    if "error" in tokens:
        return None
    return tokens.get("access_token")


def clear_cache():
    """Clear the token cache file (useful between test runs)."""
    if os.path.exists(CACHE_FILE):
        try:
            os.remove(CACHE_FILE)
        except Exception:
            pass


class CallableBool:
    def __init__(self, value):
        self.value = bool(value)
    def __call__(self):
        return self.value
    def __bool__(self):
        return self.value
    def __repr__(self):
        return str(self.value)
    def __eq__(self, other):
        return self.value == other

# ── Test result tracking ────────────────────────────────────────────────────
class TestResults:
    """Simple test result tracker with PASS/FAIL formatting."""

    def __init__(self, suite_name: str):
        self.suite_name = suite_name
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.results = []

    @property
    def failures(self):
        return self.failed

    @property
    def all_passed(self):
        return CallableBool(self.failed == 0)

    def record(self, method_or_desc: str, path_or_resp=None, description_or_expected=None, passed=None,
               expected=None, actual=None, detail=None):
        import requests
        # Check if called as record(description, resp, expected_statuses)
        if passed is None and (isinstance(path_or_resp, requests.Response) or hasattr(path_or_resp, 'status_code')):
            resp = path_or_resp
            expected_statuses = description_or_expected
            if isinstance(expected_statuses, (int, float)):
                expected_statuses = [int(expected_statuses)]
            elif not isinstance(expected_statuses, list):
                expected_statuses = [expected_statuses]

            passed_val = resp.status_code in expected_statuses
            description = method_or_desc
            method = resp.request.method if resp.request else ""
            path = resp.request.path_url if resp.request else ""
            actual_val = resp.status_code
            expected_val = expected_statuses
            detail_val = f"Status: {resp.status_code}, Body: {resp.text[:300]}"
        else:
            # Standard signature
            method = method_or_desc
            path = path_or_resp
            description = description_or_expected
            passed_val = passed
            expected_val = expected
            actual_val = actual
            detail_val = detail

        status = "PASS" if passed_val else "FAIL"
        if passed_val:
            self.passed += 1
        else:
            self.failed += 1

        entry = {
            "status": status,
            "method": method,
            "path": path,
            "description": description,
            "expected": expected_val,
            "actual": actual_val,
            "detail": detail_val,
        }
        self.results.append(entry)

        line = f"[{status}] {method} {path} — {description}" if method else f"[{status}] — {description}"
        print(f"  {line}")
        if not passed_val:
            print(f"       Expected: {expected_val}")
            print(f"       Actual:   {actual_val}")
            if detail_val:
                print(f"       Detail:   {str(detail_val)[:300]}")

    def add_success(self, description: str, detail=None):
        self.record("", "", description, True, detail=detail)

    def add_failure(self, description: str, detail=None, expected=None, actual=None):
        self.record("", "", description, False, expected=expected, actual=actual, detail=detail)

    def check(self, description: str, passed: bool, detail=None):
        self.record("", "", description, passed, detail=detail)

    def assert_true(self, condition, description, detail=None):
        self.record("", "", description, bool(condition), detail=detail)

    def skip(self, method: str, path: str, description: str, reason: str):
        self.skipped += 1
        self.results.append({
            "status": "SKIP",
            "method": method,
            "path": path,
            "description": description,
            "detail": reason,
        })
        print(f"  [SKIP] {method} {path} — {description} ({reason})")

    def summary(self):
        total = self.passed + self.failed + self.skipped
        print(f"\n{'='*70}")
        print(f"  {self.suite_name} — RESULTS: {self.passed}/{total} passed, "
              f"{self.failed} failed, {self.skipped} skipped")
        print(f"{'='*70}")
        return self.failed == 0

    def to_dict(self):
        return {
            "suite": self.suite_name,
            "passed": self.passed,
            "failed": self.failed,
            "skipped": self.skipped,
            "results": self.results,
        }


def safe_json(resp):
    """Safely extract JSON from response, return {} on failure."""
    try:
        return resp.json()
    except Exception:
        return {"_raw": resp.text[:500]}


def extract_list(data, key_options=None):
    if not data:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        options = key_options or ['items', 'data', 'stores', 'categories', 'suppliers', 'brands', 'products', 'customers']
        for opt in options:
            if opt in data and isinstance(data[opt], list):
                return data[opt]
        if 'id' in data:
            return [data]
        for val in data.values():
            if isinstance(val, list):
                return val
    return []
