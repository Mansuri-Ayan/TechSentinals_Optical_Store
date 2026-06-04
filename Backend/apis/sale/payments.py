# API: sale/payments.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.sale import SalePaymentCreate, SalePaymentRead
from services.sale_service import get_sale, add_sale_payment

router = APIRouter()


def _payment_to_read(p) -> SalePaymentRead:
    return SalePaymentRead(
        **{c.key: getattr(p, c.key) for c in p.__table__.columns},
    )


@router.post(
    "/{sale_id}/payments",
    response_model=SalePaymentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add payment to sale",
    description="Add a split payment or instalment to an existing sale.",
)
async def add_payment_endpoint(
    sale_id: int,
    payload: SalePaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> SalePaymentRead:
    sale = await get_sale(db, sale_id)
    if not sale or sale.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found",
        )
    payment = await add_sale_payment(db, sale, payload)
    return _payment_to_read(payment)
