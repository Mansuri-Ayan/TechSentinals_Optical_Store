# Service: prescription_service.py
"""
Business logic for Prescription CRUD.
"""
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.prescription import Prescription
from schemas.prescription import PrescriptionCreate, PrescriptionUpdate


# ── Create ─────────────────────────────────────────────────────

async def create_prescription(
    db: AsyncSession,
    payload: PrescriptionCreate,
) -> Prescription:
    """
    Create a new prescription for a customer.
    Automatically deactivates any previous active prescriptions for the
    same customer.
    """
    # Deactivate all previous active prescriptions for this customer
    stmt = (
        update(Prescription)
        .where(
            Prescription.customer_id == payload.customer_id,
            Prescription.is_active.is_(True),
        )
        .values(is_active=False)
    )
    await db.execute(stmt)

    prescription = Prescription(**payload.model_dump())
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)
    return prescription


# ── Read ───────────────────────────────────────────────────────

async def get_prescription(
    db: AsyncSession,
    prescription_id: int,
) -> Prescription | None:
    """Fetch a single prescription by ID."""
    stmt = select(Prescription).where(Prescription.id == prescription_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_active_prescription(
    db: AsyncSession,
    customer_id: int,
) -> Prescription | None:
    """Get the current active prescription for a customer."""
    stmt = select(Prescription).where(
        Prescription.customer_id == customer_id,
        Prescription.is_active.is_(True),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_prescriptions_for_customer(
    db: AsyncSession,
    customer_id: int,
    limit: int = 50,
    offset: int = 0,
) -> list[Prescription]:
    """List all prescriptions (history) for a customer, newest first."""
    stmt = (
        select(Prescription)
        .where(Prescription.customer_id == customer_id)
        .order_by(Prescription.prescription_date.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ── Update ─────────────────────────────────────────────────────

async def update_prescription(
    db: AsyncSession,
    prescription: Prescription,
    payload: PrescriptionUpdate,
) -> Prescription:
    """Apply partial updates to a prescription."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prescription, field, value)
    await db.commit()
    await db.refresh(prescription)
    return prescription


# ── Delete ─────────────────────────────────────────────────────

async def delete_prescription(
    db: AsyncSession,
    prescription: Prescription,
) -> None:
    """Hard-delete a prescription record."""
    await db.delete(prescription)
    await db.commit()
