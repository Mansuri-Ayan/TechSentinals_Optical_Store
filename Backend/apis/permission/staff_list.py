from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from core.deps import get_current_admin
from models.admin import Admin
from sqlalchemy import select
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from models.accountant import Accountant
from models.store import Store

router = APIRouter()

@router.get("/admin/permissions/staff")
async def get_staff_list(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    stmt_stores = select(Store).where(Store.admin_id == current_admin.id)
    stores = (await db.execute(stmt_stores)).scalars().all()
    store_map = {s.id: s.store_name for s in stores}
    store_ids = list(store_map.keys())

    staff = []
    
    if store_ids:
        # Managers
        stmt = select(Manager).where(Manager.store_id.in_(store_ids))
        for m in (await db.execute(stmt)).scalars().all():
            staff.append({
                "id": m.id,
                "user_type": "MANAGER",
                "first_name": m.first_name,
                "last_name": getattr(m, "last_name", ""),
                "store_name": store_map.get(m.store_id, "Unknown Store")
            })
            
        # Workers
        stmt = select(Worker).where(Worker.store_id.in_(store_ids))
        for w in (await db.execute(stmt)).scalars().all():
            staff.append({
                "id": w.id,
                "user_type": "WORKER",
                "first_name": w.first_name,
                "last_name": getattr(w, "last_name", ""),
                "store_name": store_map.get(w.store_id, "Unknown Store")
            })

        # Opticians
        stmt = select(Optician).where(Optician.store_id.in_(store_ids))
        for o in (await db.execute(stmt)).scalars().all():
            staff.append({
                "id": o.id,
                "user_type": "OPTICIAN",
                "first_name": o.first_name,
                "last_name": getattr(o, "last_name", ""),
                "store_name": store_map.get(o.store_id, "Unknown Store")
            })

    # Accountants
    stmt = select(Accountant).where(Accountant.admin_id == current_admin.id)
    for a in (await db.execute(stmt)).scalars().all():
        store_name = store_map.get(a.store_id, "Business Level") if a.store_id else "Business Level"
        staff.append({
            "id": a.id,
            "user_type": "ACCOUNTANT",
            "first_name": a.first_name,
            "last_name": getattr(a, "last_name", ""),
            "store_name": store_name
        })

    # sort by user_type then name
    staff.sort(key=lambda x: (x["user_type"], x["first_name"]))
    return staff
