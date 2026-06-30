# API: product/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.product import ProductRead
from services.product_service import get_product, get_products_by_admin

router = APIRouter()


def _product_to_read(product) -> ProductRead:
    """Helper to build ProductRead with denormalized names."""
    return ProductRead(
        **{c.key: getattr(product, c.key) for c in product.__table__.columns},
        frame_product=product.frame_product,
        lens_product=product.lens_product,
        accessory_product=product.accessory_product,
        category_name=product.category.name if product.category else None,
        subcategory_name=product.subcategory.name if product.subcategory else None,
        brand_name=product.brand.name if product.brand else None,
    )


@router.get(
    "/",
    response_model=list[ProductRead],
    summary="List products",
    description="List products with optional filters.",
)
async def list_products(
    category_id: int | None = Query(None),
    subcategory_id: int | None = Query(None),
    brand_id: int | None = Query(None),
    search: str | None = Query(None, description="Search by name or SKU"),
    active_only: bool = Query(True),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[ProductRead]:
    admin_id = get_user_admin_id(current_user)
    products = await get_products_by_admin(
        db,
        admin_id=admin_id,
        category_id=category_id,
        subcategory_id=subcategory_id,
        brand_id=brand_id,
        search=search,
        active_only=active_only,
        limit=limit,
        offset=offset,
    )
    return [_product_to_read(p) for p in products]


@router.get(
    "/{product_id}",
    response_model=ProductRead,
    summary="Get a single product",
)
async def get_product_endpoint(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> ProductRead:
    admin_id = get_user_admin_id(current_user)
    product = await get_product(db, product_id)
    if product is None or product.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return _product_to_read(product)
