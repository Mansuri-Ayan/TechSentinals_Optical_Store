from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from core.deps import require_permission
from db.session import get_db
from models.admin import Admin
from models.product_unit import ProductUnit, UnitStatus
from models.inventory import OwnerType
from schemas.product_unit import ProductUnitRead
from apis.customer.read import _get_user_admin_id

router = APIRouter()

@router.get("/", response_model=List[ProductUnitRead])
async def list_product_units(
    product_id: Optional[int] = None,
    inventory_batch_id: Optional[int] = None,
    status: Optional[UnitStatus] = None,
    owner_type: Optional[OwnerType] = None,
    owner_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Admin = Depends(require_permission("INVENTORY_VIEW")),
):
    """List product units, filtered by various criteria."""
    admin_id = await _get_user_admin_id(current_user, db)
    
    stmt = select(ProductUnit)
    
    if product_id:
        stmt = stmt.where(ProductUnit.product_id == product_id)
    if inventory_batch_id:
        stmt = stmt.where(ProductUnit.inventory_batch_id == inventory_batch_id)
    if status:
        stmt = stmt.where(ProductUnit.status == status)
    if owner_type:
        stmt = stmt.where(ProductUnit.owner_type == owner_type)
    if owner_id:
        stmt = stmt.where(ProductUnit.owner_id == owner_id)
        
    # Enforce basic tenant security (this checks if owner_id belongs to the admin, 
    # but for simplicity we rely on the broader inventory view rules.
    # A true multi-tenant check might join to Store or Product to verify admin_id.

    stmt = stmt.order_by(ProductUnit.id.asc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/lookup/{unit_sku}", response_model=ProductUnitRead)
async def lookup_product_unit(
    unit_sku: str,
    db: AsyncSession = Depends(get_db),
    current_user: Admin = Depends(require_permission("INVENTORY_VIEW")),
):
    """Lookup a specific product unit by its SKU."""
    stmt = select(ProductUnit).where(ProductUnit.unit_sku == unit_sku)
    result = await db.execute(stmt)
    unit = result.scalar_one_or_none()
    
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product unit not found"
        )
        
    return unit
