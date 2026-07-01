# API: supplier/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.supplier import SupplierUpdate, SupplierRead
from services.supplier_service import get_supplier, update_supplier, soft_delete_supplier

router = APIRouter()


def _supplier_to_read(s) -> SupplierRead:
    return SupplierRead(
        **{c.key: getattr(s, c.key) for c in s.__table__.columns},
    )


@router.put(
    "/{supplier_id}",
    response_model=SupplierRead,
    summary="Update supplier",
    description="Update supplier details.",
)
async def update_supplier_endpoint(
    supplier_id: int,
    payload: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('suppliers', 'update')),
) -> SupplierRead:
    admin_id = get_user_admin_id(current_user)
    supplier = await get_supplier(db, supplier_id)
    if not supplier or supplier.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )
    updated = await update_supplier(db, supplier, payload)
    return _supplier_to_read(updated)


@router.delete(
    "/{supplier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete supplier",
    description="Soft-delete a supplier.",
)
async def delete_supplier_endpoint(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('suppliers', 'update')),
) -> None:
    admin_id = get_user_admin_id(current_user)
    supplier = await get_supplier(db, supplier_id)
    if not supplier or supplier.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )
    await soft_delete_supplier(db, supplier)
