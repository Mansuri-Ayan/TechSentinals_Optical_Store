import asyncio
import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from sqlalchemy import select
from db.session import get_db, engine
from models.inventory import Inventory
from services.inventory_service import get_inventories_by_owner

async def main():
    async for db in get_db():
        # Find warehouse inventory items
        stmt = select(Inventory).where(Inventory.owner_type == "ADMIN").limit(2)
        res = await db.execute(stmt)
        items = res.scalars().all()
        if not items:
            print("No ADMIN inventory items found.")
            return
        
        # Let's set the first item to 0 quantity
        target = items[0]
        print(f"Setting Inventory ID {target.id} (product ID {target.product_id}) to 0 quantity")
        target.quantity = 0
        target.available_quantity = 0
        await db.commit()
        print("Updated and committed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
