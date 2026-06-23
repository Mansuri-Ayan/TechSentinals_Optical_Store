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
    print("Logging in as admin...")
    code, data = api("POST", "/auth/login/admin", {
        "email": "ayan@visionary.in",
        "password": "Admin@123",
    })
    if code != 200:
        print(f"Failed to login: {data}")
        sys.exit(1)
        
    token = data["access_token"]
    print("Login successful!")

    # Test warehouse endpoint
    print("\nTesting GET /inventory/warehouse...")
    code, res = api("GET", "/inventory/warehouse?page=1&limit=5", token=token)
    print(f"Warehouse status: {code}")
    if code == 200:
        print(f"Total: {res.get('total')}, Page: {res.get('page')}, Pages: {res.get('pages')}")
        items = res.get('items', [])
        print(f"Returned {len(items)} items on page 1.")
        # Verify they are all ADMIN warehouse items
        owners = set(item['owner_name'] for item in items)
        print(f"Owner types found: {owners}")
        if any("Admin" not in o for o in owners):
            print("ERROR: Found non-warehouse items in the warehouse endpoint!")
            sys.exit(1)
        else:
            print("SUCCESS: All returned items belong to the warehouse.")
    else:
        print(f"Failed to query warehouse: {res}")
        sys.exit(1)

    # Test out of stock filter on warehouse endpoint
    print("\nTesting out of stock filter on warehouse...")
    code, res_os = api("GET", "/inventory/warehouse?stock_status=out_of_stock", token=token)
    if code == 200:
        print(f"Out of stock count in response: {res_os.get('out_of_stock_count')}")
        items_os = res_os.get('items', [])
        print(f"Returned {len(items_os)} items with available_quantity = 0.")
        if any(item['available_quantity'] != 0 for item in items_os):
            print("ERROR: Found items with quantity > 0 under out_of_stock status!")
            sys.exit(1)
        else:
            print("SUCCESS: Out of stock status filter verified.")
    else:
        print(f"Failed to query out of stock: {res_os}")
        sys.exit(1)

if __name__ == "__main__":
    main()
