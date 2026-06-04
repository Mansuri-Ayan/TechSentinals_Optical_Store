# API: sale/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.sale import SaleRead, SaleItemRead, SalePaymentRead
from services.sale_service import get_sale, list_sales

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


def _sale_to_read(sale, include_nested: bool = True) -> SaleRead:
    customer_name = None
    if sale.customer:
        customer_name = f"{sale.customer.first_name} {sale.customer.last_name or ''}".strip()
    items = [_item_to_read(i) for i in (sale.items or [])] if include_nested else []
    payments = [_payment_to_read(p) for p in (sale.payments or [])] if include_nested else []
    return SaleRead(
        **{c.key: getattr(sale, c.key) for c in sale.__table__.columns},
        items=items,
        payments=payments,
        store_name=sale.store.store_name if sale.store else None,
        customer_name=customer_name,
    )


@router.get(
    "/",
    response_model=list[SaleRead],
    summary="List sales",
    description="List sales with optional filters (store, customer, status, date range).",
)
async def list_sales_endpoint(
    store_id: int | None = Query(default=None),
    customer_id: int | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[SaleRead]:
    sales = await list_sales(
        db,
        admin_id=current_admin.id,
        store_id=store_id,
        customer_id=customer_id,
        status_filter=status_filter,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return [_sale_to_read(s, include_nested=False) for s in sales]


@router.get(
    "/{sale_id}",
    response_model=SaleRead,
    summary="Get sale",
    description="Get a single sale with items and payments.",
)
async def get_sale_endpoint(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> SaleRead:
    sale = await get_sale(db, sale_id)
    if not sale or sale.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found",
        )
    return _sale_to_read(sale)
