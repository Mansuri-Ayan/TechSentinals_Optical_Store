from fastapi import APIRouter, Depends, HTTPException, status, Path
from core.deps import require_permission, get_user_admin_id
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.deps import get_db, get_current_user, get_current_manager
from models.admin import Admin
from models.manager import Manager
from models.customer import Customer
from models.loyalty_config import LoyaltyConfig
from models.loyalty_transaction import LoyaltyTransaction, LoyaltyTransactionType
from schemas.loyalty import LoyaltyAdjustRequest, LoyaltyCustomerStats
from services.loyalty_service import update_customer_points
from typing import Union

router = APIRouter()

async def _adjust_loyalty_points(
    db: AsyncSession,
    store_id: int,
    admin_id: int,
    payload: LoyaltyAdjustRequest,
    given_by_type: str,
    given_by_id: int,
) -> LoyaltyCustomerStats:
    # admin_id is passed in by the caller (admin or shopkeeper endpoint)
    
    # Fetch LoyaltyConfig for the store
    config_stmt = select(LoyaltyConfig).where(LoyaltyConfig.store_id == store_id)
    config_result = await db.execute(config_stmt)
    loyalty_config = config_result.scalar_one_or_none()
    if not loyalty_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loyalty configuration not found for this store"
        )
    
    # Fetch Customer to ensure they exist and belong to the correct admin/store
    customer_stmt = select(Customer).where(
        Customer.id == payload.customer_id,
        Customer.admin_id == admin_id,
        Customer.deleted_at.is_(None)
    )
    customer_result = await db.execute(customer_stmt)
    customer = customer_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found or does not belong to this admin"
        )
    
    # Update customer's points and tier
    new_tier = await update_customer_points(
        session=db,
        customer_id=customer.id,
        points_delta=payload.points,
        config=loyalty_config
    )

    # Create LoyaltyTransaction record
    loyalty_transaction = LoyaltyTransaction(
        customer_id=customer.id,
        store_id=store_id,
        type=LoyaltyTransactionType.ADJUSTED,
        points=payload.points,
        given_by_type=given_by_type,
        given_by_id=given_by_id,
        note=payload.note
    )
    db.add(loyalty_transaction)

    # Update lifetime earned/redeemed points if applicable
    if payload.points > 0:
        customer.loyalty_points_earned += payload.points
    else:
        customer.loyalty_points_redeemed -= payload.points # redeemed points are negative, so subtract negative to add to total redeemed

    await db.commit()
    await db.refresh(customer)

    return LoyaltyCustomerStats(
        customer_id=customer.id,
        customer_name=f"{customer.first_name} {customer.last_name or ''}".strip(),
        customer_phone=customer.phone,
        current_points=customer.current_points,
        membership_tier=new_tier,
        lifetime_earned_points=customer.loyalty_points_earned,
        lifetime_redeemed_points=customer.loyalty_points_redeemed,
        last_transaction_date=loyalty_transaction.created_at.isoformat() # Use transaction creation time as last transaction
    )


# --- Admin Endpoint ---

@router.post(
    "/admin/store/{store_id}/loyalty/adjust",
    response_model=LoyaltyCustomerStats,
    summary="Adjust loyalty points for a customer by an Admin",
)
async def adjust_loyalty_points_admin(
    payload: LoyaltyAdjustRequest,
    store_id: int = Path(..., description="The ID of the store"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('loyalty', 'read')),
) -> LoyaltyCustomerStats:
    admin_id = get_user_admin_id(current_user)
    # Ensure the store belongs to the admin
    store_check_stmt = select(LoyaltyConfig).where(LoyaltyConfig.store_id == store_id)
    store_check_result = await db.execute(store_check_stmt)
    store_loyalty_config = store_check_result.scalar_one_or_none()
    if not store_loyalty_config or store_loyalty_config.store.admin_id != admin_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this store")

    return await _adjust_loyalty_points(
        db,
        store_id,
        admin_id,
        payload,
        given_by_type="ADMIN",
        given_by_id=admin_id
    )


# --- Shopkeeper Endpoint ---

@router.post(
    "/shopkeeper/loyalty/adjust",
    response_model=LoyaltyCustomerStats,
    summary="Adjust loyalty points for a customer by a Manager (Shopkeeper)",
)
async def adjust_loyalty_points_shopkeeper(
    payload: LoyaltyAdjustRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('loyalty', 'write')),
) -> LoyaltyCustomerStats:
    return await _adjust_loyalty_points(
        db,
        current_user.store_id,
        get_user_admin_id(current_user),
        payload,
        given_by_type=current_user.token_role.upper(),
        given_by_id=current_user.id
    )