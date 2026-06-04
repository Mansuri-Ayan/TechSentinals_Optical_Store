# API: customer/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.customer import CustomerRead, CustomerListRead
from services.customer_service import (
    get_customer,
    get_customer_by_phone,
    list_customers,
)

router = APIRouter()


def _customer_to_read(c) -> CustomerRead:
    return CustomerRead(
        **{col.key: getattr(c, col.key) for col in c.__table__.columns},
        first_visit_store_name=(
            c.first_visit_store.store_name if c.first_visit_store else None
        ),
    )


def _customer_to_list(c) -> CustomerListRead:
    return CustomerListRead(
        **{
            col.key: getattr(c, col.key)
            for col in c.__table__.columns
            if col.key in CustomerListRead.model_fields
        },
    )


@router.get(
    "/",
    response_model=list[CustomerListRead],
    summary="List customers",
    description="List customers with optional search (name, phone, email).",
)
async def list_customers_endpoint(
    search: str | None = Query(default=None),
    active_only: bool = Query(True),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[CustomerListRead]:
    customers = await list_customers(
        db,
        admin_id=current_admin.id,
        search=search,
        active_only=active_only,
        limit=limit,
        offset=offset,
    )
    return [_customer_to_list(c) for c in customers]


@router.get(
    "/phone/{phone}",
    response_model=CustomerRead,
    summary="Lookup customer by phone",
    description="Find a customer by their phone number.",
)
async def get_by_phone_endpoint(
    phone: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> CustomerRead:
    customer = await get_customer_by_phone(db, current_admin.id, phone)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found with that phone number",
        )
    return _customer_to_read(customer)


@router.get(
    "/{customer_id}",
    response_model=CustomerRead,
    summary="Get customer",
    description="Get full customer details including prescription.",
)
async def get_customer_endpoint(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> CustomerRead:
    customer = await get_customer(db, customer_id)
    if not customer or customer.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    return _customer_to_read(customer)
