"""Quick script to add pf_number columns directly via SQL."""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def run_migration():
    import asyncpg
    
    db_url = os.getenv("DATABASE_URL", "")
    raw_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    print("Connecting to database...")
    conn = await asyncpg.connect(raw_url, ssl="require")
    
    try:
        for table in ["managers", "workers", "opticians"]:
            exists = await conn.fetchval(f"""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = '{table}' AND column_name = 'pf_number'
                )
            """)
            if exists:
                print(f"  OK {table}.pf_number already exists")
            else:
                await conn.execute(f"ALTER TABLE {table} ADD COLUMN pf_number VARCHAR(50) DEFAULT NULL")
                print(f"  ADDED {table}.pf_number")
        
        current = await conn.fetchval("SELECT version_num FROM alembic_version")
        print(f"Current alembic revision: {current}")
        if current == "daeaaad90134":
            await conn.execute("UPDATE alembic_version SET version_num = 'f3a1b2c4d5e6'")
            print("Updated alembic revision to: f3a1b2c4d5e6")
    finally:
        await conn.close()
    
    print("Done!")

asyncio.run(run_migration())
