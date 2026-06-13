import asyncio
from sqlalchemy import select
from db.session import async_session_maker
from models.inventory_transaction import InventoryTransaction

async def main():
    async with async_session_maker() as session:
        stmt = select(InventoryTransaction).where(InventoryTransaction.id == 63)
        res = await session.execute(stmt)
        tx = res.scalar_one_or_none()
        if tx:
            print(f"TX 63: reference_id = {tx.reference_id}")

if __name__ == "__main__":
    asyncio.run(main())
