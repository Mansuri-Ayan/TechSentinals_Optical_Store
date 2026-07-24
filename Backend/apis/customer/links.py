# API: customer/links.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.deps import require_permission
from db.session import get_db
from models.admin import Admin
from models.customer import Customer
from schemas.customer import CustomerRead, CustomerLinkCreate
from services.customer_service import create_customer, get_customer
from services.customer_link_service import get_or_create_link, list_linked_customers, remove_link
from apis.customer.read import _get_user_admin_id, _customer_to_read

router = APIRouter()


@router.get(
    "/{customer_id}/links",
    response_model=list[CustomerRead],
    summary="List linked members for a customer",
)
async def list_links(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("customers:read", "sales:create")),
):
    admin_id = _get_user_admin_id(current_user)
    
    # Ensure customer exists and belongs to admin
    cust = (await db.execute(select(Customer).filter_by(id=customer_id, admin_id=admin_id))).scalar_one_or_none()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    customers = await list_linked_customers(db, admin_id=admin_id, customer_id=customer_id)
    return [_customer_to_read(c) for c in customers]


@router.post(
    "/{customer_id}/links",
    response_model=CustomerRead,
    summary="Create a linked member",
)
async def create_link(
    customer_id: int,
    payload: CustomerLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("customers:update", "sales:create")),
):
    admin_id = _get_user_admin_id(current_user)
    store_id = current_user.store_id if not isinstance(current_user, Admin) else None
    
    cust = (await db.execute(select(Customer).filter_by(id=customer_id, admin_id=admin_id))).scalar_one_or_none()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if not store_id and cust.store_id:
        store_id = cust.store_id
    if not store_id:
        store_id = 1  # Fallback

    linked_id = None
    if payload.customer_id_2:
        linked_id = payload.customer_id_2
    elif payload.new_customer:
        # Enforce store scoping
        if not isinstance(current_user, Admin):
            payload.new_customer.store_id = current_user.store_id
            payload.new_customer.first_visit_store_id = current_user.store_id
            
        # Check phone conflict
        stmt = select(Customer).where(Customer.phone == payload.new_customer.phone, Customer.admin_id == admin_id)
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
            
        new_cust = await create_customer(db, admin_id=admin_id, payload=payload.new_customer)
        linked_id = new_cust.id
    else:
        raise HTTPException(status_code=400, detail="Must provide either customer_id_2 or new_customer")

    await get_or_create_link(db, admin_id=admin_id, store_id=store_id, from_customer_id=customer_id, to_customer_id=linked_id)
    
    linked_cust_detail = await get_customer(db, linked_id)
    return _customer_to_read(linked_cust_detail)


@router.delete(
    "/{customer_id}/links/{linked_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a linked member",
)
async def delete_link(
    customer_id: int,
    linked_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("customers:update", "sales:create")),
):
    admin_id = _get_user_admin_id(current_user)
    
    success = await remove_link(db, admin_id=admin_id, customer_id=customer_id, linked_id=linked_id)
    if not success:
        raise HTTPException(status_code=404, detail="Link not found")
        
    return None
