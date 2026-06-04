# API: customer/create.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.customer import CustomerCreate, CustomerRead
from services.customer_service import create_customer

router = APIRouter()


def _customer_to_read(c) -> CustomerRead:
    return CustomerRead(
        **{col.key: getattr(c, col.key) for col in c.__table__.columns},
        first_visit_store_name=(
            c.first_visit_store.store_name if c.first_visit_store else None
        ),
    )


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
    current_admin: Admin = Depends(get_current_admin),
) -> CustomerRead:
    customer = await create_customer(db, admin_id=current_admin.id, payload=payload)
    return _customer_to_read(customer)
