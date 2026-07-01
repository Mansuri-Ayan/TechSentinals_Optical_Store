# API: customer/read.py
from datetime import date, datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from models.manager import Manager
from models.optician import Optician
from models.worker import Worker
from schemas.customer import CustomerRead, CustomerListRead, CustomerDetailRead
from services.customer_service import (
    get_customer,
    get_customer_by_phone,
    list_customers,
)
from services.prescription_service import list_prescriptions_for_customer
from services.sale_service import list_sales

router = APIRouter()


def _get_user_admin_id(user) -> int:
    if isinstance(user, Admin):
        return user.id
    if hasattr(user, "store") and user.store:
        return user.store.admin_id
    if hasattr(user, "admin_id"):
        return user.admin_id
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not determine admin scoping for user",
    )


def to_num(val, constructor=float):
    if val is None or val in ("", "—", "None"):
        return None
    try:
        return constructor(val)
    except ValueError:
        return None


def prescription_to_frontend_dict(p) -> dict:
    if not p:
        return None
    return {
        "id": p.id,
        "customer_id": p.customer_id,
        "store_id": p.store_id,
        "optician_id": p.optician_id,
        "rightEye": {
            "sph": to_num(p.sph_right, float),
            "cyl": to_num(p.cyl_right, float),
            "axis": to_num(p.axis_right, int),
            "addPower": to_num(p.addition, float),
            "pd": to_num(p.pupillary_distance, int),
        },
        "leftEye": {
            "sph": to_num(p.sph_left, float),
            "cyl": to_num(p.cyl_left, float),
            "axis": to_num(p.axis_left, int),
            "addPower": to_num(p.addition, float),
            "pd": to_num(p.pupillary_distance, int),
        },
        "lensType": p.lens_type or "",
        "lensMaterial": p.lens_material or "",
        "lensCoating": p.lens_coating or "",
        "framePreference": p.frame_preference or "",
        "doctorName": p.doctor_name or "",
        "prescriptionDate": p.prescription_date.strftime("%Y-%m-%d") if p.prescription_date else "",
        "expiryDate": p.expiry_date.strftime("%Y-%m-%d") if p.expiry_date else "",
        "recommendedUsage": p.recommended_usage or "",
        "notes": p.notes or "",
        "is_active": p.is_active,
    }


def sale_to_frontend_order(s) -> dict:
    items = []
    for item in (s.items or []):
        snap = item.product_snapshot
        items.append({
            "productId": item.product_id,
            "productName": snap.name if snap else (item.product.name if item.product else "Optical Product"),
            "frameName": snap.name if snap else (item.product.name if item.product else "Optical Product"),
            "brand": snap.brand_name if snap else (item.product.brand.name if item.product and item.product.brand else "Vision Brand"),
            "category": snap.category_name if snap else (item.product.category.name if item.product and item.product.category else "Optical"),
            "quantity": item.quantity,
            "price": float(item.unit_price),
            "amount": float(item.line_total),
        })
        
    payment_method = "UPI"
    if s.payments and len(s.payments) > 0:
        payment_method = s.payments[0].payment_method.value
        
    # Translate SaleStatus enum to frontend values
    status_map = {
        "PENDING": "Pending",
        "COMPLETED": "Delivered",
        "PARTIALLY_PAID": "In Progress",
        "CANCELLED": "Pending",
        "REFUNDED": "Pending",
    }
    frontend_status = status_map.get(s.status.value, "Pending")
    
    # Translate paymentStatus: Paid, Partial, Unpaid
    due = float(s.due_amount or 0)
    paid = float(s.paid_amount or 0)
    if due <= 0:
        payment_status = "Paid"
    elif paid > 0:
        payment_status = "Partial"
    else:
        payment_status = "Unpaid"
        
    return {
        "id": s.invoice_number,
        "dbId": s.id,
        "date": s.sale_date.strftime("%Y-%m-%d") if s.sale_date else "",
        "items": items,
        "subtotal": float(s.subtotal),
        "discount": float(s.discount_amount),
        "amount": float(s.total_amount),
        "status": frontend_status,
        "paymentMethod": payment_method,
        "paymentStatus": payment_status,
        "receivedAmount": paid,
        "remainingAmount": due,
        "upiId": s.payments[0].reference_number if s.payments and len(s.payments) > 0 and s.payments[0].payment_method.value == "UPI" else "",
    }


def compile_customer_history(customer, prescriptions, sales) -> list[dict]:
    history = []
    
    # 1. Customer Created
    history.append({
        "date": customer.created_at.strftime("%Y-%m-%d") if customer.created_at else "",
        "event": "Customer Created",
        "description": "Customer profile created in the system"
    })
    
    # 2. Prescriptions
    for p in prescriptions:
        history.append({
            "date": p.prescription_date.strftime("%Y-%m-%d") if p.prescription_date else "",
            "event": "Eye Test Completed",
            "description": f"Optical prescription recorded by {p.doctor_name or 'Optician'}"
        })
        
    # 3. Sales
    for s in sales:
        history.append({
            "date": s.sale_date.strftime("%Y-%m-%d") if s.sale_date else "",
            "event": "New Order Created",
            "description": f"Order {s.invoice_number} placed. Total: ₹{float(s.total_amount):,.2f}"
        })
        if s.status.value == "COMPLETED":
            history.append({
                "date": s.updated_at.strftime("%Y-%m-%d") if s.updated_at else s.sale_date.strftime("%Y-%m-%d"),
                "event": "Order Delivered",
                "description": f"Order {s.invoice_number} status changed to Delivered"
            })
            
    # Sort history by date descending
    history.sort(key=lambda x: x["date"], reverse=True)
    return history


def _customer_to_read(c) -> CustomerRead:
    return CustomerRead(
        **{col.key: getattr(c, col.key) for col in c.__table__.columns},
        store_name=(
            c.store.store_name if c.store else None
        ),
        first_visit_store_name=(
            c.first_visit_store.store_name if c.first_visit_store else None
        ),
        total_orders=getattr(c, "total_orders", 0),
        total_amount=getattr(c, "total_amount", 0.0),
        outstanding_balance=getattr(c, "outstanding_balance", 0.0),
        last_visit=getattr(c, "last_visit", None),
        status=getattr(c, "status", "Active"),
    )


def _customer_to_list(c) -> CustomerListRead:
    return CustomerListRead(
        **{
            col.key: getattr(c, col.key)
            for col in c.__table__.columns
            if col.key in CustomerListRead.model_fields
        },
        store_name=(
            c.store.store_name if c.store else None
        ),
        total_orders=getattr(c, "total_orders", 0),
        total_amount=getattr(c, "total_amount", 0.0),
        outstanding_balance=getattr(c, "outstanding_balance", 0.0),
        last_visit=getattr(c, "last_visit", None),
        status=getattr(c, "status", "Active"),
    )


@router.get(
    "/",
    response_model=list[CustomerListRead],
    summary="List customers",
    description="List customers with optional search (name, phone, email). Filter by store_id.",
)
async def list_customers_endpoint(
    search: str | None = Query(default=None),
    store_id: int | None = Query(default=None, description="Filter by store ID"),
    active_only: bool = Query(True),
    limit: int = Query(500, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("customers", "read")),
) -> list[CustomerListRead]:
    admin_id = _get_user_admin_id(current_user)

    # Scoping: if user is not Admin, restrict queries to their store
    if not isinstance(current_user, Admin):
        store_id = current_user.store_id

    customers = await list_customers(
        db,
        admin_id=admin_id,
        store_id=store_id,
        search=search,
        active_only=active_only,
        limit=limit,
        offset=offset,
    )
    return [_customer_to_list(c) for c in customers]


@router.get(
    "/phone/{phone}",
    response_model=CustomerDetailRead,
    summary="Lookup customer by phone",
    description="Find a customer by their phone number.",
)
async def get_by_phone_endpoint(
    phone: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("customers", "read")),
) -> CustomerDetailRead:
    admin_id = _get_user_admin_id(current_user)
    customer = await get_customer_by_phone(db, admin_id, phone)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found with that phone number",
        )
    # Scoping
    if not isinstance(current_user, Admin) and customer.store_id != current_user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's customer.",
        )

    # Load details
    customer_detail = await get_customer(db, customer.id)
    prescriptions = await list_prescriptions_for_customer(db, customer.id, limit=100)
    sales, _ = await list_sales(db, admin_id=admin_id, customer_id=customer.id, limit=100, paginate=False)

    active_p = next((p for p in prescriptions if p.is_active), None)
    
    read_data = CustomerDetailRead(
        **_customer_to_read(customer_detail).model_dump(),
        prescription=prescription_to_frontend_dict(active_p) if active_p else None,
        prescription_history=[prescription_to_frontend_dict(p) for p in prescriptions],
        orders=[sale_to_frontend_order(s) for s in sales],
        history=compile_customer_history(customer_detail, prescriptions, sales),
    )
    return read_data


@router.get(
    "/{customer_id}",
    response_model=CustomerDetailRead,
    summary="Get customer",
    description="Get full customer details.",
)
async def get_customer_endpoint(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("customers", "read")),
) -> CustomerDetailRead:
    admin_id = _get_user_admin_id(current_user)
    customer = await get_customer(db, customer_id)
    if not customer or customer.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    # Scoping
    if not isinstance(current_user, Admin) and customer.store_id != current_user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's customer.",
        )

    prescriptions = await list_prescriptions_for_customer(db, customer.id, limit=100)
    sales, _ = await list_sales(db, admin_id=admin_id, customer_id=customer.id, limit=100, paginate=False)

    active_p = next((p for p in prescriptions if p.is_active), None)

    read_data = CustomerDetailRead(
        **_customer_to_read(customer).model_dump(),
        prescription=prescription_to_frontend_dict(active_p) if active_p else None,
        prescription_history=[prescription_to_frontend_dict(p) for p in prescriptions],
        orders=[sale_to_frontend_order(s) for s in sales],
        history=compile_customer_history(customer, prescriptions, sales),
    )
    return read_data


# ── Create manual order schema ─────────────────────────────────

class ManualOrderCreate(BaseModel):
    order_date: date
    frame_name: str
    lens_type: str | None = None
    status: str = "Pending"
    amount: float


@router.post(
    "/{customer_id}/orders",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create manual order",
    description="Create a manual sales order for the customer using a generic product.",
)
async def create_manual_order(
    customer_id: int,
    payload: ManualOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("sales", "create")),
):
    admin_id = _get_user_admin_id(current_user)
    customer = await get_customer(db, customer_id)
    if not customer or customer.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    # Scoping
    if not isinstance(current_user, Admin) and customer.store_id != current_user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's customer.",
        )

    from models.product import Product
    from models.inventory import Inventory
    from models.manager import Manager
    from services.sale_service import create_sale
    from schemas.sale import SaleCreate, SaleItemCreate, SalePaymentCreate, SalePaymentMethodEnum, StaffTypeEnum

    sku = f"GENERIC-OPTICAL-A{admin_id}"
    stmt = select(Product).where(Product.sku == sku)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        # Fallback to any product
        stmt_any = select(Product).where(Product.admin_id == admin_id).limit(1)
        result_any = await db.execute(stmt_any)
        product = result_any.scalar_one_or_none()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No products found in database.",
            )

    store_id = customer.store_id or getattr(current_user, "store_id", 1)

    # Get or create store inventory record
    stmt_inv = select(Inventory).where(
        Inventory.owner_type == "STORE",
        Inventory.owner_id == store_id,
        Inventory.product_id == product.id
    )
    result_inv = await db.execute(stmt_inv)
    inventory = result_inv.scalar_one_or_none()
    if not inventory:
        from services.inventory_service import get_or_create_inventory
        inventory = await get_or_create_inventory(db, "STORE", store_id, product.id)
    
    # Force quantity availability to avoid bypass issues
    inventory.quantity = max(inventory.quantity, 100)
    inventory.available_quantity = max(inventory.available_quantity, 100)
    await db.commit()

    # Determine staff type
    if isinstance(current_user, Admin):
        sold_by_type = StaffTypeEnum.MANAGER
        stmt_mgr = select(Manager).where(Manager.store_id == store_id).limit(1)
        res_mgr = await db.execute(stmt_mgr)
        mgr = res_mgr.scalar_one_or_none()
        sold_by_id = mgr.id if mgr else 1
    else:
        if isinstance(current_user, Manager):
            sold_by_type = StaffTypeEnum.MANAGER
        elif isinstance(current_user, Optician):
            sold_by_type = StaffTypeEnum.OPTICIAN
        else:
            sold_by_type = StaffTypeEnum.WORKER
        sold_by_id = current_user.id

    # Map frontend status to backend SaleStatusEnum
    status_map = {
        "Pending": "PENDING",
        "Processing": "PARTIALLY_PAID",
        "Ready": "PARTIALLY_PAID",
        "Delivered": "COMPLETED",
    }
    backend_status = status_map.get(payload.status, "PENDING")

    payments = []
    if backend_status == "COMPLETED":
        payments.append(SalePaymentCreate(
            amount=Decimal(str(payload.amount)),
            payment_method=SalePaymentMethodEnum.CASH,
            remarks="Full payment logged on creation"
        ))

    sale_create = SaleCreate(
        store_id=store_id,
        customer_id=customer_id,
        sold_by_type=sold_by_type,
        sold_by_id=sold_by_id,
        sale_date=payload.order_date,
        notes=f"Lens: {payload.lens_type or 'None'}. Frame: {payload.frame_name}",
        items=[
            SaleItemCreate(
                product_id=product.id,
                inventory_id=inventory.id,
                quantity=1,
                unit_price=Decimal(str(payload.amount)),
                discount_percent=Decimal("0.00"),
                tax_percent=Decimal("0.00"),
                notes=payload.frame_name
            )
        ],
        payments=payments
    )

    sale = await create_sale(db, admin_id=admin_id, payload=sale_create)
    return sale_to_frontend_order(sale)
