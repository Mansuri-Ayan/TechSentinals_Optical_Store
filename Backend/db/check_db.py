import asyncio
from sqlalchemy import select, func
from db.session import async_session_maker
from models.admin import Admin
from models.store import Store
from models.sale import Sale

async def check():
    async with async_session_maker() as session:
        admins = (await session.execute(select(func.count(Admin.id)))).scalar()
        stores = (await session.execute(select(func.count(Store.id)))).scalar()
        sales = (await session.execute(select(func.count(Sale.id)))).scalar()
        print(f"Admins count: {admins}")
        print(f"Stores count: {stores}")
        print(f"Sales count: {sales}")

if __name__ == "__main__":
    asyncio.run(check())
