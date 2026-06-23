import asyncio
import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from sqlalchemy import select
from db.session import async_session_maker, engine
from models.loyalty_config import LoyaltyConfig

async def query_loyalty():
    async with async_session_maker() as session:
        result = await session.execute(select(LoyaltyConfig))
        configs = result.scalars().all()
        if configs:
            print("Existing LoyaltyConfigs:")
            for c in configs:
                print(f"  ID: {c.id}, Store ID: {c.store_id}, Pts/Rupee: {c.points_per_rupee}, Interval: {c.price_interval}, Price Pts: {c.price_points}")
        else:
            print("No loyalty configs found.")

async def main():
    try:
        await query_loyalty()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
