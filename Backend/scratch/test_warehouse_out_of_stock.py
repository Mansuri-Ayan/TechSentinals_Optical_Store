import asyncio
import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from sqlalchemy import select
from db.session import get_db
from services.inventory_service import get_inventories_by_owner

async def main():
    async for db in get_db():
        # Query out of stock items
        res_dict = await get_inventories_by_owner(
            db,
            owner_type="ADMIN",
            owner_id=1,
            active_only=True,
            stock_status="out_of_stock",
            warehouse_only=True,
            paginate=False
        )
        print("Out of Stock items returned:")
        for item in res_dict["items"]:
            print(f"- ID: {item.id}, Product ID: {item.product_id}, Qty: {item.quantity}, Available Qty: {item.available_quantity}")
        print(f"Total stats - Out of Stock count: {res_dict.get('out_of_stock_count')}")

if __name__ == "__main__":
    asyncio.run(main())
