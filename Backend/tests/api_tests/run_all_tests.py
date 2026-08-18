import subprocess
import sys
import os
import json
import sys; sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from datetime import datetime
test_dir = os.path.dirname(os.path.abspath(__file__))

test_files = [
    "test_01_auth.py",
    "test_02_permissions.py",
    "test_03_customers.py",
    "test_04_sales.py",
    "test_05_inventory.py",
    "test_06_purchase_orders.py",
    "test_07_loyalty.py",
    "test_08_permissions_enforcement.py",
    "test_09_business_logic.py",
    "test_10_expenses_repairs.py",
    "test_11_remaining.py",
]

results = []
for test_file in test_files:
    filepath = os.path.join(test_dir, test_file)
    if not os.path.exists(filepath):
        print(f"[SKIP] {test_file} (file not found)")
        results.append({"file": test_file, "passed": None, "output": "File not found"})
        continue
    print(f"\n{'='*70}")
    print(f"  Running: {test_file}")
    print(f"{'='*70}")
    result = subprocess.run(
        [sys.executable, filepath],
        capture_output=False, text=True,
        cwd=test_dir,
        timeout=120,
    )
    results.append({
        "file": test_file,
        "passed": result.returncode == 0,
        "returncode": result.returncode,
    })

# Print summary
print(f"\n{'='*70}")
print(f"  FINAL RESULTS")
print(f"{'='*70}")
total_pass = sum(1 for r in results if r.get("passed") is True)
total_fail = sum(1 for r in results if r.get("passed") is False)
total_skip = sum(1 for r in results if r.get("passed") is None)
for r in results:
    if r.get("passed") is True:
        status = "[PASS]"
    elif r.get("passed") is False:
        status = "[FAIL]"
    else:
        status = "[SKIP]"
    print(f"  {status} — {r['file']}")

print(f"\n  Total: {total_pass} passed, {total_fail} failed, {total_skip} skipped")
print(f"  Timestamp: {datetime.now().isoformat()}")
print(f"{'='*70}")
