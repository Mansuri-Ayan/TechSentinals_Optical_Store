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
    print("Login successful! Token received.")

    # 1. Fetch products to get a product ID
    print("\nFetching products...")
    code, data = api("GET", "/products/?limit=1", token=token)
    if code != 200:
        print(f"Failed to fetch products: {data}")
        sys.exit(1)
        
    if isinstance(data, dict):
        items = data.get("items", [])
    else:
        items = data
        
    if not items:
        print("No products found in DB.")
        sys.exit(1)
        
    product = items[0]
    product_id = product["id"]
    print(f"Found product: {product['name']} (ID: {product_id})")

    # 2. Test Purchase
    print("\nTesting purchase endpoint (/transfers/purchase)...")
    purchase_payload = {
        "product_id": product_id,
        "quantity": 10,
        "purchase_price": 500.0,
        "remarks": "Scratch test purchase"
    }
    code, data = api("POST", "/transfers/purchase", body=purchase_payload, token=token)
    print(f"Purchase Status: {code}")
    print(f"Purchase Response: {data}")

    # 3. Test Return
    print("\nTesting return endpoint (/transfers/return)...")
    return_payload = {
        "product_id": product_id,
        "owner_type": "ADMIN",
        "owner_id": 1, # Admin ID
        "quantity": 2,
        "remarks": "Scratch test return"
    }
    code, data = api("POST", "/transfers/return", body=return_payload, token=token)
    print(f"Return Status: {code}")
    print(f"Return Response: {data}")

if __name__ == "__main__":
    main()
