# API: prescription/create.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from models.optician import Optician
from schemas.prescription import PrescriptionCreate, PrescriptionRead
from services.prescription_service import create_prescription, get_prescription
from services.customer_service import get_customer
from apis.customer.read import _get_user_admin_id

router = APIRouter()


def _prescription_to_read(p) -> PrescriptionRead:
    return PrescriptionRead(
        **{col.key: getattr(p, col.key) for col in p.__table__.columns},
        customer_name=(
            f"{p.customer.first_name} {p.customer.last_name or ''}".strip()
            if p.customer else None
        ),
        store_name=(
            p.store.store_name if p.store else None
        ),
        optician_name=(
            f"{p.optician.first_name} {p.optician.last_name}"
            if p.optician else None
        ),
    )


@router.post(
    "/",
    response_model=PrescriptionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create prescription",
    description=(
        "Create a new optical prescription for a customer. "
        "Automatically deactivates any previous active prescription."
    ),
)
async def create_prescription_endpoint(
    payload: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("prescriptions:create", "sales:create")),
) -> PrescriptionRead:
    admin_id = _get_user_admin_id(current_user)
    # Verify customer belongs to this admin
    customer = await get_customer(db, payload.customer_id)
    if not customer or customer.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    # Scoping check
    if not isinstance(current_user, Admin):
        if customer.store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this store's customer.",
            )
        # Assign store_id and optician_id automatically
        payload.store_id = current_user.store_id
        if isinstance(current_user, Optician):
            payload.optician_id = current_user.id

    prescription = await create_prescription(db, payload=payload)
    p = await get_prescription(db, prescription.id)
    return _prescription_to_read(p)
