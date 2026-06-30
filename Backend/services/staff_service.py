# Service: staff_service.py
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from models.store import Store

async def get_staff_by_store(
    db: AsyncSession,
    store_id: int | list[int],
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    is_active: bool | None = None,
    role: str | None = None,
    paginate: bool = True,
) -> tuple[list[dict], int]:
    """List all non-deleted staff (managers, workers, opticians) in a store with pagination and filtering."""
    offset = (page - 1) * limit
    
    # Resolve store names mapping
    store_ids = store_id if isinstance(store_id, list) else [store_id]
    store_names_map = {}
    if store_ids:
        st_stmt = select(Store.id, Store.store_name).where(Store.id.in_(store_ids))
        st_res = await db.execute(st_stmt)
        for row in st_res.all():
            store_names_map[row[0]] = row[1]

    # Build filters based on store ID(s)
    if isinstance(store_id, list):
        mgr_store_filter = Manager.store_id.in_(store_id)
        wrk_store_filter = Worker.store_id.in_(store_id)
        opt_store_filter = Optician.store_id.in_(store_id)
    else:
        mgr_store_filter = Manager.store_id == store_id
        wrk_store_filter = Worker.store_id == store_id
        opt_store_filter = Optician.store_id == store_id

    managers = []
    workers = []
    opticians = []
    
    roles_to_query = [role.lower().strip()] if role else ["manager", "worker", "optician"]
    
    if "manager" in roles_to_query:
        stmt = select(Manager).where(mgr_store_filter, Manager.deleted_at.is_(None))
        if is_active is not None:
            stmt = stmt.where(Manager.is_active == is_active)
        if search:
            search_filter = (
                Manager.first_name.ilike(f"%{search}%") |
                Manager.last_name.ilike(f"%{search}%") |
                Manager.email.ilike(f"%{search}%") |
                Manager.phone.ilike(f"%{search}%") |
                Manager.employee_code.ilike(f"%{search}%")
            )
            stmt = stmt.where(search_filter)
        res = await db.execute(stmt)
        managers = [
            {
                "id": m.id,
                "store_id": m.store_id,
                "store_name": store_names_map.get(m.store_id, "Unknown Store"),
                "role": "manager",
                "first_name": m.first_name,
                "last_name": m.last_name,
                "email": m.email,
                "phone": m.phone,
                "profile_image": m.profile_image,
                "employee_code": m.employee_code,
                "pf_number": m.pf_number,
                "joining_date": m.joining_date,
                "is_active": m.is_active,
                "last_login_at": m.last_login_at,
                "created_at": m.created_at,
                "updated_at": m.updated_at,
            }
            for m in res.scalars().all()
        ]
        
    if "worker" in roles_to_query:
        stmt = select(Worker).where(wrk_store_filter, Worker.deleted_at.is_(None))
        if is_active is not None:
            stmt = stmt.where(Worker.is_active == is_active)
        if search:
            search_filter = (
                Worker.first_name.ilike(f"%{search}%") |
                Worker.last_name.ilike(f"%{search}%") |
                Worker.email.ilike(f"%{search}%") |
                Worker.phone.ilike(f"%{search}%") |
                Worker.employee_code.ilike(f"%{search}%")
            )
            stmt = stmt.where(search_filter)
        res = await db.execute(stmt)
        workers = [
            {
                "id": w.id,
                "store_id": w.store_id,
                "store_name": store_names_map.get(w.store_id, "Unknown Store"),
                "role": "worker",
                "first_name": w.first_name,
                "last_name": w.last_name,
                "email": w.email,
                "phone": w.phone,
                "profile_image": w.profile_image,
                "employee_code": w.employee_code,
                "pf_number": w.pf_number,
                "joining_date": w.joining_date,
                "is_active": w.is_active,
                "last_login_at": w.last_login_at,
                "created_at": w.created_at,
                "updated_at": w.updated_at,
            }
            for w in res.scalars().all()
        ]
        
    if "optician" in roles_to_query:
        stmt = select(Optician).where(opt_store_filter, Optician.deleted_at.is_(None))
        if is_active is not None:
            stmt = stmt.where(Optician.is_active == is_active)
        if search:
            search_filter = (
                Optician.first_name.ilike(f"%{search}%") |
                Optician.last_name.ilike(f"%{search}%") |
                Optician.email.ilike(f"%{search}%") |
                Optician.phone.ilike(f"%{search}%") |
                Optician.employee_code.ilike(f"%{search}%")
            )
            stmt = stmt.where(search_filter)
        res = await db.execute(stmt)
        opticians = [
            {
                "id": o.id,
                "store_id": o.store_id,
                "store_name": store_names_map.get(o.store_id, "Unknown Store"),
                "role": "optician",
                "first_name": o.first_name,
                "last_name": o.last_name,
                "email": o.email,
                "phone": o.phone,
                "profile_image": o.profile_image,
                "employee_code": o.employee_code,
                "pf_number": o.pf_number,
                "joining_date": o.joining_date,
                "is_active": o.is_active,
                "qualification": o.qualification,
                "last_login_at": o.last_login_at,
                "created_at": o.created_at,
                "updated_at": o.updated_at,
            }
            for o in res.scalars().all()
        ]
        
    combined = managers + workers + opticians
    combined.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Deduplicate by email (fallback to employee_code or phone if email missing)
    seen = set()
    unique_staff = []
    for member in combined:
        # Create a unique key for the person
        key = member.get("email") or member.get("employee_code") or member.get("phone")
        if key not in seen:
            seen.add(key)
            unique_staff.append(member)
    
    total = len(unique_staff)
    
    if paginate:
        unique_staff = unique_staff[offset : offset + limit]
        
    return unique_staff, total
