# API: exchange/create.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission
from db.session import get_db
from models.admin import Admin
from schemas.exchange import ExchangeCreate, ExchangeRead
from schemas.sale import SaleRead, SaleItemRead, SalePaymentRead
from services.exchange_service import create_exchange

router = APIRouter()


def _item_to_read(item) -> SaleItemRead:
    snap = item.product_snapshot
    return SaleItemRead(
        **{c.key: getattr(item, c.key) for c in item.__table__.columns},
        product_snapshot=snap,
        product_name=snap.name if snap else (item.product.name if item.product else None),
        product_sku=snap.sku if snap else (item.product.sku if item.product else None),
        unit_skus=item.unit_skus,
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


def _exchange_to_read(exc) -> ExchangeRead:
    cust_name = None
    cust_phone = None
    if exc.customer:
        cust_name = f"{exc.customer.first_name} {exc.customer.last_name or ''}".strip()
        cust_phone = exc.customer.phone
    
    orig_invoice = exc.original_sale.invoice_number if exc.original_sale else None
    new_invoice = exc.new_sale.invoice_number if exc.new_sale else None
    
    orig_prod_name = None
    orig_prod_sku = None
    if exc.original_sale_item and exc.original_sale_item.product_snapshot:
        orig_prod_name = exc.original_sale_item.product_snapshot.name
        orig_prod_sku = exc.original_sale_item.product_snapshot.sku
    elif exc.original_sale_item and exc.original_sale_item.product:
        orig_prod_name = exc.original_sale_item.product.name
        orig_prod_sku = exc.original_sale_item.product.sku

    new_sale_read = None
    if exc.new_sale:
        new_sale_read = _sale_to_read(exc.new_sale)

    return ExchangeRead(
        **{c.key: getattr(exc, c.key) for c in exc.__table__.columns},
        customer_name=cust_name,
        customer_phone=cust_phone,
        store_name=exc.store.store_name if exc.store else None,
        original_invoice_number=orig_invoice,
        new_invoice_number=new_invoice,
        original_product_name=orig_prod_name,
        original_product_sku=orig_prod_sku,
        new_sale=new_sale_read,
    )


@router.post(
    "/",
    response_model=ExchangeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create Exchange",
    description="Atomically record return of old item and sale of new items under exchange",
)
async def create_exchange_endpoint(
    payload: ExchangeCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("exchanges", "create")),
) -> ExchangeRead:
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = current_user.store.admin_id
        if payload.store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: cannot process exchange for another store",
            )
            
    exchange = await create_exchange(db, admin_id=admin_id, payload=payload)
    return _exchange_to_read(exchange)
