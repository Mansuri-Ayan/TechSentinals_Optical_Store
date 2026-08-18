from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.supplier import Supplier
from models.supplier_store_link import SupplierStoreLink
from schemas.supplier import SupplierStoreLinkRead

router = APIRouter()


@router.patch(
    "/{supplier_id}/stores/{store_id}/status",
    response_model=SupplierStoreLinkRead,
    summary="Toggle supplier-store link status",
    description="Activate or deactivate a supplier's link to a specific store.",
)
async def toggle_supplier_store_link_status(
    supplier_id: int,
    store_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission('suppliers', 'update')),
):
    admin_id = get_user_admin_id(current_user)

    # Verify supplier belongs to admin
    supplier = await db.scalar(
        select(Supplier).where(Supplier.id == supplier_id, Supplier.deleted_at.is_(None))
    )
    if not supplier or supplier.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    # Find the link
    link = await db.scalar(
        select(SupplierStoreLink).where(
            SupplierStoreLink.supplier_id == supplier_id,
            SupplierStoreLink.store_id == store_id,
        )
    )
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier-store link not found",
        )

    # Toggle
    link.is_active = not link.is_active
    await db.commit()
    await db.refresh(link)

    return SupplierStoreLinkRead(
        id=link.id,
        supplier_id=link.supplier_id,
        store_id=link.store_id,
        is_primary=link.is_primary,
        is_active=link.is_active,
        created_at=link.created_at,
        updated_at=link.updated_at,
    )
