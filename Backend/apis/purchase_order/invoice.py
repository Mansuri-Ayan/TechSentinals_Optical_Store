# API: purchase_order/invoice.py
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from core.deps import require_permission, get_user_admin_id
from models.admin import Admin
from services.purchase_order_service import get_purchase_order
from services.bill_service import update_invoice_for_po
from services.pdf_bill_service import generate_po_invoice_pdf

router = APIRouter()

@router.get(
    "/{po_id}/invoice",
    summary="Get Purchase Order Invoice HTML",
    description="Fetch stored HTML invoice for a Purchase Order (Temporary vs Final). Auto-generates if not present.",
)
async def get_po_invoice_endpoint(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("purchase_orders", "read")),
):
    admin_id = get_user_admin_id(current_user)
    po = await get_purchase_order(db, po_id=po_id)
    if not po or po.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )

    if not isinstance(current_user, Admin) and po.store_id and po.store_id != current_user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's purchase order invoice.",
        )

    inv = await update_invoice_for_po(db, po_id=po_id, commit=True)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate purchase order invoice",
        )

    return {
        "purchase_order_id": po_id,
        "invoice_number": inv.invoice_number,
        "is_final": inv.is_final,
        "due_amount": float(po.due_amount or 0),
        "html_content": inv.html_content,
    }


@router.get(
    "/{po_id}/invoice/download",
    summary="Download Purchase Order Invoice PDF",
    description="Download the PO invoice (Temporary or Final) as a PDF document.",
)
async def download_po_invoice_endpoint(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("purchase_orders", "read")),
):
    admin_id = get_user_admin_id(current_user)
    po = await get_purchase_order(db, po_id=po_id)
    if not po or po.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )

    if not isinstance(current_user, Admin) and po.store_id and po.store_id != current_user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's purchase order invoice.",
        )

    pdf_bytes = await generate_po_invoice_pdf(po, db)

    is_final = float(po.due_amount or 0) <= 0
    prefix = "Final_Purchase_Invoice" if is_final else "Temporary_Purchase_Invoice"
    filename = f"{prefix}_{po.po_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
