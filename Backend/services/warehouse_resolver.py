# Service: warehouse_resolver.py
"""
Warehouse Resolver — central helper that determines the effective
warehouse identity for an Admin based on their warehouse_enabled setting.

When warehouse_enabled=True:  owner_type='ADMIN', owner_id=admin.id
When warehouse_enabled=False: owner_type='STORE', owner_id=main_store.id
"""
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models.admin import Admin
from services.store_service import get_main_store


async def resolve_warehouse(db: AsyncSession, admin_id: int) -> dict:
    """
    Returns the effective warehouse identity for the admin.

    Returns a dict with:
        owner_type: 'ADMIN' or 'STORE'
        owner_id: admin.id or main_store.id
        store_id: None (dedicated warehouse PO) or main_store.id
        label: 'Admin Warehouse' or main_store.store_name
        is_dedicated_warehouse: True or False
    """
    admin = await db.get(Admin, admin_id)
    if admin is None:
        raise HTTPException(status_code=404, detail="Admin not found")

    if admin.warehouse_enabled:
        return {
            "owner_type": "ADMIN",
            "owner_id": admin_id,
            "store_id": None,
            "label": "Admin Warehouse",
            "is_dedicated_warehouse": True,
        }
    else:
        main_store = await get_main_store(db, admin_id)
        if not main_store:
            raise HTTPException(
                status_code=400,
                detail="No Main Store designated. Cannot resolve warehouse."
            )
        return {
            "owner_type": "STORE",
            "owner_id": main_store.id,
            "store_id": main_store.id,
            "label": main_store.store_name,
            "is_dedicated_warehouse": False,
        }
