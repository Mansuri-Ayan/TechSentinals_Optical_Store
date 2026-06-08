import asyncio
import sys
from pathlib import Path
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
    Customer, Sale, SaleItem, SalePayment
)
from db.seed_data import seed
async def recreate_db():
    print("=" * 60)
    print("  Re-creating Database Tables")
    print("=" * 60)
    
    async with engine.begin() as conn:
        print("  Dropping all existing tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("  Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
        
    print("  [OK] Re-creation complete. Running seeds...")
    await seed()
if __name__ == "__main__":
    asyncio.run(recreate_db())