# API: purchase_order/payments.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.purchase_order import SupplierPaymentCreate, SupplierPaymentRead
from services.purchase_order_service import (
    get_purchase_order,
    record_supplier_payment,
    list_supplier_payments,
)

router = APIRouter()


def _payment_to_read(p) -> SupplierPaymentRead:
    return SupplierPaymentRead(
        **{c.key: getattr(p, c.key) for c in p.__table__.columns},
    )


@router.post(
    "/{po_id}/payments",
    response_model=SupplierPaymentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record supplier payment",
    description="Record a payment to a supplier against a PO. Updates PO balances.",
)
async def record_payment_endpoint(
    po_id: int,
    payload: SupplierPaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> SupplierPaymentRead:
    po = await get_purchase_order(db, po_id)
    if not po or po.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    payment = await record_supplier_payment(
        db,
        admin_id=current_admin.id,
        po=po,
        created_by=current_admin.id,
        payload=payload,
    )
    return _payment_to_read(payment)


@router.get(
    "/{po_id}/payments",
    response_model=list[SupplierPaymentRead],
    summary="List PO payments",
    description="List all payments recorded against a purchase order.",
)
async def list_payments_endpoint(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[SupplierPaymentRead]:
    po = await get_purchase_order(db, po_id)
    if not po or po.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    payments = await list_supplier_payments(db, po_id)
    return [_payment_to_read(p) for p in payments]
