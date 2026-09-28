# API: superadmin/permissions.py
from typing import Dict, List, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from db.session import get_db
from core.deps import get_current_superadmin
from models.superadmin import SuperAdmin
from models.permission import Permission
from models.global_role_permission import GlobalRolePermission, PermissionRoleType
from models.admin_role_permission_override import AdminRolePermissionOverride
from models.admin import Admin
from services.permission_service import copy_global_permissions_to_admin

router = APIRouter(prefix="/permissions", tags=["SuperAdmin - Permissions"])


@router.get("/global")
async def get_global_permissions_matrix(
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Returns Tier 1 Global Role Permissions matrix.
    Grouped by module (Sales, Inventory, Customers, etc.) and roles:
    ADMIN, MANAGER, WORKER, OPTICIAN, ACCOUNTANT.
    """
    # 1. Fetch all active permissions
    perm_stmt = select(Permission).where(Permission.is_active == True).order_by(Permission.module, Permission.key)
    permissions = (await db.execute(perm_stmt)).scalars().all()

    # 2. Fetch all global role permissions
    grp_stmt = select(GlobalRolePermission)
    grp_records = (await db.execute(grp_stmt)).scalars().all()

    # Map of (role_type, permission_id) -> is_granted
    matrix_map = {}
    for r in grp_records:
        r_type = r.role_type.value if hasattr(r.role_type, "value") else str(r.role_type)
        matrix_map[(r_type, r.permission_id)] = r.is_granted

    roles = ["ADMIN", "MANAGER", "WORKER", "OPTICIAN", "ACCOUNTANT"]

    # Structure grouped by module
    modules_dict: Dict[str, List[Dict[str, Any]]] = {}
    for p in permissions:
        mod = p.module or "General"
        if mod not in modules_dict:
            modules_dict[mod] = []

        grants = {}
        for role in roles:
            grants[role] = matrix_map.get((role, p.id), False)

        modules_dict[mod].append({
            "id": p.id,
            "key": p.key,
            "display_name": p.display_name,
            "description": p.description,
            "action": p.action,
            "is_dangerous": p.is_dangerous,
            "grants": grants,
        })

    return {
        "roles": roles,
        "modules": modules_dict,
        "total_permissions": len(permissions),
    }


@router.put("/global")
async def update_global_permission(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Updates the default is_granted status for a (role_type, permission_key) pair.
    Takes { "role_type": "WORKER", "permission_key": "sales:read", "is_granted": true }
    """
    role_type_str = payload.get("role_type", "").upper()
    permission_key = payload.get("permission_key")
    is_granted = payload.get("is_granted")

    if not role_type_str or not permission_key or is_granted is None:
        raise HTTPException(status_code=400, detail="role_type, permission_key, and is_granted are required")

    try:
        role_type = PermissionRoleType(role_type_str)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role_type: {role_type_str}")

    # Find permission
    perm = (await db.execute(select(Permission).where(Permission.key == permission_key))).scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail=f"Permission '{permission_key}' not found")

    # Find or create GlobalRolePermission row
    grp_stmt = select(GlobalRolePermission).where(
        GlobalRolePermission.role_type == role_type,
        GlobalRolePermission.permission_id == perm.id,
    )
    grp = (await db.execute(grp_stmt)).scalar_one_or_none()

    if grp:
        grp.is_granted = bool(is_granted)
        grp.updated_by_superadmin_id = current_superadmin.id
    else:
        grp = GlobalRolePermission(
            role_type=role_type,
            permission_id=perm.id,
            is_granted=bool(is_granted),
            updated_by_superadmin_id=current_superadmin.id,
        )
        db.add(grp)

    await db.commit()
    await db.refresh(grp)

    return {
        "success": True,
        "message": f"Global permission '{permission_key}' for role {role_type_str} set to {grp.is_granted}",
        "role_type": role_type_str,
        "permission_key": permission_key,
        "is_granted": grp.is_granted,
    }


@router.post("/sync-tenant/{admin_id}")
async def sync_tenant_permissions(
    admin_id: int,
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Re-copies latest global permission templates to a specific tenant's overrides table.
    """
    admin = await db.get(Admin, admin_id)
    if not admin or admin.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Admin business not found")

    await copy_global_permissions_to_admin(db, admin_id)

    return {
        "success": True,
        "message": f"Global role permissions synced to '{admin.business_name}' successfully.",
    }
