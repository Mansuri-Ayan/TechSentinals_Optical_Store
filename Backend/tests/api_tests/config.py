"""
Configuration for API tests.
All credentials are from seed_data.py.
"""

BASE_URL = "http://127.0.0.1:8000"

# ── All seeded user credentials ──────────────────────────────────────────────
CREDENTIALS = {
    # ── SuperAdmin ──
    "superadmin": {
        "email": "super@visionary.in",
        "password": "SuperAdmin@123",
        "role": "superadmin",
        "store_id": None,
    },

    # ── Admins (store owners / tenants) ──
    "admin_1": {
        "email": "ayan@visionary.in",
        "password": "Admin@123",
        "role": "admin",
        "store_id": None,
        "tenant": "visionary",
    },
    "admin_2": {
        "email": "priya@clearsight.in",
        "password": "Admin@123",
        "role": "admin",
        "store_id": None,
        "tenant": "clearsight",
    },
    "admin_3": {
        "email": "rohan@lenscraft.in",
        "password": "Admin@123",
        "role": "admin",
        "store_id": None,
        "tenant": "lenscraft",
    },
    "admin_4": {
        "email": "sneha@opticare.in",
        "password": "Admin@123",
        "role": "admin",
        "store_id": None,
        "tenant": "opticare",
    },
    "admin_5": {
        "email": "vikram@eyezone.in",
        "password": "Admin@123",
        "role": "admin",
        "store_id": None,
        "tenant": "eyezone",
    },

    # ── Managers ──
    "manager_1": {
        "email": "rajesh.sharma@visionary.in",
        "password": "Manager@123",
        "role": "manager",
        "store_id": 1,
        "tenant": "visionary",
    },
    "manager_2": {
        "email": "vikram.mehta@clearsight.in",
        "password": "Manager@123",
        "role": "manager",
        "store_id": 2,
        "tenant": "clearsight",
    },
    "manager_3": {
        "email": "sanjay.dutt@lenscraft.in",
        "password": "Manager@123",
        "role": "manager",
        "store_id": 3,
        "tenant": "lenscraft",
    },
    "manager_4": {
        "email": "neha.gupta@opticare.in",
        "password": "Manager@123",
        "role": "manager",
        "store_id": 4,
        "tenant": "opticare",
    },
    "manager_5": {
        "email": "arjun.rao@eyezone.in",
        "password": "Manager@123",
        "role": "manager",
        "store_id": 5,
        "tenant": "eyezone",
    },

    # ── Opticians ──
    "optician_1": {
        "email": "meera.shah@visionary.in",
        "password": "Optician@123",
        "role": "optician",
        "store_id": 1,
        "tenant": "visionary",
    },
    "optician_2": {
        "email": "ananya.reddy@clearsight.in",
        "password": "Optician@123",
        "role": "optician",
        "store_id": 2,
        "tenant": "clearsight",
    },
    "optician_3": {
        "email": "sanjay.menon@lenscraft.in",
        "password": "Optician@123",
        "role": "optician",
        "store_id": 3,
        "tenant": "lenscraft",
    },
    "optician_4": {
        "email": "pooja.desai@opticare.in",
        "password": "Optician@123",
        "role": "optician",
        "store_id": 4,
        "tenant": "opticare",
    },
    "optician_5": {
        "email": "arvind.pillai@eyezone.in",
        "password": "Optician@123",
        "role": "optician",
        "store_id": 5,
        "tenant": "eyezone",
    },

    # ── Workers ──
    "worker_1": {
        "email": "rahul.verma@visionary.in",
        "password": "Worker@123",
        "role": "worker",
        "store_id": 1,
        "tenant": "visionary",
    },
    "worker_2": {
        "email": "amit.kumar@clearsight.in",
        "password": "Worker@123",
        "role": "worker",
        "store_id": 2,
        "tenant": "clearsight",
    },
    "worker_3": {
        "email": "deepak.nair@lenscraft.in",
        "password": "Worker@123",
        "role": "worker",
        "store_id": 3,
        "tenant": "lenscraft",
    },
    "worker_4": {
        "email": "suresh.joshi@opticare.in",
        "password": "Worker@123",
        "role": "worker",
        "store_id": 4,
        "tenant": "opticare",
    },
    "worker_5": {
        "email": "karthik.rajan@eyezone.in",
        "password": "Worker@123",
        "role": "worker",
        "store_id": 5,
        "tenant": "eyezone",
    },
}

# ── API Route Prefixes ──────────────────────────────────────────────────────
ROUTES = {
    "auth": "/auth",
    "stores": "/stores",
    "categories": "/categories",
    "brands": "/brands",
    "products": "/products",
    "inventory": "/inventory",
    "transfers": "/transfers",
    "suppliers": "/suppliers",
    "purchase_orders": "/purchase-orders",
    "customers": "/customers",
    "prescriptions": "/prescriptions",
    "sales": "/sales",
    "expenses": "/expenses",
    "reports": "/reports",
    "repairs": "/repairs",
    "labs": "/labs",
    "exchanges": "/exchanges",
    "deadstock": "/deadstock",
    "permissions": "/permissions",
    "superadmin": "/superadmin",
    "bill_settings": "/bill-settings",
    "notifications": "/api/notifications",
    # Shopkeeper-specific
    "shopkeeper_brands": "/shopkeeper/brands",
    "shopkeeper_categories": "/shopkeeper/categories",
    "shopkeeper_transactions": "/api/shopkeeper/transactions",
    # Admin-specific
    "admin_transactions": "/api/transactions",
    # Loyalty (various prefixes)
    "loyalty_admin": "/admin",
    "loyalty_shopkeeper": "/shopkeeper/loyalty",
}

# ── Permission keys from seed data ──────────────────────────────────────────
ALL_PERMISSION_KEYS = [
    "brands:create", "brands:delete", "brands:read", "brands:update",
    "categories:create", "categories:delete", "categories:read", "categories:update",
    "customers:create", "customers:delete", "customers:read", "customers:update",
    "deadstock:create", "deadstock:delete", "deadstock:read", "deadstock:update",
    "expenses:create", "expenses:delete", "expenses:read", "expenses:update",
    "inventory:create", "inventory:read", "inventory:transfer", "inventory:update",
    "loyalty:configure", "loyalty:read", "loyalty:write",
    "managers:create", "managers:delete", "managers:read", "managers:update",
    "opticians:create", "opticians:delete", "opticians:read", "opticians:update",
    "prescriptions:create", "prescriptions:read", "prescriptions:update",
    "products:create", "products:delete", "products:read", "products:update",
    "purchase_orders:create", "purchase_orders:read", "purchase_orders:update",
    "repairs:create", "repairs:delete", "repairs:read", "repairs:update",
    "reports:read",
    "sales:create", "sales:delete", "sales:read", "sales:update",
    "stores:create", "stores:delete", "stores:read", "stores:update",
    "suppliers:create", "suppliers:read", "suppliers:update",
    "workers:create", "workers:delete", "workers:read", "workers:update",
]
