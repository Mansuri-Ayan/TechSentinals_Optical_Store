# API: prescription/create.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.prescription import PrescriptionCreate, PrescriptionRead
from services.prescription_service import create_prescription
from services.customer_service import get_customer

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
    current_admin: Admin = Depends(get_current_admin),
) -> PrescriptionRead:
    # Verify customer belongs to this admin
    customer = await get_customer(db, payload.customer_id)
    if not customer or customer.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    prescription = await create_prescription(db, payload=payload)
    return _prescription_to_read(prescription)
