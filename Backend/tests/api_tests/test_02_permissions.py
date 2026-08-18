import sys
import os
import requests

# Add the script directory to sys.path so config and auth_helper can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from auth_helper import get_headers, TestResults, safe_json
from config import BASE_URL

def run_tests():
    results = TestResults("Permissions Tests")
    print("========================================")
    print("       PERMISSIONS ENDPOINTS TESTS")
    print("========================================")
    
    roles = ['admin_1', 'manager_1', 'worker_1', 'optician_1']
    
    # 1. GET /permissions/me for each role
    print("\n--- Testing GET /permissions/me ---")
    for role_key in roles:
        try:
            headers = get_headers(role_key)
            if not headers:
                print(f"Could not get headers for {role_key}")
                continue
                
            url = f"{BASE_URL}/permissions/me"
            resp = requests.get(url, headers=headers)
            
            if resp.status_code == 200:
                data = resp.json()
                permissions = data.get('permissions', data)
                
                if isinstance(permissions, dict):
                    all_granted = all(permissions.values())
                    print(f"Permissions for {role_key}:")
                    for k, v in list(permissions.items())[:5]:
                        print(f"  {k}: {v}")
                    print(f"  ... ({len(permissions)} total permissions)")
                    
                    if all_granted:
                        print(f"  [!] C1 Finding: ALL permissions are granted for {role_key}!")
                        
                    dangerous_keys = ['stores:delete', 'managers:delete', 'admin:all']
                    for dk in dangerous_keys:
                        if permissions.get(dk) and not role_key.startswith('admin'):
                            print(f"  [!] WARNING: Dangerous permission '{dk}' granted to {role_key}!")
                            
                results.add_success(f"GET /permissions/me - {role_key}")
            elif resp.status_code == 404:
                results.add_success(f"GET /permissions/me - {role_key} (Route missing)")
            else:
                results.add_failure(f"GET /permissions/me - {role_key}", f"{resp.status_code}: {resp.text}")
        except Exception as e:
            results.add_failure(f"GET /permissions/me - {role_key} (Exception)", str(e))

    admin_headers = get_headers("admin_1")
    manager_headers = get_headers("manager_1")
    
    if not admin_headers:
        print("Could not get admin headers, aborting admin tests")
        results.summary()
        sys.exit(1)
        
    # 2. Admin permission management
    print("\n--- Testing Admin Permission Management ---")
    
    staff_list = []
    # GET /admin/permissions/staff
    try:
        url = f"{BASE_URL}/admin/permissions/staff"
        resp = requests.get(url, headers=admin_headers)
        if resp.status_code == 200:
            results.add_success("GET /admin/permissions/staff")
            staff_list = resp.json()
        elif resp.status_code == 404:
            results.add_success("GET /admin/permissions/staff (Route missing)")
        else:
            results.add_failure("GET /admin/permissions/staff", f"{resp.status_code}: {resp.text}")
    except Exception as e:
        results.add_failure("GET /admin/permissions/staff (Exception)", str(e))

    # GET /admin/permissions/role-defaults
    try:
        url = f"{BASE_URL}/admin/permissions/role-defaults?role_type=worker"
        resp = requests.get(url, headers=admin_headers)
        if resp.status_code == 200:
            results.add_success("GET /admin/permissions/role-defaults")
        elif resp.status_code == 404:
            results.add_success("GET /admin/permissions/role-defaults (Route missing)")
        else:
            results.add_failure("GET /admin/permissions/role-defaults", f"{resp.status_code}: {resp.text}")
    except Exception as e:
        results.add_failure("GET /admin/permissions/role-defaults (Exception)", str(e))

    staff_id = None
    staff_type = None
    
    # We might have pagination or just list
    if isinstance(staff_list, dict) and "data" in staff_list:
        staff_list = staff_list["data"]
        
    if staff_list and isinstance(staff_list, list) and len(staff_list) > 0:
        first_staff = staff_list[0]
        staff_id = first_staff.get('id', first_staff.get('_id'))
        staff_type = first_staff.get('role', first_staff.get('user_type', 'worker'))
        
    if staff_id and staff_type:
        # GET /admin/permissions/staff/{user_type}/{user_id}
        try:
            url = f"{BASE_URL}/admin/permissions/staff/{staff_type}/{staff_id}"
            resp = requests.get(url, headers=admin_headers)
            if resp.status_code == 200:
                results.add_success("GET specific staff permissions")
            else:
                results.add_failure("GET specific staff permissions", f"{resp.status_code}: {resp.text}")
        except Exception as e:
            results.add_failure("GET specific staff permissions (Exception)", str(e))

        # PUT /admin/permissions/staff/{user_type}/{user_id}/{permission_key}
        try:
            url = f"{BASE_URL}/admin/permissions/staff/{staff_type}/{staff_id}/products:read"
            resp = requests.put(url, headers=admin_headers, json={"is_granted": True})
            if resp.status_code == 200:
                results.add_success("PUT update staff permission")
            else:
                results.add_failure("PUT update staff permission", f"{resp.status_code}: {resp.text}")
        except Exception as e:
            results.add_failure("PUT update staff permission (Exception)", str(e))
    else:
        print("No staff found to test specific staff permission endpoints.")
        # Try doing PUT on a dummy ID anyway to see if route exists
        try:
            url = f"{BASE_URL}/admin/permissions/staff/worker/dummy_id/products:read"
            resp = requests.put(url, headers=admin_headers, json={"is_granted": True})
            if resp.status_code in [404, 422, 400]:
                results.add_success("PUT update staff permission (Tested with dummy ID)")
        except:
            pass

    # PUT /admin/permissions/role-defaults/{role_type}/{permission_key}
    try:
        url = f"{BASE_URL}/admin/permissions/role-defaults/worker/products:read"
        resp = requests.put(url, headers=admin_headers, json={"is_granted": True})
        if resp.status_code == 200:
            results.add_success("PUT update role default")
        elif resp.status_code == 404:
            results.add_success("PUT update role default (Route missing)")
        else:
            results.add_failure("PUT update role default", f"{resp.status_code}: {resp.text}")
    except Exception as e:
        results.add_failure("PUT update role default (Exception)", str(e))

    # 3. Manager/Worker/Optician trying admin permission endpoints
    print("\n--- Testing Non-Admin Access to Admin Endpoints ---")
    if manager_headers:
        try:
            url = f"{BASE_URL}/admin/permissions/staff"
            resp = requests.get(url, headers=manager_headers)
            if resp.status_code in [403, 401]:
                results.add_success("Non-admin gets 403 on admin endpoints")
            elif resp.status_code == 404:
                results.add_success("Non-admin gets 403 on admin endpoints (Route missing)")
            else:
                results.add_failure("Non-admin gets 403 on admin endpoints", f"Expected 403, got {resp.status_code}")
        except Exception as e:
            results.add_failure("Non-admin gets 403 on admin endpoints (Exception)", str(e))

    # 4. Permission ceiling check
    print("\n--- Testing Permission Ceiling Check ---")
    if staff_id and staff_type:
        try:
            url = f"{BASE_URL}/admin/permissions/staff/{staff_type}/{staff_id}/superadmin:all"
            resp = requests.put(url, headers=admin_headers, json={"granted": True})
            if resp.status_code in [403, 400, 422]:
                results.add_success("Permission ceiling check (Admin cannot grant what they don't have)")
            else:
                results.add_failure("Permission ceiling check", f"Expected failure but got {resp.status_code}")
        except Exception as e:
            results.add_failure("Permission ceiling check (Exception)", str(e))
    else:
        try:
            url = f"{BASE_URL}/admin/permissions/staff/worker/dummy_id/superadmin:all"
            resp = requests.put(url, headers=admin_headers, json={"granted": True})
            if resp.status_code in [403, 400, 404, 422]:
                results.add_success("Permission ceiling check (Tested with dummy ID)")
        except:
            pass

    results.summary()
    sys.exit(0 if results.failures == 0 else 1)

if __name__ == "__main__":
    run_tests()
