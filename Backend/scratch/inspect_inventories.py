import asyncio
from sqlalchemy import select
from db.session import get_db
from models.inventory import Inventory
from services.inventory_service import get_inventories_by_owner

async def main():
    async for db in get_db():
        # Find one inventory record
        stmt = select(Inventory).limit(1)
        res = await db.execute(stmt)
        item = res.scalar_one_or_none()
        if not item:
            print("No inventory records found.")
            return
            
        print(f"Testing with inventory ID={item.id}, OwnerType={item.owner_type}, OwnerID={item.owner_id}")
        
        # Backup original quantities
        orig_qty = item.quantity
        orig_aqty = item.available_quantity
        
        # Set quantity to 0
        item.quantity = 0
        item.available_quantity = 0
        await db.flush()
        
        # Call get_inventories_by_owner
        res_dict = await get_inventories_by_owner(
            db,
            owner_type=item.owner_type.value if hasattr(item.owner_type, 'value') else str(item.owner_type),
            owner_id=item.owner_id,
            active_only=True,
            paginate=False
        )
        
        found = any(x.id == item.id for x in res_dict["items"])
        print(f"Is the item returned in the list? {found}")
        print(f"Out of stock count in stats: {res_dict.get('out_of_stock_count')}")
        
        # Rollback changes so database is untouched
        await db.rollback()

if __name__ == "__main__":
    asyncio.run(main())
