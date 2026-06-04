# API: supplier/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.supplier import SupplierRead
from services.supplier_service import get_supplier, list_suppliers

router = APIRouter()


def _supplier_to_read(s) -> SupplierRead:
    return SupplierRead(
        **{c.key: getattr(s, c.key) for c in s.__table__.columns},
    )


@router.get(
    "/",
    response_model=list[SupplierRead],
    summary="List suppliers",
    description="List all suppliers for the current admin with optional filters.",
)
async def list_suppliers_endpoint(
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[SupplierRead]:
    suppliers = await list_suppliers(
        db,
        admin_id=current_admin.id,
        status_filter=status_filter,
        search=search,
        limit=limit,
        offset=offset,
    )
    return [_supplier_to_read(s) for s in suppliers]


@router.get(
    "/{supplier_id}",
    response_model=SupplierRead,
    summary="Get supplier",
    description="Get a single supplier by ID.",
)
async def get_supplier_endpoint(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> SupplierRead:
    supplier = await get_supplier(db, supplier_id)
    if not supplier or supplier.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )
    return _supplier_to_read(supplier)
