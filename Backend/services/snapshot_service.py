# Service: snapshot_service.py
"""
snapshot_service — create immutable ProductSnapshot rows.

Usage in any service:
    from services.snapshot_service import capture_product_snapshot

    snapshot = await capture_product_snapshot(db, product)
    sale_item.product_snapshot_id = snapshot.id
"""
from sqlalchemy.ext.asyncio import AsyncSession

from models.product import Product
from models.product_snapshot import ProductSnapshot, ProductType


async def capture_product_snapshot(
    db: AsyncSession,
    product: Product,
) -> ProductSnapshot:
    """
    Create a frozen, write-once snapshot of a product and all its type-specific
    attributes (frame / lens / accessory specs).

    The snapshot is flushed (but NOT committed) so that the caller can include
    it in the same atomic transaction as the parent record (SaleItem,
    PurchaseOrderItem, InventoryTransaction).

    Args:
        db:      The current async database session.
        product: A fully-loaded Product ORM object.
                 The frame_product, lens_product, and accessory_product
                 relationships must already be loaded (they use lazy="selectin"
                 on Product so they load automatically).

    Returns:
        The newly flushed ProductSnapshot instance (id is assigned after flush).
    """
    # ── Determine product type ─────────────────────────────────
    if product.frame_product is not None:
        product_type = ProductType.FRAME
    elif product.lens_product is not None:
        product_type = ProductType.LENS
    elif product.accessory_product is not None:
        product_type = ProductType.ACCESSORY
    else:
        product_type = ProductType.OTHER

    # ── Read brand / category / subcategory names (denormalised) ─
    brand_id = product.brand_id
    brand_name = product.brand.name if product.brand else None

    category_id = product.category_id
    category_name = product.category.name if product.category else None

    subcategory_id = product.subcategory_id
    subcategory_name = product.subcategory.name if product.subcategory else None

    # ── Base snapshot fields ───────────────────────────────────
    snapshot = ProductSnapshot(
        product_id=product.id,
        product_type=product_type,
        sku=product.sku,
        barcode=product.barcode,
        name=product.name,
        brand_id=brand_id,
        brand_name=brand_name,
        category_id=category_id,
        category_name=category_name,
        subcategory_id=subcategory_id,
        subcategory_name=subcategory_name,
        cost_price=product.cost_price,
        selling_price=product.selling_price,
        discount_percent=product.discount_percent,
        warranty_months=product.warranty_months,
        image_url=product.image_url,
    )

    # ── Frame-specific fields ──────────────────────────────────
    if product_type == ProductType.FRAME and product.frame_product:
        fp = product.frame_product
        snapshot.frame_type = fp.frame_type
        snapshot.frame_shape = fp.shape
        snapshot.frame_material = fp.material
        snapshot.frame_color = fp.color
        snapshot.lens_width = fp.lens_width
        snapshot.bridge_width = fp.bridge_width
        snapshot.temple_length = fp.temple_length
        snapshot.gender = fp.gender
        snapshot.age_group = fp.age_group

    # ── Lens-specific fields ───────────────────────────────────
    elif product_type == ProductType.LENS and product.lens_product:
        lp = product.lens_product
        snapshot.lens_type = lp.lens_type
        snapshot.lens_material = lp.material
        snapshot.index_value = lp.index_value
        snapshot.coating = lp.coating
        snapshot.tint_color = lp.tint_color
        snapshot.uv_protection = lp.uv_protection
        snapshot.blue_cut = lp.blue_cut
        snapshot.photochromic = lp.photochromic
        snapshot.polarized = lp.polarized

    # ── Accessory-specific fields ──────────────────────────────
    elif product_type == ProductType.ACCESSORY and product.accessory_product:
        ap = product.accessory_product
        snapshot.accessory_type = ap.accessory_type
        snapshot.accessory_material = ap.material
        snapshot.accessory_color = ap.color
        snapshot.accessory_size = ap.size

    db.add(snapshot)
    await db.flush()  # Assigns snapshot.id within the current transaction
    return snapshot
