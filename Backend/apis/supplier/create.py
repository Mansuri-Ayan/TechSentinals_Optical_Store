# API: supplier/create.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.supplier import SupplierCreate, SupplierRead
from services.supplier_service import create_supplier

router = APIRouter()


def _supplier_to_read(s) -> SupplierRead:
    return SupplierRead(
        **{c.key: getattr(s, c.key) for c in s.__table__.columns},
    )


@router.post(
    "/",
    response_model=SupplierRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create supplier",
    description="Create a new supplier for the current admin's business.",
)
async def create_supplier_endpoint(
    payload: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> SupplierRead:
    supplier = await create_supplier(db, admin_id=current_admin.id, payload=payload)
    return _supplier_to_read(supplier)
