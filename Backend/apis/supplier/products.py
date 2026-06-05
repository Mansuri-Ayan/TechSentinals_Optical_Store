# API: supplier/products.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.supplier import (
    SupplierProductCreate,
    SupplierProductUpdate,
    SupplierProductRead,
)
from services.supplier_service import (
    get_supplier,
    add_supplier_product,
    get_supplier_product,
    update_supplier_product,
    list_supplier_products,
)

router = APIRouter()


def _sp_to_read(sp) -> SupplierProductRead:
    return SupplierProductRead(
        **{c.key: getattr(sp, c.key) for c in sp.__table__.columns},
        product_name=sp.product.name if sp.product else None,
        product_sku=sp.product.sku if sp.product else None,
        category_name=sp.product.category.name if sp.product and sp.product.category else None,
        brand_name=sp.product.brand.name if sp.product and sp.product.brand else None,
    )


@router.post(
    "/{supplier_id}/products",
    response_model=SupplierProductRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add product to supplier catalogue",
    description="Add a product to a supplier's catalogue with pricing and MOQ.",
)
async def add_product_endpoint(
    supplier_id: int,
    payload: SupplierProductCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> SupplierProductRead:
    supplier = await get_supplier(db, supplier_id)
    if not supplier or supplier.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )
    sp = await add_supplier_product(db, supplier_id, payload)
    return _sp_to_read(sp)


@router.get(
    "/{supplier_id}/products",
    response_model=list[SupplierProductRead],
    summary="List supplier products",
    description="List all products in a supplier's catalogue.",
)
async def list_products_endpoint(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[SupplierProductRead]:
    supplier = await get_supplier(db, supplier_id)
    if not supplier or supplier.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )
    products = await list_supplier_products(db, supplier_id)
    return [_sp_to_read(sp) for sp in products]


@router.put(
    "/{supplier_id}/products/{sp_id}",
    response_model=SupplierProductRead,
    summary="Update supplier product",
    description="Update a supplier product entry (price, MOQ, etc.).",
)
async def update_product_endpoint(
    supplier_id: int,
    sp_id: int,
    payload: SupplierProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> SupplierProductRead:
    sp = await get_supplier_product(db, sp_id)
    if not sp or sp.supplier_id != supplier_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier product not found",
        )
    updated = await update_supplier_product(db, sp, payload)
    return _sp_to_read(updated)
