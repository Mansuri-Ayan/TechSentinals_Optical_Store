# API: prescription/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from schemas.prescription import PrescriptionUpdate, PrescriptionRead
from services.prescription_service import (
    get_prescription,
    update_prescription,
    delete_prescription,
)
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


@router.put(
    "/{prescription_id}",
    response_model=PrescriptionRead,
    summary="Update prescription",
    description="Update prescription details.",
)
async def update_prescription_endpoint(
    prescription_id: int,
    payload: PrescriptionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> PrescriptionRead:
    admin_id = _get_user_admin_id(current_user)
    prescription = await get_prescription(db, prescription_id)
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found",
        )
    # Verify customer belongs to this admin
    if prescription.customer and prescription.customer.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found",
        )
    # Scoping check
    if not isinstance(current_user, Admin):
        if prescription.customer and prescription.customer.store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this store's prescriptions.",
            )
    updated = await update_prescription(db, prescription, payload)
    return _prescription_to_read(updated)


@router.delete(
    "/{prescription_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete prescription",
    description="Delete a prescription record.",
)
async def delete_prescription_endpoint(
    prescription_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> None:
    admin_id = _get_user_admin_id(current_user)
    prescription = await get_prescription(db, prescription_id)
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found",
        )
    # Verify customer belongs to this admin
    if prescription.customer and prescription.customer.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found",
        )
    # Scoping check
    if not isinstance(current_user, Admin):
        if prescription.customer and prescription.customer.store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this store's prescriptions.",
            )
    await delete_prescription(db, prescription)
