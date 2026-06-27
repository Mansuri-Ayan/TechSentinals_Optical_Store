# API: sale/create.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from schemas.sale import SaleCreate, SaleRead, SaleItemRead, SalePaymentRead
from services.sale_service import create_sale

router = APIRouter()


def _item_to_read(item) -> SaleItemRead:
    snap = item.product_snapshot
    return SaleItemRead(
        **{c.key: getattr(item, c.key) for c in item.__table__.columns},
        product_snapshot=snap,
        product_name=snap.name if snap else (item.product.name if item.product else None),
        product_sku=snap.sku if snap else (item.product.sku if item.product else None),
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


@router.post(
    "/",
    response_model=SaleRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create sale",
    description=(
        "Create a sale atomically with items and payments. "
        "Auto-decrements inventory and creates sale transactions."
    ),
)
async def create_sale_endpoint(
    payload: SaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> SaleRead:
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = current_user.store.admin_id
        if payload.store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: cannot log sales for another store",
            )
    sale = await create_sale(db, admin_id=admin_id, payload=payload)
    return _sale_to_read(sale)
