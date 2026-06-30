import asyncio
import sys
import os
from pathlib import Path
from sqlalchemy import text
from alembic.config import Config
from alembic import command

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from db.session import engine, Base
# Import all models to ensure they register on Base.metadata
from models import (
    Role, Admin, Store, Worker, Optician, Manager, RefreshToken,
    Brand, Category, Subcategory, Product, FrameProduct, LensProduct,
    AccessoryProduct, Inventory, InventoryTransaction, Prescription,
    Supplier, SupplierStoreLink, SupplierProduct,
    PurchaseOrder, PurchaseOrderItem, SupplierPayment,
    Customer, Sale, SaleItem, SalePayment,
    Expense, ExpenseCategory, Notification, Repair,
    LoyaltyConfig, StoreCategoryLoyalty, LoyaltyTransaction, Lab
)
from db.seed_data import seed

async def recreate_db():
    print("=" * 60)
    print("  Re-creating Database Tables")
    print("=" * 60)
    
    async with engine.begin() as conn:
        print("  Terminating other connections to optical_db...")
        try:
            await conn.execute(text(
                "SELECT pg_terminate_backend(pg_stat_activity.pid) "
                "FROM pg_stat_activity "
                "WHERE pg_stat_activity.datname = 'optical_db' "
                "AND pid <> pg_backend_pid();"
            ))
        except Exception as e:
            print(f"  Warning: failed to terminate other connections: {e}")
            
        print("  Dropping all existing tables (dropping public schema cascade)...")
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
        print("  Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
        
    print("  [OK] Re-creation complete. Stamping database head...")
    current_dir = Path(__file__).resolve().parent.parent
    alembic_cfg = Config(os.path.join(current_dir, "alembic.ini"))
    alembic_cfg.set_main_option("script_location", os.path.join(current_dir, "migrations"))
    command.stamp(alembic_cfg, "head")

    print("  [OK] Database stamped successfully. Running seeds...")
    await seed()

if __name__ == "__main__":
    asyncio.run(recreate_db())
