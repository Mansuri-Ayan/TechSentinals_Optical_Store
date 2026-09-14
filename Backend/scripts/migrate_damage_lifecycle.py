import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from db.session import async_session_maker

async def migrate():
    async with async_session_maker() as db:
        print("Starting damage lifecycle database migration...")
        
        # 1. Add columns to qc_damaged_items
        add_columns_sql = text("""
            ALTER TABLE qc_damaged_items 
            ADD COLUMN IF NOT EXISTS is_promise_pending BOOLEAN DEFAULT FALSE NOT NULL,
            ADD COLUMN IF NOT EXISTS expected_resolution_date DATE,
            ADD COLUMN IF NOT EXISTS reopen_count INTEGER DEFAULT 0 NOT NULL,
            ADD COLUMN IF NOT EXISTS last_reopened_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS last_reopened_reason TEXT;
        """)
        await db.execute(add_columns_sql)
        print("Columns added to qc_damaged_items successfully.")

        # 2. Create qc_damaged_item_histories table
        create_table_sql = text("""
            CREATE TABLE IF NOT EXISTS qc_damaged_item_histories (
                id BIGSERIAL PRIMARY KEY,
                damaged_item_id BIGINT NOT NULL REFERENCES qc_damaged_items(id) ON DELETE CASCADE,
                changed_by_id BIGINT NOT NULL,
                changed_by_type VARCHAR(50) NOT NULL,
                changed_by_name VARCHAR(150),
                action VARCHAR(50) NOT NULL,
                previous_status VARCHAR(50),
                new_status VARCHAR(50) NOT NULL,
                previous_resolution_type VARCHAR(50),
                new_resolution_type VARCHAR(50),
                previous_compensation_amount NUMERIC(12, 2),
                new_compensation_amount NUMERIC(12, 2),
                reason TEXT,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            )
        """)
        await db.execute(create_table_sql)
        print("Table qc_damaged_item_histories created successfully.")

        create_index_sql = text("""
            CREATE INDEX IF NOT EXISTS ix_qc_damaged_item_histories_damaged_item_id 
            ON qc_damaged_item_histories(damaged_item_id)
        """)
        await db.execute(create_index_sql)
        print("Index created successfully.")

        await db.commit()
        print("Migration committed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
