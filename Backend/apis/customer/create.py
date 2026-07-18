# API: customer/create.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission
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
    current_user=Depends(require_permission("customers:create", "sales:create")),
) -> CustomerRead:
    admin_id = _get_user_admin_id(current_user)
    if not isinstance(current_user, Admin):
        # Enforce store scoping
        payload.store_id = current_user.store_id
        payload.first_visit_store_id = current_user.store_id

    customer = await create_customer(db, admin_id=admin_id, payload=payload)
    customer_detail = await get_customer(db, customer.id)
    return _customer_to_read(customer_detail)


@router.post(
    "/quick-create",
    response_model=CustomerRead,
    summary="Quick Create Customer at POS",
    description="Creates a minimal customer profile. Returns 409 if phone exists.",
)
async def quick_create_customer(
    payload: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("sales:create")),
) -> CustomerRead:
    admin_id = _get_user_admin_id(current_user)
    
    # Enforce store scoping
    if not isinstance(current_user, Admin):
        payload.store_id = current_user.store_id
        payload.first_visit_store_id = current_user.store_id

    # Check for existing customer by phone
    from sqlalchemy import select
    from models.customer import Customer
    from fastapi.responses import JSONResponse
    
    stmt = select(Customer).where(Customer.phone == payload.phone, Customer.admin_id == admin_id)
    existing = (await db.execute(stmt)).scalars().first()
    
    if existing:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "message": "Customer with this phone already exists",
                "customer": {
                    "id": existing.id,
                    "first_name": existing.first_name,
                    "last_name": existing.last_name,
                    "phone": existing.phone,
                    "current_points": existing.current_points
                }
            }
        )

    customer = await create_customer(db, admin_id=admin_id, payload=payload)
    customer_detail = await get_customer(db, customer.id)
    return _customer_to_read(customer_detail)
