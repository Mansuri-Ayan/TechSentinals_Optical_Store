# API: inventory_config/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from schemas.inventory_config import (
    InventoryConfigUpdate,
    InventoryConfigRead,
    ProductAgingOverrideUpsert,
    ProductAgingOverrideRead,
    AgingEvaluationResult,
)
from services.stock_aging_service import (
    update_inventory_config,
    upsert_product_aging_override,
    delete_product_aging_override,
    run_aging_evaluation,
)

router = APIRouter()


@router.put(
    "/",
    response_model=InventoryConfigRead,
    summary="Update inventory configurations",
    description="Modify default inventory configurations (GST default and Stock Aging timeline) for the admin.",
)
async def update_config(
    payload: InventoryConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("inventory_config", "update")),
):
    admin_id = get_user_admin_id(current_user)
    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin ID context is required to modify configurations.",
        )
    return await update_inventory_config(db, admin_id, payload)


@router.put(
    "/product/{product_id}",
    response_model=ProductAgingOverrideRead,
    summary="Upsert product aging override",
    description="Configure product-specific aging timeline override settings.",
)
async def upsert_product_override(
    product_id: int,
    payload: ProductAgingOverrideUpsert,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("inventory_config", "update")),
):
    admin_id = get_user_admin_id(current_user)
    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin ID context is required.",
        )
    return await upsert_product_aging_override(db, product_id, admin_id, payload)


@router.delete(
    "/product/{product_id}",
    summary="Reset product aging override",
    description="Delete custom product aging timeline settings, reverting to default config.",
)
async def delete_product_override(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("inventory_config", "update")),
):
    success = await delete_product_aging_override(db, product_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No override config found for product ID {product_id}.",
        )
    return {"message": "Product aging override successfully reset to defaults."}


@router.post(
    "/run-aging",
    response_model=AgingEvaluationResult,
    summary="Manually trigger aging evaluation",
    description="Run aging status worker immediately. Updates stages and generates notifications.",
)
async def trigger_aging_evaluation(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("inventory_config", "update")),
):
    return await run_aging_evaluation(db)
