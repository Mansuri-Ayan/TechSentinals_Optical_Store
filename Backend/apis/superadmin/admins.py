import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import get_db
from core.deps import get_current_user
from core.security import hash_password
from models.superadmin import SuperAdmin
from models.admin import Admin
from models.role import Role
from schemas.superadmin import AdminCreateBySuperAdmin

router = APIRouter(prefix="/admins", tags=["SuperAdmin - Admins"])

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_admin(
    payload: AdminCreateBySuperAdmin,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not isinstance(current_user, SuperAdmin):
        raise HTTPException(status_code=403, detail="SuperAdmin only")
        
    # Check if email exists
    stmt = select(Admin).where(Admin.email == payload.email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Get the "admin" role from the roles table (legacy requirement)
    stmt = select(Role).where(Role.role == "admin")
    admin_role = (await db.execute(stmt)).scalar_one_or_none()
    if not admin_role:
        # Fallback just in case roles table isn't populated properly
        admin_role = Role(role="admin")
        db.add(admin_role)
        await db.commit()
        await db.refresh(admin_role)
        
    new_admin = Admin(
        business_name=payload.business_name,
        owner_first_name=payload.owner_first_name,
        owner_last_name=payload.owner_last_name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        address=payload.address,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        gst_number=payload.gst_number,
        pan_number=payload.pan_number,
        role_id=admin_role.id
    )
    db.add(new_admin)
    await db.commit()
    return {"message": "Admin business created successfully", "admin_id": new_admin.id}
