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
from models.worker import Worker
from models.optician import Optician
from sqlalchemy import select
from apis.inventory.read import universal_search_inventories

async def test_universal():
    async with async_session_maker() as db:
        try:
            print("Querying staff members directly from database...")
            # Query all workers
            workers_res = await db.execute(select(Worker))
            workers_list = workers_res.scalars().all()
            print(f"Total Workers in DB: {len(workers_list)}")

            # Query all managers
            managers_res = await db.execute(select(Manager))
            managers_list = managers_res.scalars().all()
            print(f"Total Managers in DB: {len(managers_list)}")

            # Query all opticians
            opticians_res = await db.execute(select(Optician))
            opticians_list = opticians_res.scalars().all()
            print(f"Total Opticians in DB: {len(opticians_list)}")

            # Test the service function
            print("Testing get_staff_by_store service function...")
            staff_items, total = await get_staff_by_store(
                db,
                store_id=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                page=1,
                limit=20,
                paginate=True
            )
            print(f"Service returned total: {total}, items returned: {len(staff_items)}")
            if staff_items:
                print("First staff item format:", staff_items[0])
                # Try to validate
                from schemas.staff import StaffRead
                validated = StaffRead.model_validate(staff_items[0])
                print("First staff item successfully validated with StaffRead!")
        except Exception as e:
            print("DIAGNOSTIC ERROR:")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_universal())
