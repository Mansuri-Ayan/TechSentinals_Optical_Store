# API: purchase_order/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.purchase_order import (
    PurchaseOrderRead,
    PurchaseOrderItemRead,
    SupplierPaymentRead,
)
from services.purchase_order_service import get_purchase_order, list_purchase_orders

router = APIRouter()


def _po_item_to_read(item) -> PurchaseOrderItemRead:
    snap = item.product_snapshot
    return PurchaseOrderItemRead(
        **{c.key: getattr(item, c.key) for c in item.__table__.columns},
        product_snapshot=snap,
        product_name=snap.name if snap else (item.product.name if item.product else None),
        product_sku=snap.sku if snap else (item.product.sku if item.product else None),
        category_name=snap.category_name if snap else (item.product.category.name if item.product and item.product.category else None),
        brand_name=snap.brand_name if snap else (item.product.brand.name if item.product and item.product.brand else None),
    )


def _payment_to_read(p) -> SupplierPaymentRead:
    return SupplierPaymentRead(
        **{c.key: getattr(p, c.key) for c in p.__table__.columns},
    )


def _po_to_read(po, include_nested: bool = True) -> PurchaseOrderRead:
    items = [_po_item_to_read(i) for i in (po.items or [])] if include_nested else []
    payments = [_payment_to_read(p) for p in (po.payments or [])] if include_nested else []
    return PurchaseOrderRead(
        **{c.key: getattr(po, c.key) for c in po.__table__.columns},
        items=items,
        payments=payments,
        supplier_name=po.supplier.company_name if po.supplier else None,
        store_name=po.store.store_name if po.store else None,
    )


@router.get(
    "/",
    response_model=list[PurchaseOrderRead],
    summary="List purchase orders",
    description="List POs for the current admin with optional filters.",
)
async def list_po_endpoint(
    supplier_id: int | None = Query(default=None),
    store_id: int | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    include_nested: bool = Query(default=False),
    has_due: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('purchase_orders', 'read')),
) -> list[PurchaseOrderRead]:
    admin_id = get_user_admin_id(current_user)
    pos = await list_purchase_orders(
        db,
        admin_id=admin_id,
        supplier_id=supplier_id,
        store_id=store_id,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
        include_nested=include_nested,
        has_due=has_due,
    )
    return [_po_to_read(po, include_nested=include_nested) for po in pos]


@router.get(
    "/{po_id}",
    response_model=PurchaseOrderRead,
    summary="Get purchase order",
    description="Get a single PO with items and payments.",
)
async def get_po_endpoint(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('purchase_orders', 'read')),
) -> PurchaseOrderRead:
    admin_id = get_user_admin_id(current_user)
    po = await get_purchase_order(db, po_id)
    if not po or po.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    return _po_to_read(po)
