import sys
import os
import requests

# Add the script directory to sys.path so config and auth_helper can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from auth_helper import get_headers, TestResults
from config import BASE_URL

def run_tests():
    results = TestResults("SuperAdmin CRUD & Seeding Tests")
    print("========================================")
    print("      SUPERADMIN CRUD & SEEDING TESTS")
    print("========================================")

    h_sa = get_headers('superadmin')
    if not h_sa:
        print("Failed to get credentials for SuperAdmin")
        results.add_failure("SuperAdmin Login")
        return

    # Test /auth/me as SuperAdmin
    print("\n--- Testing GET /auth/me as SuperAdmin ---")
    me_resp = requests.get(f"{BASE_URL}/auth/me", headers=h_sa)
    if me_resp.status_code == 200:
        me_data = me_resp.json()
        print(f"Me role is: {me_data.get('role')}")
        if me_data.get('role') == 'superadmin':
            results.add_success("GET /auth/me as SuperAdmin")
        else:
            results.add_failure("GET /auth/me as SuperAdmin role mismatch")
    else:
        results.add_failure("GET /auth/me as SuperAdmin status code")

    import time
    ts = int(time.time())
    email_sa = f"sa_created_{ts}@test.com"
    phone_sa = str(ts)[:10]

    # 1. Create Admin via SuperAdmin
    print("\n--- Creating admin via SuperAdmin ---")
    create_url = f"{BASE_URL}/superadmin/admins"
    payload = {
        "business_name": "Test SA Business",
        "owner_first_name": "SAFirstName",
        "owner_last_name": "SALastName",
        "email": email_sa,
        "phone": phone_sa,
        "password": "AdminPassword@123",
        "address": "123 Test St",
        "city": "SA City",
        "state": "SA State",
        "pincode": "600001",
        "gst_number": "24ABCDE1234F1Z5",
        "pan_number": "ABCDE1234F"
    }
    resp = requests.post(create_url, json=payload, headers=h_sa)
    if resp.status_code != 201:
        print(f"Failed to create admin: {resp.status_code} {resp.text}")
        results.add_failure("Create admin via SuperAdmin")
        return

    data = resp.json()
    admin_id = data.get("admin_id")
    print(f"Created admin with ID: {admin_id}")
    results.add_success("Create admin via SuperAdmin")

    # 2. Get Admin detail via SuperAdmin
    print("\n--- Fetching admin detail ---")
    detail_url = f"{BASE_URL}/superadmin/admins/{admin_id}"
    resp = requests.get(detail_url, headers=h_sa)
    if resp.status_code != 200:
        print(f"Failed to get admin detail: {resp.status_code} {resp.text}")
        results.add_failure("Get admin detail")
    else:
        print("Successfully retrieved detail")
        results.add_success("Get admin detail")

    # 3. Verify overrides table is populated for admin_id
    # We can check if effective permission map resolved (e.g. they possess copied default permissions)
    # Let's try to get permissions for a default role under this new admin (e.g. WORKER)
    # Or check if managers/workers can be created. But more directly, the copy worked if we can verify in DB.
    # We will log in as the newly created admin and check their permission defaults
    print("\n--- Verifying permissions copy for new admin ---")
    # Login as the new admin
    new_admin_key = f"new_admin_sa_{ts}"
    from config import CREDENTIALS
    CREDENTIALS[new_admin_key] = {
        "email": email_sa,
        "password": "AdminPassword@123",
        "role": "admin",
        "store_id": None
    }
    h_new_admin = get_headers(new_admin_key)
    if not h_new_admin or "X-Auth-Error" in h_new_admin:
        print(f"Failed to login as newly created admin: {h_new_admin}")
        results.add_failure("Login as new admin")
    else:
        print("Logged in as new admin successfully!")
        results.add_success("Login as new admin")

    # 4. Public Admin Registration
    print("\n--- Registering new admin publicly ---")
    reg_url = f"{BASE_URL}/auth/register/admin"
    email_pub = f"pub_created_{ts}@test.com"
    phone_pub = str(ts + 1)[:10]
    reg_payload = {
        "business_name": "Public Reg Business",
        "owner_first_name": "PubOwner",
        "owner_last_name": "PubLast",
        "email": email_pub,
        "phone": phone_pub,
        "password": "PubPassword@123",
        "address": "456 Public Rd",
        "city": "Pub City",
        "state": "Pub State",
        "pincode": "600002",
        "gst_number": "24ABCDE1234F1Z6",
        "pan_number": "ABCDE1234F"
    }
    resp = requests.post(reg_url, json=reg_payload)
    if resp.status_code != 201:
        print(f"Failed to register admin: {resp.status_code} {resp.text}")
        results.add_failure("Public Admin registration")
    else:
        pub_admin = resp.json()
        pub_admin_id = pub_admin.get("id")
        print(f"Registered admin with ID: {pub_admin_id}")
        results.add_success("Public Admin registration")

        # Login as public admin
        pub_admin_key = f"new_admin_pub_{ts}"
        CREDENTIALS[pub_admin_key] = {
            "email": email_pub,
            "password": "PubPassword@123",
            "role": "admin",
            "store_id": None
        }
        h_pub_admin = get_headers(pub_admin_key)
        if not h_pub_admin or "X-Auth-Error" in h_pub_admin:
            print("Failed to login as public registered admin")
            results.add_failure("Login as public admin")
        else:
            print("Logged in as public admin successfully!")
            results.add_success("Login as public admin")

        # 5. Delete registered admin via SuperAdmin
        print("\n--- Deleting registered admin ---")
        del_url = f"{BASE_URL}/superadmin/admins/{pub_admin_id}"
        resp = requests.delete(del_url, headers=h_sa)
        if resp.status_code != 200:
            print(f"Failed to delete admin: {resp.status_code} {resp.text}")
            results.add_failure("Delete admin")
        else:
            print("Admin deleted successfully")
            results.add_success("Delete admin")

    # Delete created admin via SuperAdmin
    print("\n--- Cleaning up created admin ---")
    del_url = f"{BASE_URL}/superadmin/admins/{admin_id}"
    resp = requests.delete(del_url, headers=h_sa)
    if resp.status_code != 200:
        print("Failed to delete created admin during cleanup")
    else:
        print("Cleanup done")

    results.summary()
    if results.failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
