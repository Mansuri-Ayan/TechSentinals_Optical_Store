# API: customer/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.customer import CustomerUpdate, CustomerRead
from services.customer_service import (
    get_customer,
    update_customer,
    soft_delete_customer,
)

router = APIRouter()


def _customer_to_read(c) -> CustomerRead:
    return CustomerRead(
        **{col.key: getattr(c, col.key) for col in c.__table__.columns},
        store_name=(
            c.store.store_name if c.store else None
        ),
        first_visit_store_name=(
            c.first_visit_store.store_name if c.first_visit_store else None
        ),
    )


@router.put(
    "/{customer_id}",
    response_model=CustomerRead,
    summary="Update customer",
    description="Update customer details.",
)
async def update_customer_endpoint(
    customer_id: int,
    payload: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> CustomerRead:
    customer = await get_customer(db, customer_id)
    if not customer or customer.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    updated = await update_customer(db, customer, payload)
    return _customer_to_read(updated)


@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete customer",
    description="Soft-delete a customer.",
)
async def delete_customer_endpoint(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    customer = await get_customer(db, customer_id)
    if not customer or customer.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    await soft_delete_customer(db, customer)
