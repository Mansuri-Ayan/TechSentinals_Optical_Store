# Scratch: verify_debug.py
import asyncio
import sys
from pathlib import Path
from decimal import Decimal
from datetime import date

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from db.session import async_session_maker
from services.sale_service import create_sale
from schemas.sale import SaleCreate, SaleItemCreate, SalePaymentCreate, StaffTypeEnum, SalePaymentMethodEnum


async def debug_sale():
    async with async_session_maker() as db:
        # Create a mock SaleCreate payload
        payload = SaleCreate(
            store_id=1,
            customer_id=1,
            sold_by_type=StaffTypeEnum.MANAGER,
            sold_by_id=1,
            sale_date=date(2026, 6, 9),
            items=[
                SaleItemCreate(
                    product_id=1,
                    inventory_id=1,
                    quantity=1,
                    unit_price=Decimal("1500.00"),
                )
            ],
            payments=[
                SalePaymentCreate(
                    amount=Decimal("1500.00"),
                    payment_method=SalePaymentMethodEnum.CASH,
                    remarks="Paid in full"
                )
            ]
        )
        try:
            print("Calling create_sale...")
            sale = await create_sale(db, admin_id=1, payload=payload)
            print("SUCCESS! Created sale:", sale.invoice_number)
        except Exception as e:
            print("ERROR:")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(debug_sale())
