# API: apis/qc/damaged_items.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from core.deps import require_permission, get_user_admin_id
from schemas.qc import (
    QCDamageCompensationRequest,
    QCDamagedItemRead,
    SupplierResolutionRequest,
    LabResolutionRequest,
    MarkAsLossRequest,
    VerifyResolutionRequest,
    ReopenDamagedItemRequest,
    ChangeResolutionRequest,
    MarkFailedRequest,
    QCDamagedItemHistoryRead,
)
from services.qc_service import (
    list_damaged_items,
    record_supplier_compensation,
    resolve_supplier_damage,
    resolve_lab_damage,
    mark_damaged_item_as_loss,
    verify_and_complete_damage_resolution,
    mark_damage_resolution_failed,
    reopen_damaged_item,
    change_damaged_item_resolution,
    get_damaged_item_history,
)

router = APIRouter()


@router.get(
    "/damaged-items",
    summary="List Damaged/Issue Items",
    description="Retrieve paginated list of items that failed QC pre-lab (STOCK_DAMAGE) or post-lab (LAB_DAMAGE/FITTING_FAILURE).",
)
async def list_damaged_items_endpoint(
    store_id: int | None = Query(default=None),
    damage_type: str | None = Query(default=None),
    stage: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:read", "deadstock:read")),
):
    admin_id = get_user_admin_id(current_user)

    # Store staff restriction: limit to user's store_id if not admin
    if hasattr(current_user, "store_id") and current_user.store_id:
        store_id = current_user.store_id

    return await list_damaged_items(
        db=db,
        admin_id=admin_id,
        store_id=store_id,
        damage_type=damage_type,
        stage=stage,
        status=status_filter,
        search=search,
        page=page,
        limit=limit,
    )


@router.post(
    "/damaged-items/{damaged_item_id}/supplier-resolution",
    response_model=QCDamagedItemRead,
    summary="Resolve Supplier Damage Claim",
    description="Settle supplier damage claim with 1. Replacement, 2. Full Compensation, 3. Partial Compensation, 4. No Compensation, or 5. Mark as Loss.",
)
async def resolve_supplier_damage_endpoint(
    damaged_item_id: int,
    payload: SupplierResolutionRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:manage", "deadstock:update")),
):
    return await resolve_supplier_damage(
        db=db,
        user=current_user,
        damaged_item_id=damaged_item_id,
        resolution_type=payload.resolution_type,
        compensation_type=payload.compensation_type,
        amount=payload.compensation_amount,
        loss_reason=payload.loss_reason,
        loss_amount=payload.loss_amount,
        new_product_id=payload.new_product_id,
        po_id=payload.po_id,
        notes=payload.resolution_notes,
        is_promise=payload.is_promise,
        expected_date=payload.expected_date,
    )


@router.post(
    "/damaged-items/{damaged_item_id}/lab-resolution",
    response_model=QCDamagedItemRead,
    summary="Resolve Lab Damage Claim",
    description="Settle lab damage claim with 1. Full Compensation, 2. Partial Compensation, 3. Replacement, 4. No Compensation, or 5. Mark as Loss.",
)
async def resolve_lab_damage_endpoint(
    damaged_item_id: int,
    payload: LabResolutionRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:manage", "deadstock:update")),
):
    return await resolve_lab_damage(
        db=db,
        user=current_user,
        damaged_item_id=damaged_item_id,
        resolution_type=payload.resolution_type,
        amount=payload.compensation_amount,
        loss_reason=payload.loss_reason,
        loss_amount=payload.loss_amount,
        notes=payload.resolution_notes,
        is_promise=payload.is_promise,
        expected_date=payload.expected_date,
    )


@router.post(
    "/damaged-items/{damaged_item_id}/mark-as-loss",
    response_model=QCDamagedItemRead,
    summary="Mark Damaged Item as Loss",
    description="Explicitly write off damaged stock (from supplier or lab) as a loss with recorded reason and notes.",
)
async def mark_damaged_item_as_loss_endpoint(
    damaged_item_id: int,
    payload: MarkAsLossRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:manage", "deadstock:update")),
):
    return await mark_damaged_item_as_loss(
        db=db,
        user=current_user,
        damaged_item_id=damaged_item_id,
        loss_reason=payload.loss_reason,
        loss_amount=payload.loss_amount,
        notes=payload.resolution_notes,
    )


@router.post(
    "/damaged-items/{damaged_item_id}/resolve-compensation",
    response_model=QCDamagedItemRead,
    summary="Record Supplier/Lab Damage Compensation",
    description="Settle damage claims via Credit Note, Cash Refund, or Replacement Item. Automatically posts SupplierPayment credit note if po_id supplied.",
)
async def resolve_damage_compensation_endpoint(
    damaged_item_id: int,
    payload: QCDamageCompensationRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:manage", "deadstock:update")),
):
    return await record_supplier_compensation(
        db=db,
        user=current_user,
        damaged_item_id=damaged_item_id,
        compensation_type=payload.compensation_type,
        amount=payload.amount,
        po_id=payload.po_id,
        notes=payload.resolution_notes,
    )


@router.post(
    "/damaged-items/{damaged_item_id}/verify-complete",
    response_model=QCDamagedItemRead,
    summary="Verify & Complete Promised Damage Resolution",
    description="Verify delivery of promised replacement stock or compensation settlement. Increases store inventory for physical replacement items.",
)
async def verify_complete_damage_endpoint(
    damaged_item_id: int,
    payload: VerifyResolutionRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:manage", "deadstock:update")),
):
    return await verify_and_complete_damage_resolution(
        db=db,
        user=current_user,
        damaged_item_id=damaged_item_id,
        verified_notes=payload.verified_notes,
        received_quantity=payload.received_quantity or 1,
    )


@router.post(
    "/damaged-items/{damaged_item_id}/mark-failed",
    response_model=QCDamagedItemRead,
    summary="Mark Promised Resolution as Failed",
    description="Flag a vendor or lab promise as failed/unfulfilled so it can be re-resolved or written off.",
)
async def mark_failed_damage_endpoint(
    damaged_item_id: int,
    payload: MarkFailedRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:manage", "deadstock:update")),
):
    return await mark_damage_resolution_failed(
        db=db,
        user=current_user,
        damaged_item_id=damaged_item_id,
        failure_reason=payload.failure_reason,
        notes=payload.notes,
    )


@router.post(
    "/damaged-items/{damaged_item_id}/reopen",
    response_model=QCDamagedItemRead,
    summary="Reopen Damaged Item Record",
    description="Reopen a previously resolved or written-off damage record for re-evaluation or alternative resolution.",
)
async def reopen_damaged_item_endpoint(
    damaged_item_id: int,
    payload: ReopenDamagedItemRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:manage", "deadstock:update")),
):
    return await reopen_damaged_item(
        db=db,
        user=current_user,
        damaged_item_id=damaged_item_id,
        reason=payload.reason,
        notes=payload.notes,
    )


@router.post(
    "/damaged-items/{damaged_item_id}/change-resolution",
    response_model=QCDamagedItemRead,
    summary="Change Damage Resolution",
    description="Modify or substitute the existing resolution (e.g. from Loss to Replacement/Compensation, or adjust terms).",
)
async def change_damage_resolution_endpoint(
    damaged_item_id: int,
    payload: ChangeResolutionRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:manage", "deadstock:update")),
):
    return await change_damaged_item_resolution(
        db=db,
        user=current_user,
        damaged_item_id=damaged_item_id,
        new_resolution_type=payload.new_resolution_type,
        compensation_type=payload.compensation_type,
        amount=payload.compensation_amount,
        loss_reason=payload.loss_reason,
        loss_amount=payload.loss_amount,
        is_promise=payload.is_promise,
        expected_date=payload.expected_date,
        change_reason=payload.change_reason,
        notes=payload.notes,
    )


@router.get(
    "/damaged-items/{damaged_item_id}/history",
    response_model=list[QCDamagedItemHistoryRead],
    summary="Get Damaged Item Audit History",
    description="Retrieve the complete chronological history of resolution actions, promises, re-openings, and status changes for a damaged item.",
)
async def get_damaged_item_history_endpoint(
    damaged_item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:read", "deadstock:read")),
):
    return await get_damaged_item_history(
        db=db,
        damaged_item_id=damaged_item_id,
    )
