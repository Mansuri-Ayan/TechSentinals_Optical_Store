# API: purchase_order/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.purchase_order import PurchaseOrderUpdate, PurchaseOrderRead, PurchaseOrderItemRead
from services.purchase_order_service import (
    get_purchase_order,
    update_purchase_order,
    cancel_purchase_order,
)

router = APIRouter()


def _po_item_to_read(item) -> PurchaseOrderItemRead:
    snap = item.product_snapshot
    return PurchaseOrderItemRead(
        **{c.key: getattr(item, c.key) for c in item.__table__.columns},
        product_snapshot=snap,
        product_name=snap.name if snap else (item.product.name if item.product else None),
        product_sku=snap.sku if snap else (item.product.sku if item.product else None),
    )


def _po_to_read(po) -> PurchaseOrderRead:
    return PurchaseOrderRead(
        **{c.key: getattr(po, c.key) for c in po.__table__.columns},
        items=[_po_item_to_read(i) for i in (po.items or [])],
        payments=[],
        supplier_name=po.supplier.company_name if po.supplier else None,
        store_name=po.store.store_name if po.store else None,
    )


@router.put(
    "/{po_id}",
    response_model=PurchaseOrderRead,
    summary="Update purchase order",
    description="Update PO header fields (status, dates, notes).",
)
async def update_po_endpoint(
    po_id: int,
    payload: PurchaseOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('purchase_orders', 'update')),
) -> PurchaseOrderRead:
    admin_id = get_user_admin_id(current_user)
    po = await get_purchase_order(db, po_id)
    if not po or po.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    updated = await update_purchase_order(db, po, payload)
    return _po_to_read(updated)


@router.post(
    "/{po_id}/cancel",
    response_model=PurchaseOrderRead,
    summary="Cancel purchase order",
    description="Cancel a PO that has not been fully received.",
)
async def cancel_po_endpoint(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('purchase_orders', 'update')),
) -> PurchaseOrderRead:
    admin_id = get_user_admin_id(current_user)
    po = await get_purchase_order(db, po_id)
    if not po or po.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    cancelled = await cancel_purchase_order(db, po)
    return _po_to_read(cancelled)
