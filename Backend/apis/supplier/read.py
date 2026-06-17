# API: supplier/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.pagination import PaginatedResponse
from schemas.supplier import SupplierRead
from services.store_service import get_store
from services.supplier_service import get_supplier, list_suppliers

router = APIRouter()


def _supplier_to_read(s) -> SupplierRead:
    return SupplierRead(
        **{c.key: getattr(s, c.key) for c in s.__table__.columns},
    )


@router.get(
    "/",
    response_model=PaginatedResponse[SupplierRead],
    summary="List suppliers",
    description="List all suppliers for the current admin with optional filters.",
)
async def list_suppliers_endpoint(
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    store_id: str | None = Query(default=None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> PaginatedResponse[SupplierRead]:
    numeric_store_id = None
    if store_id and store_id.lower() != "admin":
        try:
            numeric_store_id = int(store_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid store_id format")
        
        store = await get_store(db, numeric_store_id)
        if store is None or store.admin_id != current_admin.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Store not found",
            )

    offset = (page - 1) * limit
    suppliers, total = await list_suppliers(
        db,
        admin_id=current_admin.id,
        store_id=numeric_store_id,
        status_filter=status_filter,
        search=search,
        limit=limit,
        offset=offset,
    )
    pages = (total + limit - 1) // limit if limit > 0 else 1
    return PaginatedResponse[SupplierRead](
        items=[_supplier_to_read(s) for s in suppliers],
        total=total,
        page=page,
        pages=pages,
        limit=limit,
    )


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
