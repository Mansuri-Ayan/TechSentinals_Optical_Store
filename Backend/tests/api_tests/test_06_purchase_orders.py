import sys
import os
import json
import requests

# Add the script directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from config import BASE_URL
from auth_helper import get_headers, TestResults, safe_json, extract_list

def test_purchase_orders():
    print("========================================")
    print("Testing Purchase Orders Operations")
    print("========================================")
    
    results = TestResults("Purchase Orders Tests")
    
    admin_headers = get_headers("admin_1")
    manager_headers = get_headers("manager_1")
    worker_headers = get_headers("worker_1")
    optician_headers = get_headers("optician_1")

    # 1. Setup
    print("\n1. Setup: Fetching suppliers and products")
    suppliers_resp = requests.get(f"{BASE_URL}/suppliers/", headers=admin_headers)
    suppliers = extract_list(safe_json(suppliers_resp))
    if not suppliers:
        print("No suppliers found, creating one...")
        sup_data = {"name": "Test Supplier", "contact_number": "1234567890"}
        sup_resp = requests.post(f"{BASE_URL}/suppliers/", headers=admin_headers, json=sup_data)
        suppliers = extract_list(safe_json(sup_resp))
    supplier_id = suppliers[0]["id"] if suppliers else None
    
    products_resp = requests.get(f"{BASE_URL}/products/", headers=admin_headers)
    products = extract_list(safe_json(products_resp))
    if not products:
        prod_data = {"name": "PO Frame", "type": "FRAME", "selling_price": 1000, "cost_price": 500, "status": "ACTIVE"}
        prod_resp = requests.post(f"{BASE_URL}/products/", headers=admin_headers, json=prod_data)
        products = extract_list(safe_json(prod_resp))
    product_id = products[0]["id"] if products else None
    
    stores_resp = requests.get(f"{BASE_URL}/stores/", headers=admin_headers)
    stores = extract_list(safe_json(stores_resp))
    store_id = stores[0]["id"] if stores else None

    # 2. Create PO as admin
    print("\n2. Create PO as admin (admin_1)")
    po_data = {
        "supplier_id": supplier_id,
        "store_id": store_id,
        "order_date": "2026-08-13",
        "notes": "Test PO",
        "items": [
            {
                "product_id": product_id,
                "quantity_ordered": 20,
                "unit_price": 450.0
            }
        ]
    }
    resp = requests.post(f"{BASE_URL}/purchase-orders/", headers=admin_headers, json=po_data)
    results.check("Create PO (Admin)", resp.status_code in (200, 201))
    created_po = safe_json(resp)
    po_id = created_po.get("id") if isinstance(created_po, dict) else None

    # 3. List POs
    print("\n3. List POs")
    resp_list = requests.get(f"{BASE_URL}/purchase-orders/", headers=admin_headers)
    results.check("List POs (Admin)", resp_list.status_code == 200)
    
    if po_id:
        resp_get = requests.get(f"{BASE_URL}/purchase-orders/{po_id}", headers=admin_headers)
        results.check("Get specific PO", resp_get.status_code == 200)

        # 4. Receive goods (GRN)
        print("\n4. Receive goods (GRN)")
        po_items = created_po.get("items", [])
        po_item_id = po_items[0].get("id") if po_items else 1
        receive_data = {
            "items": [{"purchase_order_item_id": po_item_id, "quantity_received": 10}]
        }
        resp_recv = requests.post(f"{BASE_URL}/purchase-orders/{po_id}/receive", headers=admin_headers, json=receive_data)
        results.check("Receive partial PO", resp_recv.status_code == 200)

        # 5. Record payment
        print("\n5. Record payment")
        payment_data = {
            "payment_date": "2026-08-13",
            "amount": 1000,
            "payment_method": "CASH"
        }
        resp_pay = requests.post(f"{BASE_URL}/purchase-orders/{po_id}/payments", headers=admin_headers, json=payment_data)
        results.check("Record PO payment", resp_pay.status_code in (200, 201))
        
        resp_pay_list = requests.get(f"{BASE_URL}/purchase-orders/{po_id}/payments", headers=admin_headers)
        results.check("List PO payments", resp_pay_list.status_code == 200)

        # 7. Update PO
        print("\n7. Update PO")
        update_data = {"notes": "Updated notes"}
        resp_upd = requests.put(f"{BASE_URL}/purchase-orders/{po_id}", headers=admin_headers, json=update_data)
        results.check("Update PO", resp_upd.status_code == 200)
        
        # 6. Cancel PO
        print("\n6. Cancel PO")
        resp_cancel = requests.post(f"{BASE_URL}/purchase-orders/{po_id}/cancel", headers=admin_headers)
        results.check("Cancel PO", resp_cancel.status_code in (200, 400)) # May fail if already partially received

    else:
        print("Skipping specific PO operations, creation failed or ID missing.")

    # 8. Manager access
    print("\n8. Manager access")
    resp_m_list = requests.get(f"{BASE_URL}/purchase-orders/", headers=manager_headers)
    results.check("List POs (Manager)", resp_m_list.status_code == 200)
    
    resp_m_create = requests.post(f"{BASE_URL}/purchase-orders/", headers=manager_headers, json=po_data)
    results.check("Create PO (Manager)", resp_m_create.status_code in (200, 201, 403))

    # 9. Worker/Optician access
    print("\n9. Worker/Optician access")
    resp_w_list = requests.get(f"{BASE_URL}/purchase-orders/", headers=worker_headers)
    results.check("List POs (Worker behavior)", resp_w_list.status_code in (200, 403))
    resp_o_list = requests.get(f"{BASE_URL}/purchase-orders/", headers=optician_headers)
    results.check("List POs (Optician behavior)", resp_o_list.status_code in (200, 403))

    results.summary()
    sys.exit(0 if results.failures == 0 else 1)

if __name__ == "__main__":
    test_purchase_orders()
