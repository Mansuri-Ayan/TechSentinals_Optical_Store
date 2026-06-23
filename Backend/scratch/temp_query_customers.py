import asyncio
import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from sqlalchemy import select
from db.session import async_session_maker, engine
from models.customer import Customer

async def query_customers():
    async with async_session_maker() as session:
        result = await session.execute(select(Customer.id, Customer.first_name, Customer.last_name, Customer.admin_id))
        customers = result.all()
        if customers:
            print("Existing Customer IDs:")
            for c_id, f_name, l_name, admin_id in customers:
                print(f"  ID: {c_id}, Name: {f_name} {l_name}, Admin ID: {admin_id}")
        else:
            print("No customers found.")

async def main():
    try:
        await query_customers()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
