# API: inventory_config/read.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from schemas.inventory_config import InventoryConfigRead, ProductAgingOverrideRead
from services.stock_aging_service import (
    get_inventory_config,
    get_product_aging_override,
    get_aging_summary,
)

router = APIRouter()


@router.get(
    "/",
    response_model=InventoryConfigRead,
    summary="Get inventory configurations",
    description="Retrieve default inventory configurations (GST default and Stock Aging timeline) for the admin.",
)
async def read_inventory_config(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("inventory_config", "read")),
):
    admin_id = get_user_admin_id(current_user)
    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin ID context is required to view inventory configurations.",
        )
    return await get_inventory_config(db, admin_id)


@router.get(
    "/product/{product_id}",
    response_model=ProductAgingOverrideRead,
    summary="Get product aging override",
    description="Retrieve product-specific aging timeline override settings.",
)
async def read_product_override(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("inventory_config", "read")),
):
    override = await get_product_aging_override(db, product_id)
    if not override:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No aging override found for product ID {product_id}.",
        )
    return override


@router.get(
    "/aging-summary",
    summary="Get summary counts of aging batches",
    description="Retrieve counts of inventory batches in each aging stage.",
)
async def read_aging_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("inventory_config", "read")),
):
    admin_id = get_user_admin_id(current_user)
    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin ID context is required.",
        )
    return await get_aging_summary(db, admin_id)
