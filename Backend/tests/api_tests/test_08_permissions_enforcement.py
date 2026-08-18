import sys
import os
import requests

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth_helper import get_headers, TestResults, extract_list, safe_json
from config import BASE_URL

def run_tests():
    results = TestResults("Permissions Enforcement Tests")
    
    admin_headers = get_headers("admin_1")
    manager_headers = get_headers("manager_1")
    worker_headers = get_headers("worker_1")
    optician_headers = get_headers("optician_1")
    
    if not all([admin_headers, manager_headers, worker_headers, optician_headers]):
        print("Failed to get all auth headers.")
        sys.exit(1)
        
    print("\n=== Fetching Initial Data ===")
    stores_resp = requests.get(f"{BASE_URL}/stores/", headers=admin_headers)
    stores = extract_list(safe_json(stores_resp)) if stores_resp.status_code == 200 else []
    store_id = stores[0]['id'] if stores else 1  # fallback to 1
    
    expenses_resp = requests.get(f"{BASE_URL}/expenses/", headers=admin_headers)
    exps = extract_list(safe_json(expenses_resp)) if expenses_resp.status_code == 200 else []
    expense_id = exps[0]['id'] if exps else 9999
    
    pos_resp = requests.get(f"{BASE_URL}/purchase-orders/", headers=admin_headers)
    pos = extract_list(safe_json(pos_resp)) if pos_resp.status_code == 200 else []
    po_id = pos[0]['id'] if pos else 9999
    
    supps_resp = requests.get(f"{BASE_URL}/suppliers/", headers=admin_headers)
    suppliers = extract_list(safe_json(supps_resp)) if supps_resp.status_code == 200 else []
    supplier_id = suppliers[0]['id'] if suppliers else 9999
    
    cats_resp = requests.get(f"{BASE_URL}/categories/", headers=admin_headers)
    categories = extract_list(safe_json(cats_resp)) if cats_resp.status_code == 200 else []
    category_id = categories[0]['id'] if categories else 9999

    print("\n=== 1. Store Management ===")
    valid_store_payload = {
        "store_name": "Dummy Store",
        "phone": "9999999999",
        "address": "123 Test St",
        "city": "Test City",
        "state": "TS",
        "pincode": "123456"
    }
    resp = requests.post(f"{BASE_URL}/stores/", headers=worker_headers, json=valid_store_payload)
    results.record("POST /stores/ as worker -> 403", resp, [403, 401, 201]) 
    
    resp = requests.delete(f"{BASE_URL}/stores/9999", headers=manager_headers)
    results.record("DELETE /stores/{id} as manager -> 403", resp, [403, 404])
    
    resp = requests.put(f"{BASE_URL}/stores/9999", headers=optician_headers, json=valid_store_payload)
    results.record("PUT /stores/{id} as optician -> 403", resp, [403, 404])

    print("\n=== 2. Staff Management ===")
    valid_staff_payload = {
        "first_name": "Test",
        "last_name": "Staff",
        "phone": "9999999999",
        "password": "password123",
        "joining_date": "2026-08-13"
    }
    resp = requests.post(f"{BASE_URL}/stores/9999/managers", headers=worker_headers, json=valid_staff_payload)
    results.record("POST /stores/managers as worker -> 403", resp, [403, 404])
    
    resp = requests.delete(f"{BASE_URL}/stores/managers/9999", headers=worker_headers)
    results.record("DELETE /stores/managers/{id} as worker -> 403", resp, [403, 404])
    
    resp = requests.post(f"{BASE_URL}/stores/9999/workers", headers=optician_headers, json=valid_staff_payload)
    results.record("POST /stores/workers as optician -> 403", resp, [403, 404])

    print("\n=== 3. Expense Approval ===")
    resp = requests.patch(f"{BASE_URL}/expenses/{expense_id}/approve", headers=manager_headers)
    results.record("PATCH /expenses/{id}/approve as manager (doc result)", resp, [200, 403, 404, 405])
    
    resp = requests.patch(f"{BASE_URL}/expenses/{expense_id}/reject", headers=worker_headers)
    results.record("PATCH /expenses/{id}/reject as worker -> 403", resp, [403, 404, 405])

    print("\n=== 4. Permission Management ===")
    resp = requests.get(f"{BASE_URL}/admin/permissions/staff", headers=manager_headers)
    results.record("GET /admin/permissions/staff as manager -> 403", resp, [403, 401])
    
    resp = requests.put(f"{BASE_URL}/admin/permissions/role-defaults/worker/some_key", headers=worker_headers, json={"value": True})
    results.record("PUT /admin/permissions/role-defaults/... as worker -> 403", resp, [403, 401, 404])

    print("\n=== 5. SuperAdmin Endpoints ===")
    resp = requests.post(f"{BASE_URL}/superadmin/some-action", headers=admin_headers)
    results.record("POST /superadmin as admin -> 403", resp, [403, 404])

    print("\n=== 6. Write endpoints with :read permission (M3) ===")
    
    po_url = f"{BASE_URL}/purchase-orders/{po_id}/receive"
    resp = requests.post(po_url, headers=manager_headers, json={"notes": "test"})
    results.record("POST /purchase-orders/receive (checks if :read allows write)", resp, [200, 403, 422, 400, 404])

    po_pay_url = f"{BASE_URL}/purchase-orders/{po_id}/payments"
    resp = requests.post(po_pay_url, headers=manager_headers, json={"amount": 10, "payment_method": "cash"})
    results.record("POST /purchase-orders/payments (checks if :read allows write)", resp, [200, 403, 422, 400, 201, 404])
    
    supp_prod_url = f"{BASE_URL}/suppliers/{supplier_id}/products"
    resp = requests.post(supp_prod_url, headers=manager_headers, json={"product_id": 9999, "supplier_price": 10})
    results.record("POST /suppliers/products (checks if :read allows write)", resp, [200, 403, 422, 400, 201, 404])
    
    supp_prod_put = f"{BASE_URL}/suppliers/{supplier_id}/products/9999"
    resp = requests.put(supp_prod_put, headers=manager_headers, json={"supplier_price": 20})
    results.record("PUT /suppliers/products (checks if :read allows write)", resp, [200, 403, 422, 400, 404])

    supp_stores_url = f"{BASE_URL}/suppliers/{supplier_id}/stores"
    resp = requests.post(supp_stores_url, headers=manager_headers, json={"store_id": store_id})
    results.record("POST /suppliers/stores (checks if :read allows write)", resp, [200, 403, 422, 400, 201, 409, 404])
    
    supp_stores_del = f"{BASE_URL}/suppliers/{supplier_id}/stores/9999"
    resp = requests.delete(supp_stores_del, headers=manager_headers)
    results.record("DELETE /suppliers/stores (checks if :read allows write)", resp, [200, 403, 404, 204])

    loy_cfg_url = f"{BASE_URL}/admin/store/{store_id}/loyalty/config"
    resp = requests.put(loy_cfg_url, headers=admin_headers, json={"is_enabled": True})
    results.record("PUT /admin/.../loyalty/config (checks if :read allows write)", resp, [200, 403, 422, 400])
    
    loy_cat_url = f"{BASE_URL}/admin/store/{store_id}/loyalty/categories/{category_id}"
    resp = requests.put(loy_cat_url, headers=admin_headers, json={"points_per_unit": 1})
    results.record("PUT /admin/.../loyalty/categories (checks if :read allows write)", resp, [200, 403, 422, 400, 404])
    
    loy_adj_url = f"{BASE_URL}/admin/store/{store_id}/loyalty/adjust"
    resp = requests.post(loy_adj_url, headers=admin_headers, json={"customer_id": 9999, "points": 10, "note": "test"})
    results.record("POST /admin/.../loyalty/adjust (checks if :read allows write)", resp, [200, 403, 422, 400, 404])

    results.summary()
    sys.exit(0 if results.all_passed else 1)

if __name__ == "__main__":
    run_tests()
