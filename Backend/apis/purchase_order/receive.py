# API: purchase_order/receive.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.purchase_order import (
    GoodsReceiptCreate,
    PurchaseOrderRead,
    PurchaseOrderItemRead,
    SupplierPaymentRead,
)
from services.purchase_order_service import get_purchase_order, receive_goods

router = APIRouter()


def _po_item_to_read(item) -> PurchaseOrderItemRead:
    snap = item.product_snapshot
    return PurchaseOrderItemRead(
        **{c.key: getattr(item, c.key) for c in item.__table__.columns},
        product_snapshot=snap,
        product_name=snap.name if snap else (item.product.name if item.product else None),
        product_sku=snap.sku if snap else (item.product.sku if item.product else None),
    )


def _payment_to_read(p) -> SupplierPaymentRead:
    return SupplierPaymentRead(
        **{c.key: getattr(p, c.key) for c in p.__table__.columns},
    )


def _po_to_read(po) -> PurchaseOrderRead:
    return PurchaseOrderRead(
        **{c.key: getattr(po, c.key) for c in po.__table__.columns},
        items=[_po_item_to_read(i) for i in (po.items or [])],
        payments=[_payment_to_read(p) for p in (po.payments or [])],
        supplier_name=po.supplier.company_name if po.supplier else None,
        store_name=po.store.store_name if po.store else None,
    )


@router.post(
    "/{po_id}/receive",
    response_model=PurchaseOrderRead,
    summary="Record goods receipt",
    description=(
        "Record partial or full goods receipt for a PO. "
        "Auto-creates inventory transactions and updates PO status."
    ),
)
async def receive_goods_endpoint(
    po_id: int,
    payload: GoodsReceiptCreate,
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
    await receive_goods(
        db, po, payload, created_by=admin_id,
    )
    # Reload with all relations
    updated_po = await get_purchase_order(db, po_id)
    return _po_to_read(updated_po)
