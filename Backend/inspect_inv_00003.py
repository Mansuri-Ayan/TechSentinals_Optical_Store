import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from db.session import engine
from models.sale import Sale
from models.sale_item import SaleItem
from models.product_unit import ProductUnit

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(select(Sale.id, Sale.invoice_number, Sale.store_id).where(Sale.invoice_number == 'INV-2026-00003'))
        sale = res.fetchone()
        print('Sale INV-2026-00003:', sale)
        
        if sale:
            sale_id, inv_num, store_id = sale
            items_res = await conn.execute(select(SaleItem.id, SaleItem.product_id, SaleItem.quantity).where(SaleItem.sale_id == sale_id))
            items = items_res.fetchall()
            for item in items:
                units_res = await conn.execute(select(ProductUnit.unit_sku, ProductUnit.status, ProductUnit.owner_type, ProductUnit.owner_id).where(ProductUnit.sale_item_id == item.id))
                units = units_res.fetchall()
                print(f'Sale {inv_num} Item {item.id} (Prod {item.product_id}): Assigned Units -> {units}')
                
                # Check all units for this product
                all_units_res = await conn.execute(select(ProductUnit.id, ProductUnit.unit_sku, ProductUnit.owner_type, ProductUnit.owner_id, ProductUnit.status, ProductUnit.sale_item_id).where(ProductUnit.product_id == item.product_id).limit(10))
                print(f'   Sample ProductUnits for Prod {item.product_id} -> {all_units_res.fetchall()}')

if __name__ == "__main__":
    asyncio.run(main())
