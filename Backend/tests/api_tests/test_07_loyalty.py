import sys
import os
import requests
import json

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth_helper import get_headers, TestResults, safe_json, extract_list
from config import BASE_URL

def run_tests():
    results = TestResults("Loyalty System Tests")
    
    admin_headers = get_headers("admin_1")
    manager_headers = get_headers("manager_1")
    worker_headers = get_headers("worker_1")
    optician_headers = get_headers("optician_1")
    
    if not admin_headers or not manager_headers:
        print("Failed to get auth headers. Check server and credentials.")
        sys.exit(1)
        
    print("\n=== Fetching Initial Data ===")
    stores_resp = requests.get(f"{BASE_URL}/stores/", headers=admin_headers)
    if stores_resp.status_code != 200 or not stores_resp.json():
        print("Failed to fetch stores")
        sys.exit(1)
    stores_data = stores_resp.json()
    if isinstance(stores_data, list):
        stores = stores_data
    elif isinstance(stores_data, dict):
        stores = stores_data.get('data', stores_data.get('stores', [stores_data] if 'id' in stores_data else []))
    else:
        stores = []
    store_id = stores[0]['id'] if stores else 1  # fallback to 1
    
    cats_resp = requests.get(f"{BASE_URL}/categories/", headers=admin_headers)
    cats = extract_list(safe_json(cats_resp)) if cats_resp.status_code == 200 else []
    category_id = cats[0]['id'] if cats else 1
    
    cust_resp = requests.get(f"{BASE_URL}/customers/", headers=manager_headers)
    custs = extract_list(safe_json(cust_resp)) if cust_resp.status_code == 200 else []
    customer_id = custs[0]['id'] if custs else 1

    # 1. Loyalty config (admin)
    print("\n=== 1. Loyalty Config (Admin) ===")
    url = f"{BASE_URL}/admin/loyalty/configs"
    resp = requests.get(url, headers=admin_headers)
    results.record("Admin get all loyalty configs", resp, 200)
    
    url = f"{BASE_URL}/admin/store/{store_id}/loyalty/config"
    resp = requests.get(url, headers=admin_headers)
    results.record("Admin get store loyalty config", resp, 200)
    
    payload = {
        "is_enabled": True,
        "category_points_enabled": True,
        "price_points_enabled": True,
        "price_interval": 100,
        "price_points": 5,
        "points_per_rupee": 1,
        "min_redemption_points": 100,
        "max_redemption_percentage": 50,
        "silver_max": 1000,
        "gold_max": 5000
    }
    resp = requests.put(url, headers=admin_headers, json=payload)
    results.record("Admin update store loyalty config", resp, 200)

    # 2. Loyalty config (shopkeeper)
    print("\n=== 2. Loyalty Config (Shopkeeper) ===")
    url = f"{BASE_URL}/shopkeeper/loyalty/config"
    resp = requests.get(url, headers=manager_headers)
    results.record("Shopkeeper get loyalty config", resp, 200)
    
    resp = requests.put(url, headers=manager_headers, json=payload)
    results.record("Shopkeeper update loyalty config", resp, 200)

    # 3. Loyalty categories
    print("\n=== 3. Loyalty Categories ===")
    url = f"{BASE_URL}/admin/store/{store_id}/loyalty/categories"
    resp = requests.get(url, headers=admin_headers)
    results.record("Admin get loyalty categories", resp, 200)
    
    url = f"{BASE_URL}/admin/store/{store_id}/loyalty/categories/{category_id}"
    cat_payload = {"points_per_unit": 2, "is_enabled": True}
    resp = requests.put(url, headers=admin_headers, json=cat_payload)
    results.record("Admin update loyalty category", resp, [200, 404])
    
    url = f"{BASE_URL}/shopkeeper/loyalty/categories"
    resp = requests.get(url, headers=manager_headers)
    results.record("Shopkeeper get loyalty categories", resp, 200)
    
    url = f"{BASE_URL}/shopkeeper/loyalty/categories/{category_id}"
    resp = requests.put(url, headers=manager_headers, json=cat_payload)
    results.record("Shopkeeper update loyalty category", resp, [200, 404])

    # 4. Loyalty customers
    print("\n=== 4. Loyalty Customers ===")
    url = f"{BASE_URL}/admin/loyalty/customers"
    resp = requests.get(url, headers=admin_headers)
    results.record("Admin get all loyalty customers", resp, 200)
    
    url = f"{BASE_URL}/admin/store/{store_id}/loyalty/customers"
    resp = requests.get(url, headers=admin_headers)
    results.record("Admin get store loyalty customers", resp, 200)
    
    url = f"{BASE_URL}/admin/loyalty/customers/{customer_id}"
    resp = requests.get(url, headers=admin_headers)
    results.record("Admin get customer loyalty detail", resp, [200, 404])
    
    url = f"{BASE_URL}/shopkeeper/loyalty/customers"
    resp = requests.get(url, headers=manager_headers)
    results.record("Shopkeeper get loyalty customers", resp, 200)
    
    url = f"{BASE_URL}/shopkeeper/loyalty/customers/{customer_id}"
    resp = requests.get(url, headers=manager_headers)
    results.record("Shopkeeper get customer loyalty detail", resp, [200, 404])

    # 5. Loyalty stats
    print("\n=== 5. Loyalty Stats ===")
    stats_endpoints = ['stats', 'trends', 'tier-distribution']
    
    for endpoint in stats_endpoints:
        url = f"{BASE_URL}/admin/loyalty/{endpoint}"
        resp = requests.get(url, headers=admin_headers)
        results.record(f"Admin get global loyalty {endpoint}", resp, 200)
        
        url = f"{BASE_URL}/admin/store/{store_id}/loyalty/{endpoint}"
        resp = requests.get(url, headers=admin_headers)
        results.record(f"Admin get store loyalty {endpoint}", resp, 200)
        
        url = f"{BASE_URL}/shopkeeper/loyalty/{endpoint}"
        resp = requests.get(url, headers=manager_headers)
        results.record(f"Shopkeeper get loyalty {endpoint}", resp, 200)

    # 6. Preview
    print("\n=== 6. Calculate Preview ===")
    url = f"{BASE_URL}/shopkeeper/loyalty/calculate-preview"
    preview_payload = {
        "customer_id": customer_id,
        "sale_items": [
            {
                "category_id": category_id,
                "price": 1000.0,
                "quantity": 1
            }
        ],
        "final_amount": 1000.0,
        "custom_points": 0,
        "category_points_override": False,
        "price_points_override": False
    }
    resp = requests.post(url, headers=manager_headers, json=preview_payload)
    results.record("Shopkeeper calculate preview", resp, 200)

    # 7. Adjust points
    print("\n=== 7. Adjust Points ===")
    url = f"{BASE_URL}/admin/store/{store_id}/loyalty/adjust"
    adjust_payload = {
        "customer_id": customer_id,
        "points": 50,
        "note": "Test adjustment"
    }
    resp = requests.post(url, headers=admin_headers, json=adjust_payload)
    results.record("Admin adjust points", resp, [200, 404])
    
    url = f"{BASE_URL}/shopkeeper/loyalty/adjust"
    resp = requests.post(url, headers=manager_headers, json=adjust_payload)
    results.record("Shopkeeper adjust points", resp, [200, 404])

    # 8. Worker/Optician Access
    print("\n=== 8. Worker/Optician Access ===")
    roles = [("worker", worker_headers), ("optician", optician_headers)]
    
    for role_name, headers in roles:
        url = f"{BASE_URL}/shopkeeper/loyalty/config"
        resp = requests.get(url, headers=headers)
        results.record(f"{role_name.capitalize()} get loyalty config", resp, [200, 403])
        
        url = f"{BASE_URL}/shopkeeper/loyalty/customers"
        resp = requests.get(url, headers=headers)
        results.record(f"{role_name.capitalize()} get loyalty customers", resp, [200, 403])

    results.summary()
    sys.exit(0 if results.all_passed else 1)

if __name__ == "__main__":
    run_tests()
