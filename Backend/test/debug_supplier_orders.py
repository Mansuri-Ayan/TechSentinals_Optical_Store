"""
debug_supplier_orders.py - Diagnose why Orders to Receive shows 0

Run: python test/debug_supplier_orders.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import requests

BASE = "http://127.0.0.1:8000"

def api(method, path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.request(method, BASE + path, json=body, headers=headers)
    return r.status_code, (r.json() if r.text else {})

# ─── 1. Login ────────────────────────────────────────────────────────────────
code, data = api("POST", "/auth/login/admin", {"email": "ayan@visionary.in", "password": "Admin@123"})
assert code == 200, f"Login failed: {code} {data}"
token = data["access_token"]
print(f"[OK] Logged in")

# ─── 2. Fetch ALL purchase orders (no supplier/store filter) ─────────────────
code, pos = api("GET", "/purchase-orders/?limit=100", token=token)
print(f"\n[POs] status={code}, count={len(pos)}")
for po in pos:
    print(f"  PO #{po['id']:3d}  po_num={po.get('po_number')}  supplier_id={po.get('supplier_id')}  store_id={po.get('store_id')}  status={po.get('status')}  due={po.get('due_amount')}")

# ─── 3. Fetch suppliers (no store_id filter) ─────────────────────────────────
code, suppliers_resp = api("GET", "/suppliers/?limit=100", token=token)
suppliers = suppliers_resp.get("items", []) if isinstance(suppliers_resp, dict) else suppliers_resp
print(f"\n[Suppliers] status={code}, count={len(suppliers)}")
for s in suppliers:
    print(f"  Supplier #{s['id']:3d}  name={s.get('company_name')}")

# ─── 4. Cross-check: which POs match which suppliers ────────────────────────
print("\n[Analysis] Supplier Orders to Receive (PO status not RECEIVED or CANCELLED):")
orders_to_receive = {}
for po in pos:
    sid = po.get("supplier_id")
    st = po.get("status")
    if st not in ("RECEIVED", "CANCELLED"):
        orders_to_receive[sid] = orders_to_receive.get(sid, 0) + 1

for s in suppliers:
    sid = s["id"]
    count = orders_to_receive.get(sid, 0)
    print(f"  Supplier #{sid}  {s.get('company_name')}: {count} orders to receive")

# ─── 5. Fetch suppliers with store_id=1 ─────────────────────────────────────
code, suppliers_store = api("GET", "/suppliers/?limit=100&store_id=1", token=token)
items_store = suppliers_store.get("items", []) if isinstance(suppliers_store, dict) else suppliers_store
print(f"\n[Suppliers with store_id=1] count={len(items_store)}")
for s in items_store:
    sid = s["id"]
    count = orders_to_receive.get(sid, 0)
    print(f"  Supplier #{sid}  {s.get('company_name')}: {count} orders to receive")
