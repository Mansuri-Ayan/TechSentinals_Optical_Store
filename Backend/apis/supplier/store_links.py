# API: supplier/store_links.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.supplier import SupplierStoreLinkCreate, SupplierStoreLinkRead
from services.supplier_service import (
    get_supplier,
    link_supplier_to_store,
    unlink_supplier_from_store,
    get_supplier_store_link,
    list_store_suppliers,
)

router = APIRouter()


def _link_to_read(link) -> SupplierStoreLinkRead:
    return SupplierStoreLinkRead(
        **{c.key: getattr(link, c.key) for c in link.__table__.columns},
        store_name=link.store.store_name if link.store else None,
        supplier_name=link.supplier.company_name if link.supplier else None,
    )


@router.post(
    "/{supplier_id}/stores",
    response_model=SupplierStoreLinkRead,
    status_code=status.HTTP_201_CREATED,
    summary="Link supplier to store",
    description="Link a supplier to a store with optional primary flag.",
)
async def link_to_store_endpoint(
    supplier_id: int,
    payload: SupplierStoreLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('suppliers', 'read')),
) -> SupplierStoreLinkRead:
    admin_id = get_user_admin_id(current_user)
    supplier = await get_supplier(db, supplier_id)
    if not supplier or supplier.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )
    link = await link_supplier_to_store(db, supplier_id, payload)
    # Reload to get store/supplier relationships
    link = await get_supplier_store_link(db, link.id)
    return _link_to_read(link)


@router.get(
    "/{supplier_id}/stores",
    response_model=list[SupplierStoreLinkRead],
    summary="List supplier's store links",
    description="List all stores linked to a supplier.",
)
async def list_store_links_endpoint(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('suppliers', 'read')),
) -> list[SupplierStoreLinkRead]:
    admin_id = get_user_admin_id(current_user)
    supplier = await get_supplier(db, supplier_id)
    if not supplier or supplier.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )
    links = await list_store_suppliers(db, supplier_id)
    return [_link_to_read(link) for link in links]


@router.delete(
    "/{supplier_id}/stores/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unlink supplier from store",
    description="Deactivate a supplier-store relationship.",
)
async def unlink_from_store_endpoint(
    supplier_id: int,
    link_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('suppliers', 'read')),
) -> None:
    admin_id = get_user_admin_id(current_user)
    link = await get_supplier_store_link(db, link_id)
    if not link or link.supplier_id != supplier_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier-store link not found",
        )
    await unlink_supplier_from_store(db, link)
