import json
import urllib.request
import urllib.error
import sys

BASE = "http://127.0.0.1:8000"

def api(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {"detail": str(e.reason)}
    except Exception as e:
        return 500, {"detail": str(e)}

def main():
    print("1. Logging in as manager (Rajesh)...")
    code, data = api("POST", "/auth/login/manager", {
        "email": "rajesh.sharma@visionary.in",
        "password": "Manager@123",
    })
    if code != 200:
        print(f"Failed to login: {data}")
        sys.exit(1)
        
    token = data["access_token"]
    print("Login successful! Token received.")

    # 1. Fetch categories
    print("\n2. Fetching categories as manager...")
    code, categories_data = api("GET", "/categories/?limit=5", token=token)
    print(f"Categories status: {code}")
    if code == 200:
        cats = categories_data.get("items", []) if isinstance(categories_data, dict) else categories_data
        print(f"Found {len(cats)} categories. Names: {[c['name'] for c in cats]}")
    else:
        print(f"Failed to fetch categories: {categories_data}")
        sys.exit(1)

    # 2. Fetch products
    print("\n3. Fetching products as manager...")
    code, products_data = api("GET", "/products/?limit=5", token=token)
    print(f"Products status: {code}")
    if code == 200:
        products = products_data.get("items", []) if isinstance(products_data, dict) else products_data
        print(f"Found {len(products)} products. Names: {[p['name'] for p in products]}")
        product_id = products[0]["id"]
    else:
        print(f"Failed to fetch products: {products_data}")
        sys.exit(1)

    # 3. Fetch admin warehouse inventory
    print("\n4. Fetching admin warehouse inventory as manager...")
    code, inv_data = api("GET", "/inventory/?owner_type=ADMIN&paginate=false", token=token)
    print(f"Admin warehouse inventory status: {code}")
    if code == 200:
        items = inv_data.get("items", []) if isinstance(inv_data, dict) else inv_data
        print(f"Found {len(items)} items in Admin warehouse.")
    else:
        print(f"Failed to fetch admin inventory: {inv_data}")
        sys.exit(1)

    # 4. Record a supplier purchase into manager's own store
    print("\n5. Recording a supplier purchase directly into manager's own store...")
    purchase_payload = {
        "product_id": product_id,
        "quantity": 15,
        "purchase_price": 450.0,
        "remarks": "Manager direct store purchase"
    }
    code, purchase_res = api("POST", "/api/shopkeeper/transactions/purchase", body=purchase_payload, token=token)
    print(f"Manager Purchase status: {code}")
    print(f"Manager Purchase Response: {purchase_res}")

    # 5. Create a transfer request (pull request) from Admin warehouse
    print("\n6. Creating a stock request (pull request) from admin warehouse...")
    request_payload = {
        "product_id": product_id,
        "quantity": 5,
        "from_owner_type": "ADMIN",
        "from_owner_id": 1, # backend overrides to actual admin id
        "remarks": "Manager requesting 5 units from admin warehouse"
    }
    code, request_res = api("POST", "/api/shopkeeper/transactions/request", body=request_payload, token=token)
    print(f"Manager Request status: {code}")
    print(f"Manager Request Response: {request_res}")

    # 6. List transactions for manager
    print("\n7. Listing manager transactions...")
    code, txs = api("GET", "/api/shopkeeper/transactions/", token=token)
    print(f"Transactions list status: {code}")
    if code == 200:
        print(f"List contains {len(txs)} transactions.")
    else:
        print(f"Failed to list transactions: {txs}")

if __name__ == "__main__":
    main()
