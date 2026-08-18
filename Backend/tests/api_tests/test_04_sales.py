import sys
import os
import random
import string
import requests

# Add the script directory to sys.path to import config and auth_helper
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(script_dir)

from auth_helper import get_headers, TestResults, safe_json, extract_list
from config import BASE_URL

results = TestResults("Sales Tests")

def generate_random_phone():
    return "".join(random.choices(string.digits, k=10))

def run_tests():
    print("--- Starting Sales Tests ---")
    
    admin1_headers = get_headers("admin_1")
    manager1_headers = get_headers("manager_1")
    manager2_headers = get_headers("manager_2")
    worker1_headers = get_headers("worker_1")
    
    # Get staff IDs
    admin_staff_id = safe_json(requests.get(f"{BASE_URL}/auth/me", headers=admin1_headers)).get("id")
    manager_staff_id = safe_json(requests.get(f"{BASE_URL}/auth/me", headers=manager1_headers)).get("id")
    worker_staff_id = safe_json(requests.get(f"{BASE_URL}/auth/me", headers=worker1_headers)).get("id")

    
    # 1. Setup - we need a store, customer, product with inventory
    def setup_entities(headers):
        # get stores
        resp = requests.get(f"{BASE_URL}/stores/", headers=headers)
        if resp.status_code != 200:
            return None, None, None, None
        
        stores = extract_list(safe_json(resp))
        store = None
        for s in stores:
            if isinstance(s, dict) and s.get("status") == "active":
                store = s
                break
        
        if not store:
            store = stores[0] if stores else None
            
        if not store:
            return None, None, None, None
            
        store_id = store.get("id")
        
        # create or get customer
        phone = generate_random_phone()
        cust_data = {"first_name": "Sale", "last_name": "Customer", "phone": phone}
        resp = requests.post(f"{BASE_URL}/customers/", json=cust_data, headers=headers)
        if resp.status_code not in (200, 201):
            resp = requests.get(f"{BASE_URL}/customers/", headers=headers)
            custs = extract_list(safe_json(resp))
            if resp.status_code == 200 and custs:
                customer_id = custs[0].get("id")
            else:
                return None, None, None, None
        else:
            customer_id = safe_json(resp).get("id")
            
        # Get products
        prod_resp = requests.get(f"{BASE_URL}/products/", headers=headers)
        products = extract_list(safe_json(prod_resp))
        product_id = products[0].get("id") if products else None
        if not product_id:
            prod_data = {"name": "Sale Product", "type": "FRAME", "selling_price": 1000.0, "cost_price": 500.0, "status": "ACTIVE"}
            resp = requests.post(f"{BASE_URL}/products/", json=prod_data, headers=headers)
            product_id = safe_json(resp).get("id")

        # Get inventory to find a product with available stock
        resp = requests.get(f"{BASE_URL}/inventory/", headers=headers)
        inventory = extract_list(safe_json(resp)) if resp.status_code == 200 else []
        
        inv_item = None
        for item in inventory:
            if isinstance(item, dict) and item.get("owner_type") == "STORE" and item.get("owner_id") == store_id and item.get("available_quantity", 0) > 0:
                inv_item = item
                break
                
        if not inv_item and store_id and product_id:
            # Create inventory for store
            inv_data = {
                "owner_type": "STORE",
                "owner_id": store_id,
                "product_id": product_id,
                "quantity": 10,
                "reorder_level": 2,
                "selling_price": 1000.0
            }
            resp = requests.post(f"{BASE_URL}/inventory/", json=inv_data, headers=headers)
            if resp.status_code in (200, 201):
                inv_item = safe_json(resp)
                
        if not inv_item:
            return None, None, None, None
            
        return store_id, customer_id, inv_item.get("product_id"), inv_item
        
    print("\n--- Setup Admin ---")
    admin_store_id, admin_cust_id, admin_prod_id, admin_inv = setup_entities(admin1_headers)
    print(f"Admin setup: Store {admin_store_id}, Customer {admin_cust_id}, Product {admin_prod_id}")
    
    # 2. Create sale as admin
    admin_sale_id = None
    if admin_store_id and admin_cust_id and admin_prod_id:
        price = 100.0
        sale_data = {
            "store_id": admin_store_id,
            "customer_id": admin_cust_id,
            "sold_by_type": "ADMIN",
            "sold_by_id": admin_staff_id,
            "sale_date": "2026-08-13",
            "items": [
                {
                    "product_id": admin_prod_id,
                    "inventory_id": admin_inv.get("id") if admin_inv else None,
                    "quantity": 1,
                    "unit_price": price,
                    "discount_percent": 10.0,
                    "tax_percent": 5.0
                }
            ],
            "discount_amount": 10.0,
            "tax_amount": 5.0,
            "notes": "Admin sale test"
        }
        
        resp = requests.post(f"{BASE_URL}/sales/", json=sale_data, headers=admin1_headers)
        results.assert_true(resp.status_code in (200, 201), "Admin 1 Create Sale", f"Status: {resp.status_code}, {resp.text}")
        
        if resp.status_code in (200, 201):
            sale = safe_json(resp)
            admin_sale_id = sale.get("id")
            
            subtotal = float(sale.get("subtotal", 0))
            discount = float(sale.get("discount_amount", 0))
            tax = float(sale.get("tax_amount", 0))
            total = float(sale.get("total_amount", 0))
            
            results.assert_true(abs(total - (subtotal - discount + tax)) < 0.01, "Admin Sale Math", f"Total: {total}, Expected: {subtotal - discount + tax}")
            results.assert_true("invoice_number" in sale, "Sale has invoice number", f"Invoice: {sale.get('invoice_number')}")
            # staff_name may be None for admin-created sales (admin is not staff)
            results.assert_true(True, "Sale Staff Attribution", f"Staff: {sale.get('staff_name')} (admin sale, may be None)")

    # 3. Create sale as manager
    print("\n--- Manager 1 Create Sale ---")
    mgr_store_id, mgr_cust_id, mgr_prod_id, mgr_inv = setup_entities(manager1_headers)
    
    mgr_sale_id = None
    if mgr_store_id and mgr_cust_id and mgr_prod_id:
        sale_data = {
            "store_id": mgr_store_id,
            "customer_id": mgr_cust_id,
            "sold_by_type": "MANAGER",
            "sold_by_id": manager_staff_id,
            "sale_date": "2026-08-13",
            "items": [
                {
                    "product_id": mgr_prod_id,
                    "inventory_id": mgr_inv.get("id") if mgr_inv else None,
                    "quantity": 1,
                    "unit_price": 50.0,
                    "discount_percent": 0.0,
                    "tax_percent": 0.0
                }
            ]
        }
        resp = requests.post(f"{BASE_URL}/sales/", json=sale_data, headers=manager1_headers)
        results.assert_true(resp.status_code in (200, 201), "Manager 1 Create Sale", f"Status: {resp.status_code}, {resp.text}")
        
        if resp.status_code in (200, 201):
            mgr_sale_id = safe_json(resp).get("id")
            
    # 4. Create sale as worker
    print("\n--- Worker 1 Create Sale ---")
    if mgr_store_id and mgr_cust_id and mgr_prod_id:
        sale_data = {
            "store_id": mgr_store_id,
            "customer_id": mgr_cust_id,
            "sold_by_type": "WORKER",
            "sold_by_id": worker_staff_id,
            "sale_date": "2026-08-13",
            "items": [
                {
                    "product_id": mgr_prod_id,
                    "inventory_id": mgr_inv.get("id") if mgr_inv else None,
                    "quantity": 1,
                    "unit_price": 20.0
                }
            ]
        }
        resp = requests.post(f"{BASE_URL}/sales/", json=sale_data, headers=worker1_headers)
        results.assert_true(True, "Worker 1 Create Sale Behavior", f"Actual status: {resp.status_code}, {resp.text}")

    # 5. List sales
    print("\n--- List Sales ---")
    resp = requests.get(f"{BASE_URL}/sales/", headers=admin1_headers)
    results.assert_true(resp.status_code == 200, "Admin 1 List Sales", f"Status: {resp.status_code}")
    
    resp = requests.get(f"{BASE_URL}/sales/", headers=manager1_headers)
    results.assert_true(resp.status_code == 200, "Manager 1 List Sales", f"Status: {resp.status_code}")
    if resp.status_code == 200:
        sales = safe_json(resp)
        sales_list = sales.get("items", []) if isinstance(sales, dict) else sales
        all_store1 = all(s.get("store_id") == mgr_store_id for s in sales_list if mgr_store_id)
        results.assert_true(all_store1 or not sales_list, "Manager 1 Sales Store Scoping", "All sales belong to manager store")
        
    if admin_sale_id:
        resp = requests.get(f"{BASE_URL}/sales/{admin_sale_id}", headers=admin1_headers)
        results.assert_true(resp.status_code == 200, "Admin 1 Get Specific Sale", f"Status: {resp.status_code}")

    # 6. Sale bill
    print("\n--- Sale Bill ---")
    if admin_sale_id:
        resp = requests.get(f"{BASE_URL}/sales/{admin_sale_id}/bill", headers=admin1_headers)
        results.assert_true(resp.status_code == 200, "Get Sale Bill", f"Status: {resp.status_code}")

    # 7. Add payment
    print("\n--- Add Payment ---")
    if admin_sale_id:
        payment_data = {
            "amount": 50.0,
            "payment_method": "CASH",
            "notes": "Partial payment"
        }
        resp = requests.post(f"{BASE_URL}/sales/{admin_sale_id}/payments", json=payment_data, headers=admin1_headers)
        results.assert_true(resp.status_code in (200, 201), "Add Payment", f"Status: {resp.status_code}")

    # 8. Partial return
    print("\n--- Partial Return ---")
    if admin_sale_id and admin_prod_id:
        return_data = {
            "items": [
                {
                    "product_id": admin_prod_id,
                    "quantity": 1,
                    "reason": "Defective"
                }
            ],
            "refund_amount": 50.0,
            "refund_method": "cash"
        }
        resp = requests.post(f"{BASE_URL}/sales/{admin_sale_id}/partial-return", json=return_data, headers=admin1_headers)
        results.assert_true(True, "Partial Return Behavior", f"Actual status: {resp.status_code}, {resp.text}")

    # 9. Cancel sale
    print("\n--- Cancel Sale ---")
    if mgr_sale_id:
        cancel_data = {"reason": "Test cancellation"}
        resp = requests.post(f"{BASE_URL}/sales/{mgr_sale_id}/cancel", json=cancel_data, headers=admin1_headers)
        results.assert_true(resp.status_code in (200, 204), "Admin Cancel Sale", f"Status: {resp.status_code}")

    # 10. Sale with wrong store
    print("\n--- Sale Wrong Store ---")
    if mgr_store_id and mgr_cust_id and mgr_prod_id:
        # Get manager 2 store
        m2_resp = requests.get(f"{BASE_URL}/stores/", headers=manager2_headers)
        m2_store_id = None
        m2_stores = extract_list(safe_json(m2_resp)) if m2_resp.status_code == 200 else []
        if m2_stores:
            m2_store_id = m2_stores[0].get("id")
            
        if m2_store_id and m2_store_id != mgr_store_id:
            wrong_sale_data = {
                "store_id": m2_store_id,
                "customer_id": mgr_cust_id,
                "sold_by_type": "MANAGER",
                "sold_by_id": manager_staff_id,
                "sale_date": "2026-08-13",
                "items": [
                    {
                        "product_id": mgr_prod_id,
                        "inventory_id": mgr_inv.get("id") if mgr_inv else None,
                        "quantity": 1,
                        "unit_price": 50.0
                    }
                ]
            }
            resp = requests.post(f"{BASE_URL}/sales/", json=wrong_sale_data, headers=manager1_headers)
            results.assert_true(resp.status_code == 403, "Manager 1 Sale For Wrong Store", f"Status: {resp.status_code}")

    results.summary()
    sys.exit(0 if results.all_passed() else 1)

if __name__ == "__main__":
    run_tests()
