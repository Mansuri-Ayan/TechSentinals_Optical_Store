from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from core.deps import get_current_admin
from models.admin import Admin
from services.permission_service import set_admin_role_permission, clear_admin_role_override
from pydantic import BaseModel
from sqlalchemy import select
from models.permission import Permission
from models.global_role_permission import GlobalRolePermission
from models.admin_role_permission_override import AdminRolePermissionOverride

router = APIRouter()

class RoleDefaultUpdate(BaseModel):
    is_granted: bool

@router.get("/admin/permissions/role-defaults")
async def get_role_defaults(
    role_type: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    role_type = role_type.upper()
    stmt = select(Permission).where(Permission.is_active == True)
    permissions = (await db.execute(stmt)).scalars().all()

    global_stmt = select(GlobalRolePermission).where(GlobalRolePermission.role_type == role_type)
    global_defaults = {gp.permission_id: gp for gp in (await db.execute(global_stmt)).scalars().all()}

    admin_stmt = select(AdminRolePermissionOverride).where(
        AdminRolePermissionOverride.admin_id == current_admin.id,
        AdminRolePermissionOverride.role_type == role_type
    )
    admin_overrides = {ao.permission_id: ao for ao in (await db.execute(admin_stmt)).scalars().all()}

    results = {}
    for p in permissions:
        if p.module not in results:
            results[p.module] = []
        
        has_override = p.id in admin_overrides
        is_granted = False
        source = "G"
        
        if has_override:
            is_granted = admin_overrides[p.id].is_granted
            source = "B"
        elif p.id in global_defaults:
            is_granted = global_defaults[p.id].is_granted
            
        results[p.module].append({
            "key": p.key,
            "module": p.module,
            "action": p.action,
            "display_name": p.display_name,
            "is_dangerous": p.is_dangerous,
            "is_granted": is_granted,
            "source": source
        })
    
    return results

@router.put("/admin/permissions/role-defaults/{role_type}/{permission_key}")
async def update_role_default(
    role_type: str,
    permission_key: str,
    payload: RoleDefaultUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    role_type = role_type.upper()
    await set_admin_role_permission(
        db, current_admin.id, role_type,
        permission_key, payload.is_granted, current_admin.id
    )
    return {"success": True}

@router.delete("/admin/permissions/role-defaults/{role_type}/{permission_key}")
async def clear_role_default(
    role_type: str,
    permission_key: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    role_type = role_type.upper()
    stmt = select(Permission).where(Permission.key == permission_key)
    permission = (await db.execute(stmt)).scalar_one_or_none()
    if permission:
        await clear_admin_role_override(db, current_admin.id, role_type, permission.id)
    return {"success": True}
