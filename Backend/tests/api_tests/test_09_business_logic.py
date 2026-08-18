import sys
import os
import requests
import random
import string

# Add the script directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from auth_helper import get_headers, TestResults, safe_json, extract_list
from config import BASE_URL

results = TestResults("09_business_logic")

def generate_random_phone():
    return "".join(random.choices(string.digits, k=10))

def generate_random_email(prefix="test"):
    domain = "".join(random.choices(string.ascii_lowercase, k=5))
    return f"{prefix}_{domain}@test.com"

def run_tests():
    print("--- 1. Tenant isolation (5 tenants) ---")
    admin_1_headers = get_headers("admin_1")
    admin_2_headers = get_headers("admin_2")
    
    # Create a customer for admin_2 to ensure isolation can be tested
    phone_2 = generate_random_phone()
    res = requests.post(f"{BASE_URL}/customers/", json={"first_name": "Tenant 2", "last_name": "Cust", "phone": phone_2}, headers=admin_2_headers)
    print("admin_2 customer creation status:", res.status_code, res.text)

    r = requests.get(f"{BASE_URL}/customers/", headers=admin_1_headers)
    results.record('', '', "admin_1 list customers", r.status_code == 200)
    admin_1_customers = extract_list(safe_json(r))
    
    r = requests.get(f"{BASE_URL}/customers/", headers=admin_2_headers)
    results.record('', '', "admin_2 list customers", r.status_code == 200)
    admin_2_customers = extract_list(safe_json(r))
    
    # Check isolation (no shared customer IDs)
    admin_1_ids = {c["id"] for c in admin_1_customers}
    admin_2_ids = {c["id"] for c in admin_2_customers}
    intersection = admin_1_ids.intersection(admin_2_ids)
    results.record('', '', "Tenant isolation customers (no shared IDs)", len(intersection) == 0)
    
    if admin_2_ids:
        c2_id = list(admin_2_ids)[0]
        r = requests.get(f"{BASE_URL}/customers/{c2_id}", headers=admin_1_headers)
        results.record('', '', "admin_1 trying to get admin_2 customer 404/403", r.status_code in [403, 404])
    else:
        results.record('', '', "admin_1 trying to get admin_2 customer 404/403", None, detail="admin_2 has no customers")

    print("\n--- 2. Store scoping ---")
    manager_1_headers = get_headers("manager_1")
    manager_2_headers = get_headers("manager_2")
    
    # Needs a store_id for manager_2
    r_store = requests.get(f"{BASE_URL}/stores/", headers=admin_2_headers)
    if r_store.status_code == 200 and safe_json(r_store).get("items"):
        store_2_id = safe_json(r_store)["items"][0]["id"]
        
        # We assume manager_1 tries to list store 2 inventory directly, or just list global inventory and check if it has store 2 items
        r = requests.get(f"{BASE_URL}/inventory/store/{store_2_id}", headers=manager_1_headers)
        results.record('', '', "manager_1 tries to access store_2 inventory", r.status_code in [403, 404])
    else:
        results.record('', '', "manager_1 tries to access store_2 inventory", None, detail="Could not find store 2")

    print("\n--- 3. Brands CRUD ---")
    r = requests.post(f"{BASE_URL}/brands/", json={"name": "RayBan Admin1", "description": "Desc"}, headers=admin_1_headers)
    results.record('', '', "POST /brands as admin_1", r.status_code in [200, 201])
    brand_id = safe_json(r).get("id")
    
    if brand_id:
        r = requests.get(f"{BASE_URL}/brands/", headers=admin_1_headers)
        results.record('', '', "GET /brands as admin_1", r.status_code == 200)
        
        r = requests.put(f"{BASE_URL}/brands/{brand_id}", json={"name": "RayBan Updated", "description": "Desc2"}, headers=admin_1_headers)
        results.record('', '', "PUT /brands/{id} as admin_1", r.status_code == 200)
        
        r = requests.delete(f"{BASE_URL}/brands/{brand_id}", headers=admin_1_headers)
        results.record('', '', "DELETE /brands/{id} as admin_1", r.status_code == 200)
        
    r = requests.post(f"{BASE_URL}/shopkeeper/brands/", json={"name": "RayBan Mgr1"}, headers=manager_1_headers)
    results.record('', '', "POST /shopkeeper/brands as manager_1", r.status_code in [200, 201])
    sk_brand_id = safe_json(r).get("id")
    if sk_brand_id:
        r = requests.get(f"{BASE_URL}/shopkeeper/brands/", headers=manager_1_headers)
        results.record('', '', "GET /shopkeeper/brands as manager_1", r.status_code == 200)
        
        r = requests.put(f"{BASE_URL}/shopkeeper/brands/{sk_brand_id}", json={"name": "RayBan Mgr1 Upd"}, headers=manager_1_headers)
        results.record('', '', "PUT /shopkeeper/brands as manager_1", r.status_code == 200)
        
        r = requests.delete(f"{BASE_URL}/shopkeeper/brands/{sk_brand_id}", headers=manager_1_headers)
        results.record('', '', "DELETE /shopkeeper/brands as manager_1", r.status_code == 200)

    print("\n--- 4. Categories CRUD ---")
    r = requests.post(f"{BASE_URL}/categories/", json={"name": "Sunglasses", "description": "Desc"}, headers=admin_1_headers)
    results.record('', '', "POST /categories as admin_1", r.status_code in [200, 201])
    cat_id = safe_json(r).get("id")
    if cat_id:
        r = requests.post(f"{BASE_URL}/categories/{cat_id}/subcategories", json={"name": "Polarized"}, headers=admin_1_headers)
        results.record('', '', "POST /categories/{id}/subcategories as admin_1", r.status_code in [200, 201])
        r = requests.get(f"{BASE_URL}/categories/", headers=admin_1_headers)
        results.record('', '', "GET /categories as admin_1", r.status_code == 200)
        
    r = requests.post(f"{BASE_URL}/shopkeeper/categories/", json={"name": "SK Sunglasses"}, headers=manager_1_headers)
    results.record('', '', "POST /shopkeeper/categories as manager_1", r.status_code in [200, 201])
    sk_cat_id = safe_json(r).get("id")
    if sk_cat_id:
        r = requests.get(f"{BASE_URL}/shopkeeper/categories/", headers=manager_1_headers)
        results.record('', '', "GET /shopkeeper/categories as manager_1", r.status_code == 200)

    print("\n--- 5. Products CRUD ---")
    payload = {
        "name": "Test Product",
        "type": "FRAME",
        "selling_price": 1000.0,
        "cost_price": 500.0,
        "status": "ACTIVE"
    }
    if brand_id: payload["brand_id"] = brand_id
    if cat_id: payload["category_id"] = cat_id
    r = requests.post(f"{BASE_URL}/products/", json=payload, headers=admin_1_headers)
    results.record('', '', "POST /products as admin_1", r.status_code in [200, 201])
    prod_id = safe_json(r).get("id")
    r = requests.get(f"{BASE_URL}/products/", headers=admin_1_headers)
    results.record('', '', "GET /products as admin_1", r.status_code == 200)
    if prod_id:
        r = requests.put(f"{BASE_URL}/products/{prod_id}", json={"name": "Updated Test Product"}, headers=admin_1_headers)
        results.record('', '', "PUT /products/{id} as admin_1", r.status_code == 200)

    print("\n--- 6. Stores CRUD ---")
    r = requests.get(f"{BASE_URL}/stores/", headers=admin_1_headers)
    results.record('', '', "GET /stores as admin_1", r.status_code == 200)
    store_1_id = None
    stores = extract_list(safe_json(r))
    if stores:
        store_1_id = stores[0]["id"]
        
    worker_1_headers = get_headers("worker_1")
    r = requests.get(f"{BASE_URL}/stores/", headers=worker_1_headers)
    results.record('', '', "GET /stores as worker_1", r.status_code == 200)
    
    if store_1_id:
        r = requests.get(f"{BASE_URL}/stores/{store_1_id}", headers=admin_1_headers)
        results.record('', '', "GET /stores/{id} detail", r.status_code == 200)
        
        r = requests.get(f"{BASE_URL}/stores/{store_1_id}/overview", headers=admin_1_headers)
        results.record('', '', "GET /stores/{id}/overview", r.status_code == 200)
        
        r = requests.get(f"{BASE_URL}/stores/{store_1_id}/staff", headers=admin_1_headers)
        results.record('', '', "GET /stores/{id}/staff", r.status_code == 200)
        
        r = requests.put(f"{BASE_URL}/stores/{store_1_id}", json={"store_name": "Updated Store Name", "phone": generate_random_phone()}, headers=admin_1_headers)
        results.record('', '', "PUT /stores/{id} update", r.status_code == 200)
        
    r = requests.post(f"{BASE_URL}/stores/", json={"store_name": "New Store", "phone": generate_random_phone(), "address": "Address", "city": "City", "state": "State", "pincode": "400058"}, headers=admin_1_headers)
    results.record('', '', "POST /stores as admin_1", r.status_code in [200, 201])

    print("\n--- 7. Suppliers CRUD ---")
    r = requests.post(f"{BASE_URL}/suppliers/", json={"company_name": "Test Supplier Corp", "contact_person": "John Doe", "phone": generate_random_phone(), "address": "Address", "city": "City", "state": "State", "pincode": "400058"}, headers=admin_1_headers)
    results.record('', '', "POST /suppliers as admin_1", r.status_code in [200, 201])
    supp_id = safe_json(r).get("id")
    r = requests.get(f"{BASE_URL}/suppliers/", headers=admin_1_headers)
    results.record('', '', "GET /suppliers as admin_1", r.status_code == 200)
    
    if supp_id:
        r = requests.get(f"{BASE_URL}/suppliers/{supp_id}", headers=admin_1_headers)
        results.record('', '', "GET /suppliers/{id} detail", r.status_code == 200)
        if prod_id:
            r = requests.post(f"{BASE_URL}/suppliers/{supp_id}/products", json={"product_id": prod_id, "unit_price": 500.0, "minimum_order_quantity": 1}, headers=admin_1_headers)
            results.record('', '', "POST /suppliers/{id}/products", r.status_code in [200, 201])
        if store_1_id:
            r = requests.post(f"{BASE_URL}/suppliers/{supp_id}/stores", json={"store_id": store_1_id}, headers=admin_1_headers)
            results.record('', '', "POST /suppliers/{id}/stores", r.status_code in [200, 201])

    print("\n--- 8. Staff CRUD ---")
    if store_1_id:
        staff_payload = {
            "first_name": "New",
            "last_name": "Staff",
            "phone": generate_random_phone(),
            "email": generate_random_email("newmgr"),
            "password": "Password@123",
            "joining_date": "2026-08-13"
        }
        r = requests.post(f"{BASE_URL}/stores/{store_1_id}/managers", json=staff_payload, headers=admin_1_headers)
        results.record('', '', "POST /stores/{id}/managers", r.status_code in [200, 201])
        r = requests.get(f"{BASE_URL}/stores/{store_1_id}/managers", headers=admin_1_headers)
        results.record('', '', "GET /stores/{id}/managers", r.status_code == 200)
        
        staff_payload["email"] = generate_random_email("newworker")
        staff_payload["phone"] = generate_random_phone()
        r = requests.post(f"{BASE_URL}/stores/{store_1_id}/workers", json=staff_payload, headers=admin_1_headers)
        results.record('', '', "POST /stores/{id}/workers", r.status_code in [200, 201])
        
        staff_payload["email"] = generate_random_email("newoptician")
        staff_payload["phone"] = generate_random_phone()
        r = requests.post(f"{BASE_URL}/stores/{store_1_id}/opticians", json=staff_payload, headers=admin_1_headers)
        results.record('', '', "POST /stores/{id}/opticians", r.status_code in [200, 201])

if __name__ == "__main__":
    run_tests()
    all_passed = results.summary()
    sys.exit(0 if all_passed else 1)
