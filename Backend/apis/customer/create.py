# API: customer/create.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from schemas.customer import CustomerCreate, CustomerRead
from services.customer_service import create_customer, get_customer
from apis.customer.read import _get_user_admin_id, _customer_to_read

router = APIRouter()


@router.post(
    "/",
    response_model=CustomerRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create customer",
    description="Register a new customer for the current admin's business.",
)
async def create_customer_endpoint(
    payload: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> CustomerRead:
    admin_id = _get_user_admin_id(current_user)
    if not isinstance(current_user, Admin):
        # Enforce store scoping
        payload.store_id = current_user.store_id
        payload.first_visit_store_id = current_user.store_id

    customer = await create_customer(db, admin_id=admin_id, payload=payload)
    customer_detail = await get_customer(db, customer.id)
    return _customer_to_read(customer_detail)
