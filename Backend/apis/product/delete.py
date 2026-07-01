# API: product/delete.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.product import ProductRead
from services.product_service import get_product, delete_product

router = APIRouter()


@router.delete(
    "/{product_id}",
    response_model=ProductRead,
    summary="Delete a product",
    description="Soft-delete a product by deactivating it.",
)
async def delete_product_endpoint(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('products', 'delete')),
) -> ProductRead:
    admin_id = get_user_admin_id(current_user)
    product = await get_product(db, product_id)
    if product is None or product.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    deleted = await delete_product(db, product)
    return ProductRead(
        **{c.key: getattr(deleted, c.key) for c in deleted.__table__.columns},
        frame_product=deleted.frame_product,
        lens_product=deleted.lens_product,
        accessory_product=deleted.accessory_product,
        category_name=deleted.category.name if deleted.category else None,
        subcategory_name=deleted.subcategory.name if deleted.subcategory else None,
        brand_name=deleted.brand.name if deleted.brand else None,
    )
