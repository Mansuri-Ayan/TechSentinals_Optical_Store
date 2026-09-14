import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from db.session import get_db
from core.deps import get_current_user
from core.security import hash_password
from models.superadmin import SuperAdmin
from models.admin import Admin, AdminStatus
from models.role import Role
from schemas.superadmin import AdminCreateBySuperAdmin
from schemas.admin import AdminUpdate, AdminRead
from services.permission_service import copy_global_permissions_to_admin

router = APIRouter(prefix="/admins", tags=["SuperAdmin - Admins"])

def check_superadmin(current_user):
    if not isinstance(current_user, SuperAdmin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin only"
        )

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_admin(
    payload: AdminCreateBySuperAdmin,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    check_superadmin(current_user)
        
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
        role_id=admin_role.id,
        status=AdminStatus.ACTIVE,
        is_email_verified=False,
        is_phone_verified=False,
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)

    # Copy global permissions defaults to admin overrides
    await copy_global_permissions_to_admin(db, new_admin.id)

    return {"message": "Admin business created successfully", "admin_id": new_admin.id}

@router.get("", response_model=dict)
async def list_admins(
    search: str | None = Query(None),
    status_filter: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    check_superadmin(current_user)

    filters = [Admin.deleted_at.is_(None)]
    if search:
        pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                Admin.business_name.ilike(pattern),
                Admin.owner_first_name.ilike(pattern),
                Admin.owner_last_name.ilike(pattern),
                Admin.email.ilike(pattern),
                Admin.phone.ilike(pattern)
            )
        )
    if status_filter:
        filters.append(Admin.status == status_filter.upper())

    count_stmt = select(func.count()).select_from(Admin).where(*filters)
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = (
        select(Admin)
        .where(*filters)
        .order_by(Admin.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(stmt)
    admins = result.scalars().all()

    validated = [AdminRead.model_validate(admin) for admin in admins]

    return {
        "items": validated,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if limit else 1
    }

@router.get("/{admin_id}", response_model=AdminRead)
async def get_admin_detail(
    admin_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AdminRead:
    check_superadmin(current_user)

    stmt = select(Admin).where(Admin.id == admin_id, Admin.deleted_at.is_(None))
    admin = (await db.execute(stmt)).scalar_one_or_none()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )
    return AdminRead.model_validate(admin)

@router.put("/{admin_id}", response_model=AdminRead)
async def update_admin_endpoint(
    admin_id: int,
    payload: AdminUpdate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AdminRead:
    check_superadmin(current_user)

    stmt = select(Admin).where(Admin.id == admin_id, Admin.deleted_at.is_(None))
    admin = (await db.execute(stmt)).scalar_one_or_none()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(admin, field, value)

    await db.commit()
    await db.refresh(admin)
    return AdminRead.model_validate(admin)

@router.delete("/{admin_id}", status_code=status.HTTP_200_OK)
async def delete_admin_endpoint(
    admin_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    check_superadmin(current_user)

    stmt = select(Admin).where(Admin.id == admin_id, Admin.deleted_at.is_(None))
    admin = (await db.execute(stmt)).scalar_one_or_none()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )

    admin.deleted_at = datetime.now(timezone.utc)
    admin.status = AdminStatus.INACTIVE

    # Soft-delete their stores as well
    from models.store import Store
    from services.store_service import delete_store
    stores_stmt = select(Store).where(Store.admin_id == admin_id, Store.deleted_at.is_(None))
    stores_res = await db.execute(stores_stmt)
    for store in stores_res.scalars().all():
        await delete_store(db, store, soft_delete=True)

    await db.commit()
    return {"success": True, "message": f"Admin business '{admin.business_name}' and all associated stores deleted successfully."}
