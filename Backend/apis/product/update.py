# API: product/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.product import ProductUpdate, ProductRead
from services.product_service import get_product, update_product

router = APIRouter()


def _product_to_read(product) -> ProductRead:
    return ProductRead(
        **{c.key: getattr(product, c.key) for c in product.__table__.columns},
        frame_product=product.frame_product,
        lens_product=product.lens_product,
        accessory_product=product.accessory_product,
        category_name=product.category.name if product.category else None,
        subcategory_name=product.subcategory.name if product.subcategory else None,
        brand_name=product.brand.name if product.brand else None,
    )


@router.put(
    "/{product_id}",
    response_model=ProductRead,
    summary="Update a product",
)
async def update_product_endpoint(
    product_id: int,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('products', 'update')),
) -> ProductRead:
    admin_id = get_user_admin_id(current_user)
    product = await get_product(db, product_id)
    if product is None or product.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    updated = await update_product(db, product, payload)
    return _product_to_read(updated)
