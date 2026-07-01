from typing import Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from models.permission import Permission
from models.global_role_permission import GlobalRolePermission
from models.admin_role_permission_override import AdminRolePermissionOverride
from models.user_permission_override import UserPermissionOverride

async def has_permission(db: AsyncSession, actor_type: str, actor_id: int, admin_id: Optional[int], permission_key: str) -> bool:
    actor_type = actor_type.upper()
    if actor_type == "SUPER_ADMIN":
        return True

    stmt = select(Permission).where(Permission.key == permission_key)
    result = await db.execute(stmt)
    permission = result.scalar_one_or_none()
    
    if not permission:
        return False

    # 1. User Override (Tier 3)
    stmt = select(UserPermissionOverride).where(
        UserPermissionOverride.user_type == actor_type,
        UserPermissionOverride.user_id == actor_id,
        UserPermissionOverride.permission_id == permission.id
    )
    user_override = (await db.execute(stmt)).scalar_one_or_none()
    if user_override is not None:
        return user_override.is_granted

    # 2. Admin Role Override (Tier 2) - Skips ADMIN actors
    if actor_type != "ADMIN" and admin_id is not None:
        stmt = select(AdminRolePermissionOverride).where(
            AdminRolePermissionOverride.admin_id == admin_id,
            AdminRolePermissionOverride.role_type == actor_type,
            AdminRolePermissionOverride.permission_id == permission.id
        )
        admin_override = (await db.execute(stmt)).scalar_one_or_none()
        if admin_override is not None:
            return admin_override.is_granted

    # 3. Global Default (Tier 1)
    stmt = select(GlobalRolePermission).where(
        GlobalRolePermission.role_type == actor_type,
        GlobalRolePermission.permission_id == permission.id
    )
    global_default = (await db.execute(stmt)).scalar_one_or_none()
    if global_default is not None:
        return global_default.is_granted

    return False


async def get_effective_permission_map(db: AsyncSession, actor_type: str, actor_id: int, admin_id: Optional[int]) -> dict:
    actor_type = actor_type.upper()
    stmt = select(Permission).where(Permission.is_active == True)
    permissions = (await db.execute(stmt)).scalars().all()

    if actor_type == "SUPER_ADMIN":
        return {p.key: {"granted": True, "source": "superadmin"} for p in permissions}

    global_stmt = select(GlobalRolePermission).where(GlobalRolePermission.role_type == actor_type)
    global_defaults = {gp.permission_id: gp.is_granted for gp in (await db.execute(global_stmt)).scalars().all()}

    admin_overrides = {}
    if actor_type != "ADMIN" and admin_id is not None:
        admin_stmt = select(AdminRolePermissionOverride).where(
            AdminRolePermissionOverride.admin_id == admin_id,
            AdminRolePermissionOverride.role_type == actor_type
        )
        admin_overrides = {ao.permission_id: ao.is_granted for ao in (await db.execute(admin_stmt)).scalars().all()}

    user_stmt = select(UserPermissionOverride).where(
        UserPermissionOverride.user_type == actor_type,
        UserPermissionOverride.user_id == actor_id
    )
    user_overrides = {uo.permission_id: uo.is_granted for uo in (await db.execute(user_stmt)).scalars().all()}

    effective_map = {}
    for p in permissions:
        if p.id in user_overrides:
            effective_map[p.key] = {"granted": user_overrides[p.id], "source": "user_override"}
        elif p.id in admin_overrides:
            effective_map[p.key] = {"granted": admin_overrides[p.id], "source": "admin_role_override"}
        elif p.id in global_defaults:
            effective_map[p.key] = {"granted": global_defaults[p.id], "source": "global"}
        else:
            effective_map[p.key] = {"granted": False, "source": "denied"}
            
    return effective_map


async def set_admin_role_permission(db: AsyncSession, admin_id: int, role_type: str, permission_key: str, is_granted: bool, set_by_admin_id: int):
    role_type = role_type.upper()
    # CEILING CHECK
    if is_granted:
        has_perm = await has_permission(db, "ADMIN", set_by_admin_id, set_by_admin_id, permission_key)
        if not has_perm:
            raise HTTPException(status_code=403, detail="Cannot grant permission you do not possess")

    stmt = select(Permission).where(Permission.key == permission_key)
    permission = (await db.execute(stmt)).scalar_one_or_none()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    stmt = select(AdminRolePermissionOverride).where(
        AdminRolePermissionOverride.admin_id == admin_id,
        AdminRolePermissionOverride.role_type == role_type,
        AdminRolePermissionOverride.permission_id == permission.id
    )
    record = (await db.execute(stmt)).scalar_one_or_none()

    if record:
        record.is_granted = is_granted
    else:
        record = AdminRolePermissionOverride(
            admin_id=admin_id,
            role_type=role_type,
            permission_id=permission.id,
            is_granted=is_granted
        )
        db.add(record)

    await db.commit()
    await db.refresh(record)
    return record


async def set_user_permission(db: AsyncSession, admin_id: int, user_type: str, user_id: int, permission_key: str, is_granted: bool, set_by_admin_id: int):
    user_type = user_type.upper()
    # CEILING CHECK
    if is_granted:
        has_perm = await has_permission(db, "ADMIN", set_by_admin_id, set_by_admin_id, permission_key)
        if not has_perm:
            raise HTTPException(status_code=403, detail="Cannot grant permission you do not possess")

    stmt = select(Permission).where(Permission.key == permission_key)
    permission = (await db.execute(stmt)).scalar_one_or_none()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    stmt = select(UserPermissionOverride).where(
        UserPermissionOverride.user_type == user_type,
        UserPermissionOverride.user_id == user_id,
        UserPermissionOverride.permission_id == permission.id
    )
    record = (await db.execute(stmt)).scalar_one_or_none()

    if record:
        record.is_granted = is_granted
        record.admin_id = admin_id
        record.granted_by_id = set_by_admin_id
    else:
        record = UserPermissionOverride(
            user_type=user_type,
            user_id=user_id,
            permission_id=permission.id,
            is_granted=is_granted,
            admin_id=admin_id,
            granted_by_id=set_by_admin_id
        )
        db.add(record)

    await db.commit()
    await db.refresh(record)
    return record


async def clear_user_permission(db: AsyncSession, admin_id: int, user_type: str, user_id: int, permission_key: str):
    user_type = user_type.upper()
    stmt = select(Permission).where(Permission.key == permission_key)
    permission = (await db.execute(stmt)).scalar_one_or_none()
    if not permission:
        return

    stmt = select(UserPermissionOverride).where(
        UserPermissionOverride.user_type == user_type,
        UserPermissionOverride.user_id == user_id,
        UserPermissionOverride.permission_id == permission.id
    )
    record = (await db.execute(stmt)).scalar_one_or_none()

    if record:
        await db.delete(record)
        await db.commit()


async def clear_admin_role_override(db: AsyncSession, admin_id: int, role_type: str, permission_id: int):
    role_type = role_type.upper()
    stmt = select(AdminRolePermissionOverride).where(
        AdminRolePermissionOverride.admin_id == admin_id,
        AdminRolePermissionOverride.role_type == role_type,
        AdminRolePermissionOverride.permission_id == permission_id
    )
    record = (await db.execute(stmt)).scalar_one_or_none()

    if record:
        await db.delete(record)
        await db.commit()
