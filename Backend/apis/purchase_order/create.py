# API: purchase_order/create.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderRead, PurchaseOrderItemRead
from services.purchase_order_service import create_purchase_order, get_purchase_order

router = APIRouter()


def _po_item_to_read(item) -> PurchaseOrderItemRead:
    return PurchaseOrderItemRead(
        **{c.key: getattr(item, c.key) for c in item.__table__.columns},
        product_name=item.product.name if item.product else None,
        product_sku=item.product.sku if item.product else None,
    )


def _po_to_read(po) -> PurchaseOrderRead:
    return PurchaseOrderRead(
        **{c.key: getattr(po, c.key) for c in po.__table__.columns},
        items=[_po_item_to_read(i) for i in (po.items or [])],
        payments=[],
        supplier_name=po.supplier.company_name if po.supplier else None,
        store_name=po.store.store_name if po.store else None,
    )


@router.post(
    "/",
    response_model=PurchaseOrderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create purchase order",
    description="Create a PO with line items. Auto-generates PO number and computes totals.",
)
async def create_po_endpoint(
    payload: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> PurchaseOrderRead:
    po = await create_purchase_order(
        db,
        admin_id=current_admin.id,
        created_by=current_admin.id,
        payload=payload,
    )
    # Reload with all relations
    po = await get_purchase_order(db, po.id)
    return _po_to_read(po)
