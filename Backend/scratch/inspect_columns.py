import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

async def inspect_db():
    import asyncpg
    
    db_url = os.getenv("DATABASE_URL", "")
    raw_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    output = []
    output.append(f"Connecting to database: {raw_url.split('@')[-1]}")
    conn = await asyncpg.connect(raw_url, ssl="require")
    
    try:
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        output.append("\nTables in database:")
        for t in tables:
            output.append(f" - {t['table_name']}")
            
        output.append("\nChecking columns for managers, workers, opticians:")
        for table in ["managers", "workers", "opticians"]:
            columns = await conn.fetch(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{table}'
            """)
            output.append(f"\nTable: {table}")
            if not columns:
                output.append("  (Table does not exist or has no columns)")
            for col in columns:
                output.append(f"  - {col['column_name']}: {col['data_type']}")
    finally:
        await conn.close()
        
    out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "inspect_output.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(output))
    print(f"Output written to: {out_path}")

asyncio.run(inspect_db())
