# API: prescription/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.prescription import PrescriptionRead, PrescriptionListRead
from services.prescription_service import (
    get_prescription,
    get_active_prescription,
    list_prescriptions_for_customer,
)
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


def _prescription_to_list(p) -> PrescriptionListRead:
    return PrescriptionListRead(
        **{
            col.key: getattr(p, col.key)
            for col in p.__table__.columns
            if col.key in PrescriptionListRead.model_fields
        },
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


@router.get(
    "/customer/{customer_id}",
    response_model=list[PrescriptionListRead],
    summary="List prescriptions for a customer",
    description="Get the prescription history for a customer (newest first).",
)
async def list_prescriptions_endpoint(
    customer_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[PrescriptionListRead]:
    # Verify customer belongs to this admin
    customer = await get_customer(db, customer_id)
    if not customer or customer.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    prescriptions = await list_prescriptions_for_customer(
        db, customer_id, limit=limit, offset=offset
    )
    return [_prescription_to_list(p) for p in prescriptions]


@router.get(
    "/customer/{customer_id}/active",
    response_model=PrescriptionRead | None,
    summary="Get active prescription",
    description="Get the current active prescription for a customer.",
)
async def get_active_prescription_endpoint(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> PrescriptionRead | None:
    # Verify customer belongs to this admin
    customer = await get_customer(db, customer_id)
    if not customer or customer.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    prescription = await get_active_prescription(db, customer_id)
    if not prescription:
        return None
    return _prescription_to_read(prescription)


@router.get(
    "/{prescription_id}",
    response_model=PrescriptionRead,
    summary="Get prescription",
    description="Get a single prescription by ID.",
)
async def get_prescription_endpoint(
    prescription_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> PrescriptionRead:
    prescription = await get_prescription(db, prescription_id)
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found",
        )
    # Verify customer belongs to this admin
    if prescription.customer and prescription.customer.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found",
        )
    return _prescription_to_read(prescription)
