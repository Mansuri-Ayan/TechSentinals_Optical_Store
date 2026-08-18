# API: supplier/create.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
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
    current_user = Depends(require_permission('suppliers', 'create')),
) -> SupplierRead:
    admin_id = get_user_admin_id(current_user)

    # Determine store_id for auto-linking
    from models.admin import Admin
    if isinstance(current_user, Admin):
        store_id = getattr(payload, 'store_id', None)
    else:
        store_id = getattr(current_user, 'store_id', None)

    supplier = await create_supplier(db, admin_id=admin_id, payload=payload, store_id=store_id)
    return _supplier_to_read(supplier)
