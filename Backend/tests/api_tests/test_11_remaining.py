import sys
import os
import requests

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from auth_helper import get_headers, TestResults, safe_json
from config import BASE_URL

results = TestResults("11_remaining")

def run_tests():
    admin_1_headers = get_headers("admin_1")
    optician_1_headers = get_headers("optician_1")
    worker_1_headers = get_headers("worker_1")
    
    # ── Set up necessary entities ──
    # 1. Get Store ID
    stores_resp = requests.get(f"{BASE_URL}/stores/", headers=admin_1_headers)
    stores = safe_json(stores_resp)
    store_id = None
    if isinstance(stores, dict) and stores.get("items"):
        store_id = stores["items"][0]["id"]
    elif isinstance(stores, list) and stores:
        store_id = stores[0]["id"]
        
    if not store_id:
        print("Creating store for remaining tests...")
        store_data = {
            "store_name": "Remaining Test Store",
            "phone": "9999991111",
            "address": "123 Test St",
            "city": "Test City",
            "state": "TS",
            "pincode": "123456"
        }
        store_resp = requests.post(f"{BASE_URL}/stores/", headers=admin_1_headers, json=store_data)
        store_id = safe_json(store_resp).get("id")
        
    # 2. Get/Create Customer ID
    cust_resp = requests.get(f"{BASE_URL}/customers/", headers=optician_1_headers)
    customers = safe_json(cust_resp)
    customer_id = None
    if isinstance(customers, dict) and customers.get("items"):
        customer_id = customers["items"][0]["id"]
    elif isinstance(customers, list) and customers:
        customer_id = customers[0]["id"]
        
    if not customer_id:
        print("Creating customer for remaining tests...")
        cust_data = {
            "first_name": "Presc",
            "last_name": "Test",
            "phone": "9876543201",
            "gender": "MALE"
        }
        cust_resp = requests.post(f"{BASE_URL}/customers/", headers=optician_1_headers, json=cust_data)
        customer_id = safe_json(cust_resp).get("id")

    # 3. Get/Create Product ID
    prod_resp = requests.get(f"{BASE_URL}/products/", headers=admin_1_headers)
    products = safe_json(prod_resp)
    product_id = None
    if isinstance(products, dict) and products.get("items"):
        product_id = products["items"][0]["id"]
    elif isinstance(products, list) and products:
        product_id = products[0]["id"]
        
    if not product_id:
        print("Creating product for remaining tests...")
        prod_data = {
            "name": "Presc Frame",
            "sku": "SKUPRESC123",
            "barcode": "BARPRESC123",
            "cost_price": 500.0,
            "selling_price": 1000.0
        }
        prod_resp = requests.post(f"{BASE_URL}/products/", headers=admin_1_headers, json=prod_data)
        product_id = safe_json(prod_resp).get("id")

    print("\n--- 1. Prescriptions Endpoints ---")
    # A. Create prescription as optician
    presc_payload = {
        "customer_id": customer_id or 1,
        "sph_right": "+1.25",
        "cyl_right": "-0.50",
        "axis_right": "90",
        "sph_left": "+1.00",
        "cyl_left": "-0.25",
        "axis_left": "95",
        "prescription_date": "2026-08-13",
        "doctor_name": "Dr. Eye"
    }
    r_create = requests.post(f"{BASE_URL}/prescriptions/", json=presc_payload, headers=optician_1_headers)
    results.record('', '', "POST /prescriptions/ as optician_1", r_create.status_code in [200, 201])
    presc_id = safe_json(r_create).get("id")

    # B. List prescriptions for customer
    if customer_id:
        r_list = requests.get(f"{BASE_URL}/prescriptions/customer/{customer_id}", headers=optician_1_headers)
        results.record('', '', "GET /prescriptions/customer/{id} as optician_1", r_list.status_code == 200)

        # C. Get active prescription
        r_active = requests.get(f"{BASE_URL}/prescriptions/customer/{customer_id}/active", headers=optician_1_headers)
        results.record('', '', "GET /prescriptions/customer/{id}/active as optician_1", r_active.status_code == 200)

    # D. Get prescription details
    if presc_id:
        r_detail = requests.get(f"{BASE_URL}/prescriptions/{presc_id}", headers=optician_1_headers)
        results.record('', '', "GET /prescriptions/{id} as optician_1", r_detail.status_code == 200)

        # E. Update prescription
        r_update = requests.put(f"{BASE_URL}/prescriptions/{presc_id}", json={"notes": "Updated notes"}, headers=optician_1_headers)
        results.record('', '', "PUT /prescriptions/{id} as optician_1", r_update.status_code == 200)

        # F. Delete prescription (expects 204 or 200)
        r_delete = requests.delete(f"{BASE_URL}/prescriptions/{presc_id}", headers=optician_1_headers)
        results.record('', '', "DELETE /prescriptions/{id} as optician_1", r_delete.status_code in [200, 204])

    print("\n--- 2. Stock Transfers Endpoints ---")
    if product_id and store_id:
        # A. Record a purchase
        purchase_payload = {
            "product_id": product_id,
            "quantity": 20,
            "purchase_price": 500.0,
            "owner_type": "ADMIN",
            "owner_id": 1,
            "remarks": "Initial testing purchase"
        }
        r_pur = requests.post(f"{BASE_URL}/transfers/purchase", json=purchase_payload, headers=admin_1_headers)
        results.record('', '', "POST /transfers/purchase as admin_1", r_pur.status_code in [200, 201])

        # B. Transfer stock
        transfer_payload = {
            "from_owner_type": "ADMIN",
            "from_owner_id": 1,
            "to_owner_type": "STORE",
            "to_owner_id": store_id,
            "product_id": product_id,
            "quantity": 5,
            "remarks": "Transfer to store branch"
        }
        r_trans = requests.post(f"{BASE_URL}/transfers/transfer", json=transfer_payload, headers=admin_1_headers)
        results.record('', '', "POST /transfers/transfer as admin_1", r_trans.status_code in [200, 201])

        # C. Get transaction history
        r_hist = requests.get(f"{BASE_URL}/transfers/history?product_id={product_id}", headers=admin_1_headers)
        results.record('', '', "GET /transfers/history as admin_1", r_hist.status_code == 200)

    print("\n--- 3. Notifications Endpoints ---")
    # A. Get my notifications
    r_notif = requests.get(f"{BASE_URL}/api/notifications/", headers=worker_1_headers)
    results.record('', '', "GET /api/notifications/ as worker_1", r_notif.status_code == 200)
    notif_data = safe_json(r_notif)
    notifications = notif_data.get("notifications", [])
    
    # B. Read all notifications
    r_read_all = requests.put(f"{BASE_URL}/api/notifications/read-all", headers=worker_1_headers)
    results.record('', '', "PUT /api/notifications/read-all as worker_1", r_read_all.status_code == 200)

    if notifications:
        notif_id = notifications[0].get("id")
        # C. Mark single notification as read
        r_read_single = requests.put(f"{BASE_URL}/api/notifications/{notif_id}/read", headers=worker_1_headers)
        results.record('', '', "PUT /api/notifications/{id}/read as worker_1", r_read_single.status_code == 200)

if __name__ == "__main__":
    run_tests()
    all_passed = results.summary()
    sys.exit(0 if all_passed else 1)
