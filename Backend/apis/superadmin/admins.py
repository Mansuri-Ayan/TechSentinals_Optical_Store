import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, case, distinct

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
        warehouse_enabled=False,
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


@router.get("/{admin_id}/overview")
async def get_admin_360_overview(
    admin_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns 360-degree overview of a tenant business:
    profile, stores summary, staff counts, sales revenue, inventory valuation, and configs.
    """
    check_superadmin(current_user)

    admin = await db.get(Admin, admin_id)
    if not admin or admin.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Admin business not found")

    from models.store import Store
    from models.sale import Sale, SaleStatus
    from models.inventory import Inventory
    from models.product import Product
    from models.manager import Manager
    from models.worker import Worker
    from models.optician import Optician
    from models.accountant import Accountant

    # Stores summary
    stores_stmt = select(
        func.count(Store.id).label("total"),
        func.count(case((Store.is_active == True, Store.id))).label("active")
    ).where(Store.admin_id == admin_id, Store.deleted_at.is_(None))
    stores_res = (await db.execute(stores_stmt)).first()
    total_stores = int(stores_res.total or 0)
    active_stores = int(stores_res.active or 0)

    # Staff counts
    mgr_count = (await db.execute(
        select(func.count(Manager.id)).join(Store, Manager.store_id == Store.id).where(Store.admin_id == admin_id, Manager.deleted_at.is_(None))
    )).scalar() or 0
    wrk_count = (await db.execute(
        select(func.count(Worker.id)).join(Store, Worker.store_id == Store.id).where(Store.admin_id == admin_id, Worker.deleted_at.is_(None))
    )).scalar() or 0
    opt_count = (await db.execute(
        select(func.count(Optician.id)).join(Store, Optician.store_id == Store.id).where(Store.admin_id == admin_id, Optician.deleted_at.is_(None))
    )).scalar() or 0
    acc_count = (await db.execute(
        select(func.count(Accountant.id)).where(Accountant.admin_id == admin_id, Accountant.deleted_at.is_(None))
    )).scalar() or 0
    total_staff = mgr_count + wrk_count + opt_count + acc_count

    # Sales & Revenue
    sales_stmt = select(
        func.coalesce(func.sum(Sale.total_amount), 0).label("gmv"),
        func.count(Sale.id).label("invoices")
    ).where(Sale.admin_id == admin_id, Sale.status == SaleStatus.COMPLETED)
    sales_res = (await db.execute(sales_stmt)).first()
    gmv = float(sales_res.gmv or 0)
    invoices = int(sales_res.invoices or 0)
    aov = round(gmv / invoices, 2) if invoices > 0 else 0.0

    # Inventory Valuation (admin-scoped products)
    inv_stmt = select(
        func.coalesce(func.sum(Inventory.quantity), 0).label("total_units"),
        func.coalesce(func.sum(Inventory.quantity * func.coalesce(Product.cost_price, Product.selling_price, 0)), 0).label("valuation")
    ).join(Product, Inventory.product_id == Product.id).where(Product.admin_id == admin_id, Inventory.is_active.is_(True))
    inv_res = (await db.execute(inv_stmt)).first()
    stock_units = int(inv_res.total_units or 0)
    stock_valuation = float(inv_res.valuation or 0)

    return {
        "admin": AdminRead.model_validate(admin),
        "stores_count": total_stores,
        "active_stores_count": active_stores,
        "staff_count": {
            "total": total_staff,
            "managers": mgr_count,
            "workers": wrk_count,
            "opticians": opt_count,
            "accountants": acc_count,
        },
        "sales": {
            "gmv": gmv,
            "invoices": invoices,
            "aov": aov,
        },
        "inventory": {
            "units": stock_units,
            "valuation": round(stock_valuation, 2),
        },
        "config": {
            "warehouse_enabled": admin.warehouse_enabled,
        }
    }


@router.get("/{admin_id}/stores")
async def get_admin_stores(
    admin_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all retail branches for a specific tenant with store metrics.
    """
    check_superadmin(current_user)

    from models.store import Store
    from models.sale import Sale, SaleStatus

    stmt = (
        select(
            Store,
            func.coalesce(func.sum(case((Sale.status == SaleStatus.COMPLETED, Sale.total_amount), else_=0)), 0).label("revenue"),
            func.count(distinct(case((Sale.status == SaleStatus.COMPLETED, Sale.id)))).label("orders_count")
        )
        .outerjoin(Sale, Store.id == Sale.store_id)
        .where(Store.admin_id == admin_id, Store.deleted_at.is_(None))
        .group_by(Store.id)
        .order_by(Store.created_at.asc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    stores_list = []
    for store, rev, orders in rows:
        stores_list.append({
            "id": store.id,
            "store_name": store.store_name,
            "store_code": store.store_code,
            "address": store.address,
            "city": store.city,
            "state": store.state,
            "pincode": store.pincode,
            "phone": store.phone,
            "email": store.email,
            "is_active": store.is_active,
            "is_main_store": store.is_main_store,
            "revenue": float(rev or 0),
            "orders_count": int(orders or 0),
            "created_at": store.created_at.isoformat() if store.created_at else None,
        })

    return {"stores": stores_list, "total": len(stores_list)}


@router.get("/{admin_id}/staff")
async def get_admin_staff(
    admin_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all staff members (managers, workers, opticians, accountants) under this tenant.
    """
    check_superadmin(current_user)

    from models.store import Store
    from models.manager import Manager
    from models.worker import Worker
    from models.optician import Optician
    from models.accountant import Accountant

    staff_members = []

    # Managers
    mgrs = (await db.execute(
        select(Manager, Store.store_name)
        .join(Store, Manager.store_id == Store.id)
        .where(Store.admin_id == admin_id, Manager.deleted_at.is_(None))
    )).all()
    for m, sname in mgrs:
        staff_members.append({
            "id": m.id,
            "name": f"{m.first_name} {m.last_name}",
            "email": m.email,
            "phone": m.phone,
            "role": "Manager",
            "store_id": m.store_id,
            "store_name": sname,
            "is_active": m.is_active,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    # Workers
    wrks = (await db.execute(
        select(Worker, Store.store_name)
        .join(Store, Worker.store_id == Store.id)
        .where(Store.admin_id == admin_id, Worker.deleted_at.is_(None))
    )).all()
    for w, sname in wrks:
        staff_members.append({
            "id": w.id,
            "name": f"{w.first_name} {w.last_name}",
            "email": w.email,
            "phone": w.phone,
            "role": "Worker",
            "store_id": w.store_id,
            "store_name": sname,
            "is_active": w.is_active,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        })

    # Opticians
    opts = (await db.execute(
        select(Optician, Store.store_name)
        .join(Store, Optician.store_id == Store.id)
        .where(Store.admin_id == admin_id, Optician.deleted_at.is_(None))
    )).all()
    for o, sname in opts:
        staff_members.append({
            "id": o.id,
            "name": f"{o.first_name} {o.last_name}",
            "email": o.email,
            "phone": o.phone,
            "role": "Optician",
            "store_id": o.store_id,
            "store_name": sname,
            "is_active": o.is_active,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })

    # Accountants
    accs = (await db.execute(
        select(Accountant)
        .where(Accountant.admin_id == admin_id, Accountant.deleted_at.is_(None))
    )).scalars().all()
    for a in accs:
        staff_members.append({
            "id": a.id,
            "name": f"{a.first_name} {a.last_name}",
            "email": a.email,
            "phone": a.phone,
            "role": "Accountant",
            "store_id": a.store_id,
            "store_name": "Business Level",
            "is_active": a.is_active,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    return {"staff": staff_members, "total": len(staff_members)}


@router.patch("/{admin_id}/status")
async def update_admin_status(
    admin_id: int,
    payload: dict,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Toggle or update Admin status (ACTIVE, SUSPENDED, INACTIVE).
    """
    check_superadmin(current_user)

    new_status = payload.get("status", "").upper()
    if new_status not in [AdminStatus.ACTIVE.value, AdminStatus.SUSPENDED.value, AdminStatus.INACTIVE.value]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be ACTIVE, SUSPENDED, or INACTIVE")

    admin = await db.get(Admin, admin_id)
    if not admin or admin.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Admin business not found")

    admin.status = AdminStatus(new_status)
    await db.commit()
    await db.refresh(admin)

    return {
        "success": True,
        "message": f"Tenant '{admin.business_name}' status updated to {new_status}",
        "status": admin.status.value,
    }


@router.post("/{admin_id}/impersonate")
async def impersonate_admin(
    admin_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate an impersonation token for the SuperAdmin to view the app as the target Admin.
    """
    check_superadmin(current_user)

    admin = await db.get(Admin, admin_id)
    if not admin or admin.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Admin business not found")
    if admin.status != AdminStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Cannot impersonate an inactive or suspended tenant")

    from core.security import create_access_token
    jwt_payload = {
        "sub": str(admin.id),
        "role": "admin",
        "impersonated_by": str(current_user.id),
        "impersonated_by_email": current_user.email,
        "business_name": admin.business_name,
    }
    access_token = create_access_token(jwt_payload)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin": AdminRead.model_validate(admin),
        "impersonated": True,
        "message": f"Impersonation session established for {admin.business_name}",
    }
