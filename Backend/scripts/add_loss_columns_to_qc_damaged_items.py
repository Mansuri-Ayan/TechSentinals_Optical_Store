import sys
sys.path.insert(0, ".")
import asyncio
from db.session import async_session_maker
from sqlalchemy import text

async def run_migration():
    print("Starting migration: Add loss_reason and loss_amount to qc_damaged_items...")
    async with async_session_maker() as session:
        # Check if columns already exist
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'qc_damaged_items' 
              AND column_name IN ('loss_reason', 'loss_amount');
        """)
        res = await session.execute(check_query)
        existing_cols = [row[0] for row in res.fetchall()]
        print(f"Existing loss columns: {existing_cols}")

        if 'loss_reason' not in existing_cols:
            print("Adding column loss_reason to qc_damaged_items...")
            await session.execute(text("""
                ALTER TABLE qc_damaged_items 
                ADD COLUMN loss_reason VARCHAR(255) NULL;
            """))
            print("Added loss_reason successfully.")

        if 'loss_amount' not in existing_cols:
            print("Adding column loss_amount to qc_damaged_items...")
            await session.execute(text("""
                ALTER TABLE qc_damaged_items 
                ADD COLUMN loss_amount NUMERIC(12, 2) NULL;
            """))
            print("Added loss_amount successfully.")

        await session.commit()
        print("Migration committed successfully.")

if __name__ == "__main__":
    asyncio.run(run_migration())
