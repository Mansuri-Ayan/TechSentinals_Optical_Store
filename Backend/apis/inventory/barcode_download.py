"""
Barcode Download API
====================
POST endpoint to generate and download a PDF of 1D barcode labels
for product units in a batch (or a specific selection of units).
"""

import os
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.product_unit import ProductUnit, UnitStatus
from models.product import Product
from models.inventory import Inventory, OwnerType
from models.store import Store
from services.barcode_service import generate_barcode_pdf

router = APIRouter()


class BarcodePdfRequest(BaseModel):
    product_id: int
    inventory_batch_id: Optional[int] = None
    unit_skus: Optional[List[str]] = None


def _cleanup_temp_file(path: str):
    """Remove the temporary PDF file after it has been sent."""
    try:
        if os.path.exists(path):
            os.unlink(path)
    except OSError:
        pass


@router.post("/barcode-pdf")
async def download_barcode_pdf(
    payload: BarcodePdfRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("inventory", "read")),
):
    """
    Generate a PDF with 1D Code 128 barcode labels for product units.

    - If `unit_skus` is provided → generate for those specific units only.
    - If `unit_skus` is empty/null → generate for AVAILABLE units in the given batch.
    """
    admin_id = get_user_admin_id(current_user)

    # ── Fetch product info ────────────────────────────────────────────────────
    product = await db.scalar(
        select(Product).where(Product.id == payload.product_id)
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {payload.product_id} not found",
        )

    # ── Fetch units ───────────────────────────────────────────────────────────
    if payload.unit_skus and len(payload.unit_skus) > 0:
        # Specific units selected by user
        stmt = (
            select(ProductUnit)
            .where(
                ProductUnit.product_id == payload.product_id,
                ProductUnit.unit_sku.in_(payload.unit_skus),
            )
            .options(selectinload(ProductUnit.inventory_batch))
            .order_by(ProductUnit.id.asc())
        )
    elif payload.inventory_batch_id:
        # AVAILABLE units in a specific batch
        stmt = (
            select(ProductUnit)
            .where(
                ProductUnit.product_id == payload.product_id,
                ProductUnit.inventory_batch_id == payload.inventory_batch_id,
                ProductUnit.status == UnitStatus.AVAILABLE,
            )
            .options(selectinload(ProductUnit.inventory_batch))
            .order_by(ProductUnit.id.asc())
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either unit_skus or inventory_batch_id must be provided",
        )

    result = await db.execute(stmt)
    units = list(result.scalars().all())

    if not units:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No units found for the given criteria",
        )

    # ── Check role-based and store-based permissions ──
    from models.admin import Admin
    if not isinstance(current_user, Admin):
        from models.worker import Worker
        from models.optician import Optician
        from models.accountant import Accountant

        is_store_scoped = isinstance(current_user, (Worker, Optician)) or (isinstance(current_user, Accountant) and current_user.store_id is not None)
    else:
        is_store_scoped = False

    for unit in units:
        if is_store_scoped:
            if unit.owner_type != OwnerType.STORE or unit.owner_id != current_user.store_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to one or more units",
                )
        
        if unit.owner_type == OwnerType.ADMIN:
            unit_admin_id = unit.owner_id
        else:
            store = await db.scalar(select(Store).where(Store.id == unit.owner_id))
            unit_admin_id = store.admin_id if store else None

        if unit_admin_id != admin_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to one or more units",
            )

    # ── Resolve batch labels & store name ─────────────────────────────────────
    batch_ids = list({u.inventory_batch_id for u in units})
    batch_labels = [f"#{bid}" for bid in sorted(batch_ids)]

    # Determine store name from the first unit's owner
    store_name = "Admin Warehouse"
    first_unit = units[0]
    if first_unit.owner_type == OwnerType.STORE:
        store = await db.scalar(
            select(Store).where(Store.id == first_unit.owner_id)
        )
        if store:
            store_name = store.store_name

    # ── Generate PDF ──────────────────────────────────────────────────────────
    unit_dicts = [{"unit_sku": u.unit_sku} for u in units]

    pdf_path = generate_barcode_pdf(
        units=unit_dicts,
        product_name=product.name or "Product",
        product_sku=product.sku or "",
        batch_labels=batch_labels,
        store_name=store_name,
    )

    # Schedule cleanup of the temp file after response is sent
    background_tasks.add_task(_cleanup_temp_file, pdf_path)

    # Build filename
    from datetime import datetime
    date_str = datetime.now().strftime("%Y-%m-%d")
    if len(batch_ids) == 1:
        filename = f"barcodes_batch{batch_ids[0]}_{date_str}.pdf"
    else:
        filename = f"barcodes_selected_{date_str}.pdf"

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=filename,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )
