# Scratch: check_supplier_data.py
import asyncio
import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from sqlalchemy import select
from db.session import async_session_maker
from models.supplier import Supplier
from models.supplier_store_link import SupplierStoreLink
from models.purchase_order import PurchaseOrder


async def main():
    async with async_session_maker() as session:
        # 1. Print all suppliers
        print("--- SUPPLIERS IN DATABASE ---")
        stmt = select(Supplier).where(Supplier.deleted_at.is_(None))
        res = await session.execute(stmt)
        suppliers = res.scalars().all()
        for s in suppliers:
            print(f"ID: {s.id} | Company: {s.company_name} | Contact: {s.contact_person} | Status: {s.status}")
            
            # Print store links for this supplier
            link_stmt = select(SupplierStoreLink).where(
                SupplierStoreLink.supplier_id == s.id,
                SupplierStoreLink.is_active.is_(True)
            )
            link_res = await session.execute(link_stmt)
            links = link_res.scalars().all()
            linked_stores = [l.store_id for l in links]
            print(f"  Linked Stores: {linked_stores}")

        # 2. Print all purchase orders
        print("\n--- PURCHASE ORDERS IN DATABASE ---")
        po_stmt = select(PurchaseOrder)
        po_res = await session.execute(po_stmt)
        pos = po_res.scalars().all()
        for po in pos:
            print(f"PO: {po.po_number} | Supplier ID: {po.supplier_id} | Store ID: {po.store_id} | Total: Rs. {po.total_amount} | Paid: Rs. {po.paid_amount} | Due: Rs. {po.due_amount} | Status: {po.status}")


if __name__ == "__main__":
    asyncio.run(main())
