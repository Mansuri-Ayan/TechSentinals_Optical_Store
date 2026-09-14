# Service: gst_service.py
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.product import Product
from services.stock_aging_service import get_inventory_config


async def resolve_gst_percent(db: AsyncSession, product_id: int, admin_id: int) -> Decimal:
    """Resolve the applicable GST rate for a product.
    
    Resolution hierarchy:
    1. Product.gst_percent (if not NULL)
    2. InventoryConfig.default_gst_percent (if found)
    3. Default to 18.00%
    """
    # 1. Product specific GST rate
    product = await db.get(Product, product_id)
    if product and product.gst_percent is not None:
        return Decimal(str(product.gst_percent))

    # 2. Admin default config
    config = await get_inventory_config(db, admin_id)
    if config and config.default_gst_percent is not None:
        return Decimal(str(config.default_gst_percent))

    # 3. System hardcoded default
    return Decimal("18.00")
