import asyncio
import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from db.session import async_session_maker
from models.admin import Admin
from models.store import Store
from models.manager import Manager
from sqlalchemy import select
from apis.inventory.read import universal_search_inventories

async def test_universal():
    async with async_session_maker() as db:
        # Get store 33
        store_res = await db.execute(select(Store).where(Store.id == 33))
        store = store_res.scalar_one_or_none()
        if not store:
            print("Store 33 not found.")
            return
        
        print(f"Store 33: {store.store_name}, Admin ID: {store.admin_id}")
        
        # Get admin of store 33
        admin_res = await db.execute(select(Admin).where(Admin.id == store.admin_id))
        admin = admin_res.scalar_one_or_none()
        if not admin:
            print(f"Admin {store.admin_id} not found.")
            return
        
        # Test universal search API logic directly
        try:
            res = await universal_search_inventories(
                owner_type="STORE",
                owner_id=33,
                search="a",
                category_id=None,
                subcategory_id=None,
                brand_id=None,
                stock_status=None,
                page=1,
                limit=20,
                db=db,
                current_user=admin
            )
            print("SUCCESS! Universal Search output:")
            print("Total:", res.total)
            print("Items count:", len(res.items))
        except Exception as e:
            print("ERROR:")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_universal())
