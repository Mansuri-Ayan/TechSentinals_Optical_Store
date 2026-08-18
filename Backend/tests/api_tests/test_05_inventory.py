import sys
import os
import json
import requests

# Add the script directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import config
BASE_URL = f"{config.BASE_URL}/inventory"
from auth_helper import get_headers, TestResults, safe_json, extract_list

def test_inventory():
    print("========================================")
    print("Testing Inventory Operations")
    print("========================================")
    
    results = TestResults("Inventory Tests")
    
    # Pre-requisite: Get products
    admin_headers = get_headers("admin_1")
    manager_headers = get_headers("manager_1")
    worker_headers = get_headers("worker_1")
    optician_headers = get_headers("optician_1")
    
    products_resp = requests.get(f"{config.BASE_URL}/products/", headers=admin_headers)
    products = extract_list(safe_json(products_resp))
    if not products:
        print("No products found, creating one for inventory tests...")
        prod_data = {
            "name": "Test Frame",
            "type": "FRAME",
            "selling_price": 1000,
            "cost_price": 500,
            "status": "ACTIVE"
        }
        prod_resp = requests.post(f"{config.BASE_URL}/products/", headers=admin_headers, json=prod_data)
        products = extract_list(safe_json(prod_resp))
    product_id = products[0]["id"] if products and isinstance(products[0], dict) else None
    
    stores_resp = requests.get(f"{config.BASE_URL}/stores/", headers=admin_headers)
    stores = extract_list(safe_json(stores_resp))
    if not stores:
        print("No stores found, creating one for inventory tests...")
        store_data = {
            "store_name": "Inventory Test Store",
            "phone": "9999999999",
            "address": "123 Test St",
            "city": "Test City",
            "state": "TS",
            "pincode": "123456"
        }
        store_resp = requests.post(f"{config.BASE_URL}/stores/", headers=admin_headers, json=store_data)
        stores = extract_list(safe_json(store_resp))
    store_id = stores[0]["id"] if stores and isinstance(stores[0], dict) else None

    # 1. List inventory as admin
    print("\n1. List inventory as admin (admin_1)")
    resp = requests.get(f"{BASE_URL}/?owner_type=ADMIN", headers=admin_headers)
    results.check("List inventory (Admin)", resp.status_code == 200)
    inventory_items = extract_list(safe_json(resp))
    
    # 2. List inventory as manager
    print("\n2. List inventory as manager (manager_1)")
    resp = requests.get(f"{BASE_URL}/?owner_type=STORE&owner_id={store_id}" if store_id else f"{BASE_URL}/?owner_type=STORE", headers=manager_headers)
    results.check("List inventory (Manager)", resp.status_code == 200)

    # 3. List inventory as worker/optician
    print("\n3. List inventory as worker/optician")
    resp_w = requests.get(f"{BASE_URL}/?owner_type=STORE&owner_id={store_id}" if store_id else f"{BASE_URL}/?owner_type=STORE", headers=worker_headers)
    results.check("List inventory (Worker)", resp_w.status_code in (200, 403))
    resp_o = requests.get(f"{BASE_URL}/?owner_type=STORE&owner_id={store_id}" if store_id else f"{BASE_URL}/?owner_type=STORE", headers=optician_headers)
    results.check("List inventory (Optician)", resp_o.status_code in (200, 403))

    # 4. Warehouse inventory
    print("\n4. Warehouse inventory")
    resp = requests.get(f"{BASE_URL}/warehouse", headers=admin_headers)
    results.check("Warehouse inventory (Admin)", resp.status_code == 200)

    # 5. Low stock
    print("\n5. Low stock")
    resp_a = requests.get(f"{BASE_URL}/low-stock", headers=admin_headers)
    results.check("Low stock (Admin)", resp_a.status_code == 200)
    resp_m = requests.get(f"{BASE_URL}/low-stock", headers=manager_headers)
    results.check("Low stock (Manager)", resp_m.status_code in (200, 403))

    # 6. Universal search
    print("\n6. Universal search")
    resp = requests.get(f"{BASE_URL}/universal?owner_type=STORE&search=test", headers=admin_headers)
    results.check("Universal search", resp.status_code == 200)

    # 8. Create inventory (Admin only)
    print("\n8. Create inventory (admin only)")
    inv_data = {
        "owner_type": "STORE",
        "owner_id": store_id,
        "product_id": product_id,
        "quantity": 10,
        "selling_price": 1000.0,
        "reorder_level": 5
    }
    resp = requests.post(f"{BASE_URL}/", headers=admin_headers, json=inv_data)
    results.check("Create inventory (Admin)", resp.status_code in (200, 201))
    
    inv_data_created = safe_json(resp)
    inv_id = inv_data_created.get("id") if isinstance(inv_data_created, dict) and "id" in inv_data_created else None
    
    if not inv_id and inventory_items:
        inv_id = inventory_items[0].get("id")

    print(f"Manager create inventory behavior")
    resp_m_create = requests.post(f"{BASE_URL}/", headers=manager_headers, json=inv_data)
    results.check("Create inventory (Manager behavior)", resp_m_create.status_code in (403, 200, 201))

    if inv_id:
        # 7. Single inventory
        print("\n7. Single inventory")
        resp_get = requests.get(f"{BASE_URL}/{inv_id}", headers=admin_headers)
        results.check("Get single inventory", resp_get.status_code == 200)
        
        resp_batches = requests.get(f"{BASE_URL}/{inv_id}/batches", headers=admin_headers)
        results.check("Get inventory batches", resp_batches.status_code == 200)

        # 9. Update inventory
        print("\n9. Update inventory")
        update_data = {"reorder_level": 10}
        resp_update = requests.put(f"{BASE_URL}/{inv_id}", headers=admin_headers, json=update_data)
        results.check("Update inventory", resp_update.status_code == 200)
    else:
        print("Skipping specific inventory tests, ID not available")

    # 10. Product units
    print("\n10. Product units")
    # Using generic units endpoint if exists or search
    resp_units = requests.get(f"{BASE_URL}/product-units/", headers=admin_headers)
    results.check("List product units", resp_units.status_code in (200, 404))
    
    resp_lookup = requests.get(f"{BASE_URL}/product-units/lookup/DUMMY_SKU", headers=admin_headers)
    results.check("Lookup unit by SKU", resp_lookup.status_code in (200, 404))

    # 11. Barcode PDF
    print("\n11. Barcode PDF")
    barcode_payload = {"product_id": product_id, "inventory_batch_id": inv_id or 1}
    resp_barcode = requests.post(f"{BASE_URL}/product-units/barcode-pdf", headers=admin_headers, json=barcode_payload)
    results.check("Generate barcode PDF", resp_barcode.status_code == 200)

    results.summary()
    sys.exit(0 if results.failures == 0 else 1)

if __name__ == "__main__":
    test_inventory()
