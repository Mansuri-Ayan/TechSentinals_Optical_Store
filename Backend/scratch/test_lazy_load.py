import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.session import async_session_maker
from services.transfer_service import purchase_stock
from apis.transfer.operations import _txn_to_read
from sqlalchemy import select
from models.admin import Admin
from models.product import Product

async def test():
    async with async_session_maker() as db:
        # Get first admin
        admin = (await db.execute(select(Admin))).scalars().first()
        product = (await db.execute(select(Product))).scalars().first()
        if not admin or not product:
            print("No admin or product found")
            return
        
        print(f"Creating purchase of product {product.name} (ID: {product.id}) by admin {admin.email}...")
        try:
            txn = await purchase_stock(
                db,
                admin_id=admin.id,
                product_id=product.id,
                quantity=10,
                purchase_price=150.0,
                created_by=admin.id,
                remarks="Test purchase"
            )
            print("Purchase recorded. Converting to TransactionRead...")
            read = _txn_to_read(txn)
            print("Success! Read fields:", read.product_name, read.send_store_name)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
