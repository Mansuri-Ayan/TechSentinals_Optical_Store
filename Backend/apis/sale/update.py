# API: sale/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission
from db.session import get_db
from models.admin import Admin
from schemas.sale import SaleUpdate, SaleRead, SaleItemRead, SalePaymentRead, SalePartialReturnRequest
from services.sale_service import get_sale, update_sale, cancel_sale, delete_sale, process_partial_return
from apis.customer.read import _get_user_admin_id

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
    customer_phone = None
    customer_address = None
    if sale.customer:
        customer_name = f"{sale.customer.first_name} {sale.customer.last_name or ''}".strip()
        customer_phone = sale.customer.phone
        customer_address = sale.customer.address

    prescription_details = None
    lens_details = None
    if getattr(sale, "prescription", None):
        p = sale.prescription
        prescription_details = {
            "sphRight": p.sph_right or "",
            "cylRight": p.cyl_right or "",
            "axisRight": p.axis_right or "",
            "sphLeft": p.sph_left or "",
            "cylLeft": p.cyl_left or "",
            "axisLeft": p.axis_left or "",
            "addition": p.addition or "",
            "pd": p.pupillary_distance or ""
        }
        lens_details = {
            "type": p.lens_type or "",
            "material": p.lens_material or "",
            "coating": p.lens_coating or ""
        }

    sale_data = {c.key: getattr(sale, c.key) for c in sale.__table__.columns}
    
    from models.sale import SaleStatus
    if sale.lab_status and sale.lab_status != "Delivered":
        if sale.status == SaleStatus.CANCELLED:
            status_display = "Cancelled"
        elif sale.status == SaleStatus.REFUNDED:
            status_display = "Returned"
        else:
            status_display = "Lab Pending"
    else:
        status_map = {
            SaleStatus.COMPLETED: "Completed",
            SaleStatus.CANCELLED: "Cancelled",
            SaleStatus.REFUNDED: "Returned",
            SaleStatus.PENDING: "Unpaid",
            SaleStatus.PARTIALLY_PAID: "Partially Paid",
        }
        status_display = status_map.get(sale.status, "Completed")
    
    sale_data["status"] = status_display

    return SaleRead(
        **sale_data,
        items=[_item_to_read(i) for i in (sale.items or [])],
        payments=[_payment_to_read(p) for p in (sale.payments or [])],
        store_name=sale.store.store_name if sale.store else None,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_address=customer_address,
        prescriptionDetails=prescription_details,
        lensDetails=lens_details,
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
    current_user=Depends(require_permission("sales", "update")),
) -> SaleRead:
    admin_id = _get_user_admin_id(current_user)
    sale = await get_sale(db, sale_id)
    if not sale or sale.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found",
        )
    # Scoping check for store users
    if not isinstance(current_user, Admin):
        if sale.store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to update sale records for another store.",
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
    current_user=Depends(require_permission("sales", "delete")),
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


@router.post(
    "/{sale_id}/partial-return",
    response_model=SaleRead,
    summary="Process partial return",
)
async def partial_return_sale(
    sale_id: int,
    payload: SalePartialReturnRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Admin = Depends(require_permission("SALES_MANAGE")),
):
    admin_id = await _get_user_admin_id(current_user, db)
    sale = await get_sale(db, sale_id)
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found",
        )
    if sale.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot return items from another admin's sale",
        )

    updated = await process_partial_return(db, sale_id, payload, processed_by=current_user.id)
    return _sale_to_read(updated)


@router.delete(
    "/{sale_id}",
    summary="Delete sale and rollback state",
    description="Delete a sale permanently and perform full inventory, product unit, loyalty, and expense rollback.",
)
async def delete_sale_endpoint(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("sales", "delete")),
):
    admin_id = _get_user_admin_id(current_user)
    sale = await get_sale(db, sale_id)
    if not sale or sale.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found",
        )
    if not isinstance(current_user, Admin):
        if sale.store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to delete sale records for another store.",
            )

    await delete_sale(db, sale, deleted_by=current_user.id)
    return {"success": True, "message": "Order cancelled and all inventory rolled back successfully."}
