from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from core.deps import get_current_admin
from models.admin import Admin
from services.permission_service import set_user_permission, clear_user_permission
from pydantic import BaseModel
from sqlalchemy import select
from models.permission import Permission
from models.global_role_permission import GlobalRolePermission
from models.admin_role_permission_override import AdminRolePermissionOverride
from models.user_permission_override import UserPermissionOverride

router = APIRouter()

class StaffPermissionUpdate(BaseModel):
    is_granted: bool

@router.get("/admin/permissions/staff/{user_type}/{user_id}")
async def get_staff_permissions(
    user_type: str,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    user_type = user_type.upper()
    stmt = select(Permission).where(Permission.is_active == True)
    permissions = (await db.execute(stmt)).scalars().all()

    global_stmt = select(GlobalRolePermission).where(GlobalRolePermission.role_type == user_type)
    global_defaults = {gp.permission_id: gp for gp in (await db.execute(global_stmt)).scalars().all()}

    admin_stmt = select(AdminRolePermissionOverride).where(
        AdminRolePermissionOverride.admin_id == current_admin.id,
        AdminRolePermissionOverride.role_type == user_type
    )
    admin_overrides = {ao.permission_id: ao for ao in (await db.execute(admin_stmt)).scalars().all()}

    user_stmt = select(UserPermissionOverride).where(
        UserPermissionOverride.user_type == user_type,
        UserPermissionOverride.user_id == user_id
    )
    user_overrides = {uo.permission_id: uo for uo in (await db.execute(user_stmt)).scalars().all()}

    results = {}
    for p in permissions:
        if p.module not in results:
            results[p.module] = []
        
        has_user = p.id in user_overrides
        has_admin = p.id in admin_overrides
        has_global = p.id in global_defaults
        
        is_granted = False
        source = "G"
        
        if has_user:
            is_granted = user_overrides[p.id].is_granted
            source = "U"
        elif has_admin:
            is_granted = admin_overrides[p.id].is_granted
            source = "B"
        elif has_global:
            is_granted = global_defaults[p.id].is_granted
            source = "G"
            
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

@router.put("/admin/permissions/staff/{user_type}/{user_id}/{permission_key}")
async def update_staff_permission(
    user_type: str,
    user_id: int,
    permission_key: str,
    payload: StaffPermissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    user_type = user_type.upper()
    await set_user_permission(
        db, current_admin.id, user_type, user_id,
        permission_key, payload.is_granted, current_admin.id
    )
    return {"success": True}

@router.delete("/admin/permissions/staff/{user_type}/{user_id}/{permission_key}")
async def clear_staff_permission(
    user_type: str,
    user_id: int,
    permission_key: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    user_type = user_type.upper()
    await clear_user_permission(
        db, current_admin.id, user_type, user_id, permission_key
    )
    return {"success": True}
