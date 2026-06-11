# API: repair/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.repair import RepairRead, RepairListItem, RepairListResponse
from services.repair_service import get_repair, list_repairs, _build_repair_read_dict

router = APIRouter()


def _repair_to_list_item(repair) -> RepairListItem:
    extra = _build_repair_read_dict(repair)
    return RepairListItem(
        id=repair.id,
        repair_number=repair.repair_number,
        repair_type=repair.repair_type.value if hasattr(repair.repair_type, "value") else str(repair.repair_type),
        status=repair.status.value if hasattr(repair.status, "value") else str(repair.status),
        is_warranty=repair.is_warranty,
        estimated_cost=repair.estimated_cost,
        final_cost=repair.final_cost,
        advance_paid=repair.advance_paid,
        received_date=repair.received_date,
        estimated_completion_date=repair.estimated_completion_date,
        completed_date=repair.completed_date,
        notes=repair.notes,
        description=repair.description,
        customer_name=repair.customer_name,
        created_at=repair.created_at,
        **extra,
    )


def _repair_to_read(repair) -> RepairRead:
    extra = _build_repair_read_dict(repair)
    return RepairRead(
        **{c.key: getattr(repair, c.key) for c in repair.__table__.columns},
        **extra,
    )


@router.get(
    "/",
    response_model=RepairListResponse,
    summary="List repair/service jobs",
    description="List all repair jobs with optional filtering by store, customer, status, type, and search.",
)
async def list_repairs_endpoint(
    store_id: int | None = Query(None, description="Filter by store ID"),
    customer_id: int | None = Query(None, description="Filter by customer ID"),
    status: str | None = Query(None, description="Filter by status"),
    repair_type: str | None = Query(None, description="Filter by repair type"),
    search: str | None = Query(None, description="Search by repair number, customer name, or description"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> RepairListResponse:
    admin_id = get_user_admin_id(current_user)

    # Scoping: if not admin, restrict queries to their store
    if not isinstance(current_user, Admin):
        store_id = current_user.store_id

    repairs, total = await list_repairs(
        db,
        admin_id=admin_id,
        store_id=store_id,
        customer_id=customer_id,
        status=status,
        repair_type=repair_type,
        search=search,
        limit=limit,
        offset=offset,
    )
    return RepairListResponse(
        items=[_repair_to_list_item(r) for r in repairs],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{repair_id}",
    response_model=RepairRead,
    summary="Get a single repair job",
)
async def get_repair_endpoint(
    repair_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> RepairRead:
    admin_id = get_user_admin_id(current_user)
    repair = await get_repair(db, repair_id=repair_id, admin_id=admin_id)
    if not repair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repair not found",
        )
    
    # Scoping: if not admin, restrict detail view to their store
    if not isinstance(current_user, Admin) and repair.store_id != current_user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's repair record.",
        )

    return _repair_to_read(repair)
