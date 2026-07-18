import asyncio
import sys
import os

from sqlalchemy import text
from db.session import engine

async def run():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE inventories ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10, 2) DEFAULT NULL;"))
        print("Column added successfully!")

if __name__ == "__main__":
    asyncio.run(run())
