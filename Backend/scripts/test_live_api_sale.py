import json
import sys
import os
import urllib.request
import urllib.error
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from core.security import create_access_token

# Generate fresh valid token for admin_id=1
token = create_access_token({"sub": "1", "role": "admin"})

payload = {
    "store_id": 1,
    "customer_id": 1,
    "sold_by_type": "MANAGER",
    "sold_by_id": 1,
    "sale_date": "2026-09-09",
    "items": [
        {
            "product_id": 1,
            "quantity": 1,
            "unit_price": 1200.0,
            "tax_percent": 10.0,
            "discount_percent": 0.0
        }
    ],
    "payments": [
        {
            "amount": 1320.0,
            "payment_method": "CASH"
        }
    ]
}

req = urllib.request.Request(
    "http://127.0.0.1:8000/sales/",
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req) as resp:
        body = resp.read().decode("utf-8")
        data = json.loads(body)
        print("POST /sales/ SUCCEEDED with HTTP", resp.status)
        print("Invoice Number:", data.get("invoice_number"))
        print("Subtotal:", data.get("subtotal"))
        print("Tax Amount:", data.get("tax_amount"))
        print("Total Amount:", data.get("total_amount"))
        items = data.get("items", [])
        if items:
            item = items[0]
            print("Item 1 - Unit Price Before GST:", item.get("unit_price_before_gst"))
            print("Item 1 - GST Amount:", item.get("gst_amount"))
            print("Item 1 - Unit Price With GST:", item.get("unit_price_with_gst"))
            print("Item 1 - Quantity:", item.get("quantity"))
except urllib.error.HTTPError as e:
    err_body = e.read().decode("utf-8")
    print(f"HTTP ERROR {e.code}: {err_body}")
except Exception as e:
    print(f"ERROR: {e}")
