# API: customer/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission
from db.session import get_db
from models.admin import Admin
from schemas.customer import CustomerUpdate, CustomerRead
from services.customer_service import (
    get_customer,
    update_customer,
    soft_delete_customer,
)
from apis.customer.read import _get_user_admin_id, _customer_to_read

router = APIRouter()


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
    current_user=Depends(require_permission("customers", "update")),
) -> CustomerRead:
    admin_id = _get_user_admin_id(current_user)
    customer = await get_customer(db, customer_id)
    if not customer or customer.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    # Scoping check
    if not isinstance(current_user, Admin) and customer.store_id != current_user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's customer.",
        )
        
    updated = await update_customer(db, customer, payload)
    customer_detail = await get_customer(db, updated.id)
    return _customer_to_read(customer_detail)


@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete customer",
    description="Soft-delete a customer.",
)
async def delete_customer_endpoint(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("customers", "delete")),
) -> None:
    admin_id = _get_user_admin_id(current_user)
    customer = await get_customer(db, customer_id)
    if not customer or customer.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    # Scoping check
    if not isinstance(current_user, Admin) and customer.store_id != current_user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's customer.",
        )
    await soft_delete_customer(db, customer)
