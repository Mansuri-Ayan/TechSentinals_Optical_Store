import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from db.session import async_session_maker

async def migrate():
    async with async_session_maker() as db:
        print("Starting GST product_snapshots migration...")
        
        sql = text("""
            ALTER TABLE product_snapshots 
            ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5, 2);
        """)
        await db.execute(sql)
        await db.commit()
        print("Column gst_percent added to product_snapshots successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
