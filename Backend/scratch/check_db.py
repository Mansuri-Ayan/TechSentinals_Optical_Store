import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

async def check():
    import asyncpg
    db_url = os.getenv("DATABASE_URL", "")
    raw_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    out_lines = []
    out_lines.append(f"DB URL: {db_url}")
    
    try:
        conn = await asyncpg.connect(raw_url, ssl="require")
        out_lines.append("Connection successful!")
        
        for table in ["managers", "workers", "opticians"]:
            try:
                columns = await conn.fetch(f"""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '{table}'
                """)
                col_info = {r['column_name']: r['data_type'] for r in columns}
                out_lines.append(f"Table {table} columns: {list(col_info.keys())}")
            except Exception as e:
                out_lines.append(f"Error querying {table}: {e}")
                
        await conn.close()
    except Exception as e:
        out_lines.append(f"Failed to connect/query: {e}")
        
    status_file = os.path.join(os.path.dirname(__file__), "db_status.txt")
    with open(status_file, "w") as f:
        f.write("\n".join(out_lines))
    print("Done checking!")

asyncio.run(check())
