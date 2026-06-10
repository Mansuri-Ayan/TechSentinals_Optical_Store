import asyncio
import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from db.session import async_session_maker
from sqlalchemy import select
from models.inventory import Inventory
from models.store import Store

async def check_data():
    async with async_session_maker() as db:
        # Get all stores
        stores_result = await db.execute(select(Store))
        stores = stores_result.scalars().all()
        print(f"Total stores found: {len(stores)}")
        for store in stores:
            # Query inventory for this store
            inv_result = await db.execute(select(Inventory).where(Inventory.owner_type == 'STORE', Inventory.owner_id == store.id))
            invs = inv_result.scalars().all()
            print(f"Store {store.id} ({store.store_name}) has {len(invs)} inventory items:")
            for inv in invs:
                print(f"  - Inventory ID: {inv.id}, Product ID: {inv.product_id}, Qty: {inv.quantity}, Available: {inv.available_quantity}")

if __name__ == "__main__":
    asyncio.run(check_data())
