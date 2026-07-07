"""
seed_permissions.py — Seed the Permission Catalog and Global Role Defaults.

Can be run independently to reset or update permissions without wiping
business data (customers, sales, inventory, etc.).

Usage:
    python seed_permissions.py
"""
import asyncio
import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent
if _backend_dir.name == "db":
    _backend_dir = _backend_dir.parent

if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from sqlalchemy import select, delete
from db.session import async_session_maker, engine
from core.security import hash_password

from models.superadmin import SuperAdmin, SuperAdminStatus
from models.permission import Permission
from models.global_role_permission import GlobalRolePermission, PermissionRoleType


# ══════════════════════════════════════════════════════════════
# Permission Catalog  —  single source of truth
# (module, action, label, is_special)
# ══════════════════════════════════════════════════════════════
PERMISSION_CATALOG = [
    # ── Customers ─────────────────────────────────────────────
    ("customers", "create", "Create customers", False),
    ("customers", "read", "View customers", False),
    ("customers", "update", "Update customers", False),
    ("customers", "delete", "Delete customers", True),
    # ── Prescriptions ─────────────────────────────────────────
    ("prescriptions", "create", "Create prescriptions", False),
    ("prescriptions", "read", "View prescriptions", False),
    ("prescriptions", "update", "Update prescriptions", False),
    ("prescriptions", "delete", "Delete prescriptions", True),
    # ── Staff: Workers ────────────────────────────────────────
    ("workers", "create", "Create workers", False),
    ("workers", "read", "View workers", False),
    ("workers", "update", "Update workers", False),
    ("workers", "delete", "Delete workers", True),
    # ── Staff: Managers ───────────────────────────────────────
    ("managers", "create", "Create managers", False),
    ("managers", "read", "View managers", False),
    ("managers", "update", "Update managers", False),
    ("managers", "delete", "Delete managers", True),
    # ── Staff: Opticians ──────────────────────────────────────
    ("opticians", "create", "Create opticians", False),
    ("opticians", "read", "View opticians", False),
    ("opticians", "update", "Update opticians", False),
    ("opticians", "delete", "Delete opticians", True),
    # ── Staff: Accountants ────────────────────────────────────
    ("accountants", "create", "Create accountants", False),
    ("accountants", "read", "View accountants", False),
    ("accountants", "update", "Update accountants", False),
    ("accountants", "delete", "Delete accountants", True),
    # ── Loyalty ───────────────────────────────────────────────
    ("loyalty", "read", "View loyalty", False),
    ("loyalty", "update", "Update loyalty points", False),
    ("loyalty", "manage", "Manage loyalty settings", True),
    # ── Inventory ─────────────────────────────────────────────
    ("inventory", "create", "Create inventory", False),
    ("inventory", "read", "View inventory", False),
    ("inventory", "update", "Update inventory", False),
    ("inventory", "delete", "Delete inventory", True),
    ("inventory", "transfer", "Transfer inventory", False),
    # ── Brands ────────────────────────────────────────────────
    ("brands", "create", "Create brands", False),
    ("brands", "read", "View brands", False),
    ("brands", "update", "Update brands", False),
    ("brands", "delete", "Delete brands", True),
    # ── Categories ────────────────────────────────────────────
    ("categories", "create", "Create categories", False),
    ("categories", "read", "View categories", False),
    ("categories", "update", "Update categories", False),
    ("categories", "delete", "Delete categories", True),
    # ── Products ──────────────────────────────────────────────
    ("products", "create", "Create products", False),
    ("products", "read", "View products", False),
    ("products", "update", "Update products", False),
    ("products", "delete", "Delete products", True),
    # ── Bill Settings ─────────────────────────────────────────
    ("bill_settings", "read", "View bill settings", False),
    ("bill_settings", "update", "Update bill settings", False),
    # ── Sales ─────────────────────────────────────────────────
    ("sales", "create", "Create sales", False),
    ("sales", "read", "View sales", False),
    ("sales", "update", "Update sales", False),
    ("sales", "delete", "Delete sales", True),
    ("sales", "refund", "Process sale refunds", True),
    # ── Transactions ──────────────────────────────────────────
    ("transactions", "create", "Create transactions", False),
    ("transactions", "read", "View transactions", False),
    ("transactions", "update", "Update transactions", False),
    ("transactions", "approve", "Approve transactions", True),
    # ── Repairs ───────────────────────────────────────────────
    ("repairs", "create", "Create repairs", False),
    ("repairs", "read", "View repairs", False),
    ("repairs", "update", "Update repairs", False),
    ("repairs", "delete", "Delete repairs", True),
    # ── Suppliers ─────────────────────────────────────────────
    ("suppliers", "create", "Create suppliers", False),
    ("suppliers", "read", "View suppliers", False),
    ("suppliers", "update", "Update suppliers", False),
    ("suppliers", "delete", "Delete suppliers", True),
    # ── Purchase Orders ───────────────────────────────────────
    ("purchase_orders", "create", "Create purchase orders", False),
    ("purchase_orders", "read", "View purchase orders", False),
    ("purchase_orders", "update", "Update purchase orders", False),
    ("purchase_orders", "delete", "Delete purchase orders", True),
    ("purchase_orders", "approve", "Approve purchase orders", True),
    # ── Expenses ──────────────────────────────────────────────
    ("expenses", "create", "Create expenses", False),
    ("expenses", "read", "View expenses", False),
    ("expenses", "update", "Update expenses", False),
    ("expenses", "delete", "Delete expenses", True),
    ("expenses", "approve", "Approve expenses", True),
    # ── Stores ────────────────────────────────────────────────
    ("stores", "create", "Create stores", False),
    ("stores", "read", "View stores", False),
    ("stores", "update", "Update stores", False),
    ("stores", "delete", "Delete stores", True),
    # ── Permissions ───────────────────────────────────────────
    ("permissions", "read", "View permissions", False),
    ("permissions", "manage", "Manage permissions", True),
    # ── Reports ───────────────────────────────────────────────
    ("reports", "read", "View reports", False),
    ("reports", "export", "Export reports", False),
    # ── Notifications ─────────────────────────────────────────
    ("notifications", "read", "View notifications", False),
    ("notifications", "manage", "Manage notifications", False),
]


# ══════════════════════════════════════════════════════════════
# Role → Granted permission keys  (Tier-1 defaults)
# ══════════════════════════════════════════════════════════════
def _build_role_grants(all_keys: list[str]) -> dict:
    """Return {PermissionRoleType: [granted_keys]} for every role."""

    admin_granted = list(all_keys)

    return {
        PermissionRoleType.ADMIN:      list(all_keys),
        PermissionRoleType.MANAGER:    list(all_keys),
        PermissionRoleType.WORKER:     list(all_keys),
        PermissionRoleType.OPTICIAN:   list(all_keys),
        PermissionRoleType.ACCOUNTANT: list(all_keys),
    }


# ══════════════════════════════════════════════════════════════
# Main seeder
# ══════════════════════════════════════════════════════════════
async def seed_permissions():
    """Seed (or re-seed) the permission system without touching business data."""
    async with async_session_maker() as db:
        print("=" * 60)
        print("  Seeding Permission System V2")
        print("=" * 60)

        # ── 1. SuperAdmin (upsert) ────────────────────────────
        print("  [1/3] Bootstrapping SuperAdmin...")
        result = await db.execute(
            select(SuperAdmin).filter_by(email="superadmin@techsentinals.com")
        )
        superadmin = result.scalar_one_or_none()

        if not superadmin:
            superadmin = SuperAdmin(
                first_name="Tech",
                last_name="Sentinals",
                email="superadmin@techsentinals.com",
                password_hash=hash_password("SuperAdmin@123"),
                status=SuperAdminStatus.ACTIVE,
            )
            db.add(superadmin)
            await db.flush()
            print("        -> Created new SuperAdmin")
        else:
            print("        -> SuperAdmin already exists, skipping")

        # ── 2. Permission catalog (clean slate) ───────────────
        print("  [2/3] Rebuilding Permission Catalog...")
        await db.execute(delete(GlobalRolePermission))
        await db.execute(delete(Permission))
        await db.flush()

        permissions = []
        for mod, act, label, is_special in PERMISSION_CATALOG:
            perm = Permission(
                module=mod,
                action=act,
                key=f"{mod}:{act}",
                display_name=label,
                is_dangerous=is_special,
            )
            db.add(perm)
            permissions.append(perm)
        await db.flush()

        perm_map = {p.key: p for p in permissions}

        # ── 3. GlobalRolePermission defaults ──────────────────
        print("  [3/3] Seeding GlobalRolePermission defaults...")
        role_grants = _build_role_grants(list(perm_map.keys()))

        grp_count = 0
        for role_type, granted_keys in role_grants.items():
            for key in granted_keys:
                if key in perm_map:
                    grp = GlobalRolePermission(
                        role_type=role_type,
                        permission_id=perm_map[key].id,
                        is_granted=True,
                        updated_by_superadmin_id=superadmin.id,
                    )
                    db.add(grp)
                    grp_count += 1
        await db.flush()

        await db.commit()

        # ── Summary ───────────────────────────────────────────
        print()
        print("=" * 60)
        print("  [SUCCESS] PERMISSIONS SEEDED SUCCESSFULLY!")
        print("=" * 60)
        print(f"  Permissions:            {len(permissions)}")
        print(f"  GlobalRolePermissions:  {grp_count}")
        print()
        print("  SuperAdmin credentials:")
        print(f"  {'Email':<35} {'Password':<15}")
        print(f"  {'-' * 35} {'-' * 15}")
        print(f"  {'superadmin@techsentinals.com':<35} SuperAdmin@123")
        print("=" * 60)


async def main() -> None:
    try:
        await seed_permissions()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
