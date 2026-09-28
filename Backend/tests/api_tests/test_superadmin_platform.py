import sys
import os
import requests

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from auth_helper import get_headers, TestResults
from config import BASE_URL


def run_platform_tests():
    results = TestResults("SuperAdmin Platform System Tests")
    print("========================================")
    print("   SUPERADMIN PLATFORM SYSTEM TESTS")
    print("========================================")

    h_sa = get_headers('superadmin')
    if not h_sa:
        print("Failed to get credentials for SuperAdmin")
        results.add_failure("SuperAdmin Login")
        return

    # 1. Dashboard stats
    print("\n--- Testing GET /superadmin/dashboard/stats ---")
    resp = requests.get(f"{BASE_URL}/superadmin/dashboard/stats", headers=h_sa)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Total Tenants: {data['tenants']['total']}, Active Stores: {data['stores']['active']}, GMV: {data['economics']['gmv']}")
        results.add_success("GET /superadmin/dashboard/stats")
    else:
        print(f"Failed stats: {resp.status_code} {resp.text}")
        results.add_failure("GET /superadmin/dashboard/stats")

    # 2. Dashboard recent activity
    print("\n--- Testing GET /superadmin/dashboard/recent-activity ---")
    resp = requests.get(f"{BASE_URL}/superadmin/dashboard/recent-activity", headers=h_sa)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Recent Tenants: {len(data['recent_tenants'])}, Recent Sales: {len(data['recent_sales'])}")
        results.add_success("GET /superadmin/dashboard/recent-activity")
    else:
        results.add_failure("GET /superadmin/dashboard/recent-activity")

    # 3. Analytics Overview
    print("\n--- Testing GET /superadmin/analytics/overview ---")
    resp = requests.get(f"{BASE_URL}/superadmin/analytics/overview?days=30", headers=h_sa)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Period GMV: {data['period']['gmv']}, Invoices: {data['period']['invoices']}")
        results.add_success("GET /superadmin/analytics/overview")
    else:
        results.add_failure("GET /superadmin/analytics/overview")

    # 4. Analytics Revenue Trends
    print("\n--- Testing GET /superadmin/analytics/revenue-trends ---")
    resp = requests.get(f"{BASE_URL}/superadmin/analytics/revenue-trends?interval=month", headers=h_sa)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Revenue Trend data points: {len(data)}")
        results.add_success("GET /superadmin/analytics/revenue-trends")
    else:
        results.add_failure("GET /superadmin/analytics/revenue-trends")

    # 5. Analytics Tenant Health
    print("\n--- Testing GET /superadmin/analytics/tenant-health ---")
    resp = requests.get(f"{BASE_URL}/superadmin/analytics/tenant-health", headers=h_sa)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Active Tenants: {data['summary']['active_tenants']}, Thriving: {data['summary']['thriving_tenants']}")
        results.add_success("GET /superadmin/analytics/tenant-health")
    else:
        results.add_failure("GET /superadmin/analytics/tenant-health")

    # 6. Analytics Geographic
    print("\n--- Testing GET /superadmin/analytics/geographic ---")
    resp = requests.get(f"{BASE_URL}/superadmin/analytics/geographic", headers=h_sa)
    if resp.status_code == 200:
        data = resp.json()
        print(f"States: {len(data['states'])}, Top cities: {len(data['top_cities'])}")
        results.add_success("GET /superadmin/analytics/geographic")
    else:
        results.add_failure("GET /superadmin/analytics/geographic")

    # 7. Analytics Optical Catalog
    print("\n--- Testing GET /superadmin/analytics/categories-brands ---")
    resp = requests.get(f"{BASE_URL}/superadmin/analytics/categories-brands", headers=h_sa)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Categories: {len(data['categories'])}, Brands: {len(data['top_brands'])}")
        results.add_success("GET /superadmin/analytics/categories-brands")
    else:
        results.add_failure("GET /superadmin/analytics/categories-brands")

    # 8. Cross-tenant Stores Directory
    print("\n--- Testing GET /superadmin/stores ---")
    resp = requests.get(f"{BASE_URL}/superadmin/stores?page=1&limit=5", headers=h_sa)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Total stores: {data['total']}, Returned: {len(data['items'])}")
        results.add_success("GET /superadmin/stores")
    else:
        results.add_failure("GET /superadmin/stores")

    # 9. Tenant 360 overview for admin 1
    print("\n--- Testing GET /superadmin/admins/1/overview ---")
    resp = requests.get(f"{BASE_URL}/superadmin/admins/1/overview", headers=h_sa)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Admin 1 Business: {data['admin']['business_name']}, Stores: {data['stores_count']}, Staff: {data['staff_count']['total']}")
        results.add_success("GET /superadmin/admins/1/overview")
    else:
        results.add_failure("GET /superadmin/admins/1/overview")

    # 10. Tenant Stores
    print("\n--- Testing GET /superadmin/admins/1/stores ---")
    resp = requests.get(f"{BASE_URL}/superadmin/admins/1/stores", headers=h_sa)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Admin 1 Stores: {len(data['stores'])}")
        results.add_success("GET /superadmin/admins/1/stores")
    else:
        results.add_failure("GET /superadmin/admins/1/stores")

    # 11. Tenant Staff
    print("\n--- Testing GET /superadmin/admins/1/staff ---")
    resp = requests.get(f"{BASE_URL}/superadmin/admins/1/staff", headers=h_sa)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Admin 1 Staff list: {len(data['staff'])}")
        results.add_success("GET /superadmin/admins/1/staff")
    else:
        results.add_failure("GET /superadmin/admins/1/staff")

    # 12. Global Role Permissions Matrix
    print("\n--- Testing GET /superadmin/permissions/global ---")
    resp = requests.get(f"{BASE_URL}/superadmin/permissions/global", headers=h_sa)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Total permissions: {data['total_permissions']}, Roles: {data['roles']}")
        results.add_success("GET /superadmin/permissions/global")
    else:
        results.add_failure("GET /superadmin/permissions/global")

    # 13. SuperAdmin Settings Profile & Health
    print("\n--- Testing GET /superadmin/settings/profile & system-health ---")
    resp = requests.get(f"{BASE_URL}/superadmin/settings/profile", headers=h_sa)
    if resp.status_code == 200:
        results.add_success("GET /superadmin/settings/profile")
    else:
        results.add_failure("GET /superadmin/settings/profile")

    resp2 = requests.get(f"{BASE_URL}/superadmin/settings/system-health", headers=h_sa)
    if resp2.status_code == 200:
        print(f"System health: {resp2.json()['status']}")
        results.add_success("GET /superadmin/settings/system-health")
    else:
        results.add_failure("GET /superadmin/settings/system-health")

    # 14. Impersonate Tenant
    print("\n--- Testing POST /superadmin/admins/1/impersonate ---")
    resp = requests.post(f"{BASE_URL}/superadmin/admins/1/impersonate", headers=h_sa)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Impersonation token received for {data['admin']['business_name']}")
        results.add_success("POST /superadmin/admins/1/impersonate")
    else:
        results.add_failure("POST /superadmin/admins/1/impersonate")

    # 15. Security Check: Normal Admin attempting SuperAdmin endpoint -> Must return 403 Forbidden!
    print("\n--- Security Check: Admin 1 trying SuperAdmin endpoint ---")
    h_admin = get_headers('admin_1')
    sec_resp = requests.get(f"{BASE_URL}/superadmin/dashboard/stats", headers=h_admin)
    if sec_resp.status_code == 403:
        print("Forbidden as expected! Admin cannot access SuperAdmin API.")
        results.add_success("Security Isolation (Non-SuperAdmin 403)")
    else:
        print(f"Security failure: expected 403, got {sec_resp.status_code}")
        results.add_failure("Security Isolation (Non-SuperAdmin 403)")

    results.summary()
    if results.failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_platform_tests()
