# Service: product_service.py
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from models.product import Product
from models.frame_product import FrameProduct
from models.lens_product import LensProduct
from models.accessory_product import AccessoryProduct
from schemas.product import ProductCreate, ProductUpdate


async def _generate_sku(db: AsyncSession, prefix: str = "PRD") -> str:
    """Auto-generate a unique SKU like PRD-000001."""
    stmt = select(Product.id).order_by(desc(Product.id)).limit(1)
    result = await db.execute(stmt)
    last_id = result.scalar_one_or_none() or 0
    return f"{prefix}-{last_id + 1:06d}"


async def create_product(
    db: AsyncSession,
    admin_id: int,
    payload: ProductCreate,
) -> Product:
    """
    Create a product and its type-specific extension in a single transaction.
    """
    sku = payload.sku or await _generate_sku(db)

    product = Product(
        admin_id=admin_id,
        category_id=payload.category_id,
        subcategory_id=payload.subcategory_id,
        sku=sku,
        barcode=payload.barcode,
        name=payload.name,
        brand_id=payload.brand_id,
        cost_price=payload.cost_price,
        selling_price=payload.selling_price,
        discount_percent=payload.discount_percent,
        warranty_months=payload.warranty_months,
        image_url=payload.image_url,
    )
    db.add(product)
    await db.flush()  # get product.id

    # Create type-specific extension if provided
    if payload.frame_details:
        frame = FrameProduct(
            product_id=product.id,
            **payload.frame_details.model_dump(),
        )
        db.add(frame)

    if payload.lens_details:
        lens = LensProduct(
            product_id=product.id,
            **payload.lens_details.model_dump(),
        )
        db.add(lens)

    if payload.accessory_details:
        accessory = AccessoryProduct(
            product_id=product.id,
            **payload.accessory_details.model_dump(),
        )
        db.add(accessory)

    await db.commit()
    await db.refresh(product)
    return product


async def get_product(db: AsyncSession, product_id: int) -> Product | None:
    """Fetch a single product by ID (eager-loads extensions via selectin)."""
    stmt = select(Product).where(
        Product.id == product_id,
        Product.is_active.is_(True),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_products_by_admin(
    db: AsyncSession,
    admin_id: int,
    category_id: int | None = None,
    subcategory_id: int | None = None,
    brand_id: int | None = None,
    search: str | None = None,
    active_only: bool = True,
    limit: int = 100,
    offset: int = 0,
) -> list[Product]:
    """
    List products for an admin with optional filters.
    Extensions are eager-loaded via the model's lazy='selectin'.
    """
    stmt = select(Product).where(Product.admin_id == admin_id)

    if active_only:
        stmt = stmt.where(Product.is_active.is_(True))
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    if subcategory_id is not None:
        stmt = stmt.where(Product.subcategory_id == subcategory_id)
    if brand_id is not None:
        stmt = stmt.where(Product.brand_id == brand_id)
    if search:
        stmt = stmt.where(
            Product.name.ilike(f"%{search}%")
            | Product.sku.ilike(f"%{search}%")
        )

    stmt = stmt.order_by(Product.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_product(
    db: AsyncSession,
    product: Product,
    payload: ProductUpdate,
) -> Product:
    """
    Apply partial updates to a product and its extension.
    """
    update_data = payload.model_dump(
        exclude_unset=True,
        exclude={"frame_details", "lens_details", "accessory_details"},
    )
    for field, value in update_data.items():
        setattr(product, field, value)

    # Update frame extension
    if payload.frame_details is not None:
        if product.frame_product:
            for k, v in payload.frame_details.model_dump(exclude_unset=True).items():
                setattr(product.frame_product, k, v)
        else:
            frame = FrameProduct(
                product_id=product.id,
                **payload.frame_details.model_dump(),
            )
            db.add(frame)

    # Update lens extension
    if payload.lens_details is not None:
        if product.lens_product:
            for k, v in payload.lens_details.model_dump(exclude_unset=True).items():
                setattr(product.lens_product, k, v)
        else:
            lens = LensProduct(
                product_id=product.id,
                **payload.lens_details.model_dump(),
            )
            db.add(lens)

    # Update accessory extension
    if payload.accessory_details is not None:
        if product.accessory_product:
            for k, v in payload.accessory_details.model_dump(exclude_unset=True).items():
                setattr(product.accessory_product, k, v)
        else:
            accessory = AccessoryProduct(
                product_id=product.id,
                **payload.accessory_details.model_dump(),
            )
            db.add(accessory)

    await db.commit()
    await db.refresh(product)
    return product


async def delete_product(db: AsyncSession, product: Product) -> Product:
    """Soft-delete a product by deactivating it."""
    product.is_active = False
    await db.commit()
    await db.refresh(product)
    return product
