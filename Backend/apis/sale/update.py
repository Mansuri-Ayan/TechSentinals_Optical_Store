# API: sale/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from schemas.sale import SaleUpdate, SaleRead, SaleItemRead, SalePaymentRead
from services.sale_service import get_sale, update_sale, cancel_sale
from apis.customer.read import _get_user_admin_id

router = APIRouter()


def _item_to_read(item) -> SaleItemRead:
    return SaleItemRead(
        **{c.key: getattr(item, c.key) for c in item.__table__.columns},
        product_name=item.product.name if item.product else None,
        product_sku=item.product.sku if item.product else None,
    )


def _payment_to_read(p) -> SalePaymentRead:
    return SalePaymentRead(
        **{c.key: getattr(p, c.key) for c in p.__table__.columns},
    )


def _sale_to_read(sale) -> SaleRead:
    customer_name = None
    if sale.customer:
        customer_name = f"{sale.customer.first_name} {sale.customer.last_name or ''}".strip()
    return SaleRead(
        **{c.key: getattr(sale, c.key) for c in sale.__table__.columns},
        items=[_item_to_read(i) for i in (sale.items or [])],
        payments=[_payment_to_read(p) for p in (sale.payments or [])],
        store_name=sale.store.store_name if sale.store else None,
        customer_name=customer_name,
    )


@router.put(
    "/{sale_id}",
    response_model=SaleRead,
    summary="Update sale",
    description="Update sale status or notes.",
)
async def update_sale_endpoint(
    sale_id: int,
    payload: SaleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> SaleRead:
    admin_id = _get_user_admin_id(current_user)
    sale = await get_sale(db, sale_id)
    if not sale or sale.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found",
        )
    # Scoping check
    if not isinstance(current_user, Admin):
        if sale.store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this store's sale records.",
            )
    updated = await update_sale(db, sale, payload)
    return _sale_to_read(updated)


@router.post(
    "/{sale_id}/cancel",
    response_model=SaleRead,
    summary="Cancel sale",
    description="Cancel a sale and reverse all inventory movements.",
)
async def cancel_sale_endpoint(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> SaleRead:
    admin_id = _get_user_admin_id(current_user)
    sale = await get_sale(db, sale_id)
    if not sale or sale.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found",
        )
    # Scoping check
    if not isinstance(current_user, Admin):
        if sale.store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this store's sale records.",
            )
    cancelled = await cancel_sale(db, sale, cancelled_by=current_user.id)
    return _sale_to_read(cancelled)
