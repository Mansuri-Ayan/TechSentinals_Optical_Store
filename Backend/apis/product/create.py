# API: product/create.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.product import ProductCreate, ProductRead
from services.product_service import create_product

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


@router.post(
    "/",
    response_model=ProductRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product",
    description=(
        "Create a product with optional type-specific details "
        "(frame_details, lens_details, or accessory_details)."
    ),
)
async def create_product_endpoint(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('products', 'create')),
) -> ProductRead:
    admin_id = get_user_admin_id(current_user)
    try:
        product = await create_product(db, admin_id=admin_id, payload=payload)
    except Exception as e:
        if "unique" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A product with this SKU or barcode already exists",
            )
        raise
    return _product_to_read(product)
