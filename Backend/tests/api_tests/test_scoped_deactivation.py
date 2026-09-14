import sys
import os
import requests

# Add the script directory to sys.path so config and auth_helper can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from auth_helper import get_headers, TestResults
from config import BASE_URL

def run_tests():
    results = TestResults("Scoped Deactivation Tests")
    print("========================================")
    print("      SCOPED DEACTIVATION TESTS")
    print("========================================")

    # 1. Login as manager_1 and list categories
    h_mgr1 = get_headers('manager_1')
    h_admin = get_headers('admin_1')

    if not h_mgr1 or not h_admin:
        print("Failed to get credentials")
        return

    # Create a test category as admin
    print("\n--- Creating test category as admin ---")
    create_url = f"{BASE_URL}/categories/"
    cat_payload = {
        "name": "Scoped Deact Test Cat",
        "description": "Category for testing scoped deactivation"
    }
    resp = requests.post(create_url, json=cat_payload, headers=h_admin)
    if resp.status_code != 201:
        print(f"Failed to create category: {resp.status_code} {resp.text}")
        results.add_failure("Create category as admin")
        return
    
    cat = resp.json()
    cat_id = cat['id']
    print(f"Created category {cat_id}")
    results.add_success("Create category as admin")

    # Deactivate (Delete) this category as manager_1 (which is scoped to store_id 1)
    print("\n--- Deactivating category as manager_1 ---")
    delete_url = f"{BASE_URL}/shopkeeper/categories/{cat_id}"
    resp = requests.delete(delete_url, headers=h_mgr1)
    if resp.status_code not in [200, 204]:
        print(f"Failed to delete category: {resp.status_code} {resp.text}")
        results.add_failure("Delete category as manager_1")
    else:
        print("Successfully deleted/deactivated category as manager_1")
        results.add_success("Delete category as manager_1")

    # Verify that the category resolved status for store_id 1 is inactive (resolved_is_active = False)
    # But for admin (global), Category.is_active is still True!
    print("\n--- Verifying global status remains active ---")
    get_global_url = f"{BASE_URL}/categories/{cat_id}"
    resp = requests.get(get_global_url, headers=h_admin)
    if resp.status_code != 200:
        print(f"Failed to get category as admin: {resp.status_code} {resp.text}")
        results.add_failure("Get category as admin")
    else:
        cat_data = resp.json()
        print(f"Global is_active is: {cat_data.get('is_active')}")
        if cat_data.get('is_active') is True:
            print("Pass: Global status remains active!")
            results.add_success("Global status remains active")
        else:
            print("Fail: Global status was changed to False!")
            results.add_failure("Global status remains active")

    results.summary()
    if results.failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
