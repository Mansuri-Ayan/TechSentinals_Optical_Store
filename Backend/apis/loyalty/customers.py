from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc
from sqlalchemy.orm import joinedload
from core.deps import get_db, get_current_admin, get_current_manager
from models.admin import Admin
from models.manager import Manager
from models.customer import Customer, CustomerMembershipTier
from models.loyalty_transaction import LoyaltyTransaction
from typing import List, Optional
from datetime import datetime, timezone
from models.sale import Sale, SaleStatus
from schemas.pagination import PaginatedResponse
from schemas.loyalty import LoyaltyCustomerStats, LoyaltyCustomerDetailRead

router = APIRouter()

async def _get_loyalty_customers(
    db: AsyncSession,
    store_id: int | None,
    admin_id: int,
    page: int,
    limit: int,
    search: Optional[str] = None,
    tier: Optional[CustomerMembershipTier] = None
) -> PaginatedResponse[LoyaltyCustomerStats]:
    # Validate store ownership
    # For now, we rely on the `current_admin` or `current_manager` dependency to ensure access.
    # A more explicit check could be added if `admin_id` or `store_id` is passed directly without deps.

    query = select(Customer).where(
        Customer.admin_id == admin_id,
        Customer.deleted_at.is_(None)
    )
    if store_id is not None:
        query = query.where(Customer.store_id == store_id)

    if search:
        query = query.where(
            or_(
                Customer.first_name.ilike(f"%{search}%"),
                Customer.last_name.ilike(f"%{search}%"),
                Customer.phone.ilike(f"%{search}%"),
                Customer.email.ilike(f"%{search}%"),
            )
        )
    
    if tier:
        query = query.where(Customer.membership_tier == tier)

    # Count total items for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_items = (await db.execute(count_query)).scalar_one()

    # Apply pagination and ordering
    query = query.order_by(desc(Customer.current_points), desc(Customer.created_at))
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    customers = result.scalars().all()

    loyalty_customer_stats_list = []
    for customer in customers:
        # Get last transaction date
        last_transaction_stmt = select(func.max(LoyaltyTransaction.created_at)).where(
            LoyaltyTransaction.customer_id == customer.id
        )
        last_transaction_date = (await db.execute(last_transaction_stmt)).scalar_one_or_none()
        
        loyalty_customer_stats_list.append(
            LoyaltyCustomerStats(
                customer_id=customer.id,
                customer_name=f"{customer.first_name} {customer.last_name or ''}".strip(),
                customer_phone=customer.phone,
                current_points=customer.current_points,
                membership_tier=customer.membership_tier.value,
                lifetime_earned_points=customer.loyalty_points_earned,
                lifetime_redeemed_points=customer.loyalty_points_redeemed,
                last_transaction_date=last_transaction_date.isoformat() if last_transaction_date else None
            )
        )
    
    return PaginatedResponse(
        items=loyalty_customer_stats_list,
        total=total_items,
        page=page,
        pages=(total_items + limit - 1) // limit,
        limit=limit
    )

async def _get_loyalty_customer_detail(
    db: AsyncSession,
    customer_id: int,
    store_id: int | None,
    admin_id: int
) -> LoyaltyCustomerDetailRead:
    # 1. Fetch customer and verify scope
    query = select(Customer).where(
        Customer.id == customer_id,
        Customer.admin_id == admin_id,
        Customer.deleted_at.is_(None)
    )
    if store_id is not None:
        query = query.where(Customer.store_id == store_id)
        
    result = await db.execute(query)
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found or access denied."
        )

    # 2. Compute lifetime orders and spend
    stats_query = select(
        func.count(Sale.id),
        func.sum(Sale.total_amount)
    ).where(
        Sale.customer_id == customer_id,
        Sale.status != SaleStatus.CANCELLED
    )
    stats_result = await db.execute(stats_query)
    lifetime_orders, lifetime_spend = stats_result.one()
    lifetime_spend = lifetime_spend or 0.0

    # 3. Load transactions with category for EARNED_CATEGORY
    transactions_query = select(LoyaltyTransaction).where(
        LoyaltyTransaction.customer_id == customer_id
    ).options(
        joinedload(LoyaltyTransaction.category)
    ).order_by(desc(LoyaltyTransaction.created_at))
    
    tx_result = await db.execute(transactions_query)
    transactions = tx_result.scalars().all()
    
    last_tx_date = transactions[0].created_at if transactions else None

    # Map to detail read
    return LoyaltyCustomerDetailRead(
        customer_id=customer.id,
        customer_name=f"{customer.first_name} {customer.last_name or ''}".strip(),
        customer_phone=customer.phone,
        current_points=customer.current_points,
        membership_tier=customer.membership_tier.value,
        lifetime_earned_points=customer.loyalty_points_earned,
        lifetime_redeemed_points=customer.loyalty_points_redeemed,
        last_transaction_date=last_tx_date.isoformat() if last_tx_date else None,
        customer_email=customer.email,
        join_date=customer.created_at.isoformat() if customer.created_at else None,
        lifetime_orders=lifetime_orders,
        lifetime_spend=lifetime_spend,
        transactions=transactions
    )

# --- Admin Endpoints ---

@router.get(
    "/admin/loyalty/customers",
    response_model=PaginatedResponse[LoyaltyCustomerStats],
    summary="Get loyalty customers for all stores (Admin)",
)
async def get_loyalty_customers_all_admin(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by customer name, phone, or email"),
    tier: Optional[CustomerMembershipTier] = Query(None, description="Filter by membership tier"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> PaginatedResponse[LoyaltyCustomerStats]:
    return await _get_loyalty_customers(db, None, current_admin.id, page, limit, search, tier)


@router.get(
    "/admin/loyalty/customers/{customer_id}",
    response_model=LoyaltyCustomerDetailRead,
    summary="Get loyalty customer details across all stores (Admin)",
)
async def get_loyalty_customer_detail_all_admin(
    customer_id: int = Path(..., description="The ID of the customer"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> LoyaltyCustomerDetailRead:
    return await _get_loyalty_customer_detail(db, customer_id, None, current_admin.id)
@router.get(
    "/admin/store/{store_id}/loyalty/customers",
    response_model=PaginatedResponse[LoyaltyCustomerStats],
    summary="Get loyalty customers for a specific store (Admin)",
)
async def get_loyalty_customers_admin(
    store_id: int = Path(..., description="The ID of the store"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by customer name, phone, or email"),
    tier: Optional[CustomerMembershipTier] = Query(None, description="Filter by membership tier"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> PaginatedResponse[LoyaltyCustomerStats]:
    return await _get_loyalty_customers(db, store_id, current_admin.id, page, limit, search, tier)


@router.get(
    "/admin/store/{store_id}/loyalty/customers/{customer_id}",
    response_model=LoyaltyCustomerDetailRead,
    summary="Get loyalty customer details (Admin)",
)
async def get_loyalty_customer_detail_admin(
    store_id: int = Path(..., description="The ID of the store"),
    customer_id: int = Path(..., description="The ID of the customer"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> LoyaltyCustomerDetailRead:
    return await _get_loyalty_customer_detail(db, customer_id, store_id, current_admin.id)


# --- Shopkeeper Endpoints ---

@router.get(
    "/shopkeeper/loyalty/customers",
    response_model=PaginatedResponse[LoyaltyCustomerStats],
    summary="Get loyalty customers for the manager's store (Shopkeeper)",
)
async def get_loyalty_customers_shopkeeper(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by customer name, phone, or email"),
    tier: Optional[CustomerMembershipTier] = Query(None, description="Filter by membership tier"),
    db: AsyncSession = Depends(get_db),
    current_manager: Manager = Depends(get_current_manager),
) -> PaginatedResponse[LoyaltyCustomerStats]:
    return await _get_loyalty_customers(db, current_manager.store_id, current_manager.store.admin_id, page, limit, search, tier)


@router.get(
    "/shopkeeper/loyalty/customers/{customer_id}",
    response_model=LoyaltyCustomerDetailRead,
    summary="Get loyalty customer details (Shopkeeper)",
)
async def get_loyalty_customer_detail_shopkeeper(
    customer_id: int = Path(..., description="The ID of the customer"),
    db: AsyncSession = Depends(get_db),
    current_manager: Manager = Depends(get_current_manager),
) -> LoyaltyCustomerDetailRead:
    return await _get_loyalty_customer_detail(db, customer_id, current_manager.store_id, current_manager.store.admin_id)
