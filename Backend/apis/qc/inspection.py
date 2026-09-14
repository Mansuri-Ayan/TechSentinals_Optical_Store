# API: apis/qc/inspection.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from core.deps import require_permission
from schemas.qc import (
    PreLabQCRequest,
    PostLabQCRequest,
    QCCustomerContactRequest,
    SaleItemQCHistoryRead,
    QCCustomerContactLogRead,
    ItemReplacementOptionsResponse,
    ResolveDamageRequest,
)
from services.qc_service import (
    perform_pre_lab_qc,
    perform_post_lab_qc,
    log_customer_contact,
    get_item_qc_history,
    get_sale_item_with_context,
    get_item_replacement_options,
    resolve_sale_item_damage,
)

router = APIRouter()


@router.get(
    "/items/{sale_item_id}/replacement-options",
    response_model=ItemReplacementOptionsResponse,
    summary="Get Replacement & Stock Options for Damaged Item",
    description="Check local store stock, sister stores under same admin, and supplier info to decide replacement action.",
)
async def get_item_replacement_options_endpoint(
    sale_item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:read")),
):
    return await get_item_replacement_options(db, sale_item_id)


@router.post(
    "/items/{sale_item_id}/resolve-damage",
    summary="Resolve Damaged SaleItem via User Choice",
    description="Execute user chosen action: REPLACE_LOCAL, REQUEST_TRANSFER, SUPPLIER_PURCHASE, or CUSTOMER_DECISION.",
)
async def resolve_sale_item_damage_endpoint(
    sale_item_id: int,
    payload: ResolveDamageRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:perform")),
):
    item = await resolve_sale_item_damage(
        db=db,
        user=current_user,
        sale_item_id=sale_item_id,
        action=payload.action,
        from_store_id=payload.from_store_id,
        customer_choice=payload.customer_choice,
        new_product_id=payload.new_product_id,
        contact_channel=payload.contact_channel,
        notes=payload.notes,
    )
    return {
        "message": f"Damaged item resolved via '{payload.action}' successfully",
        "sale_item_id": item.id,
        "qc_status": item.qc_status,
        "resolution_status": item.resolution_status,
        "customer_decision": item.customer_decision,
    }



@router.post(
    "/items/{sale_item_id}/pre-lab",
    summary="Submit Pre-Lab QC Evaluation",
    description="Inspect a SaleItem before sending to lab. Flag pass or stock damage failure.",
)
async def submit_pre_lab_qc_endpoint(
    sale_item_id: int,
    payload: PreLabQCRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:perform")),
):
    item = await perform_pre_lab_qc(
        db=db,
        user=current_user,
        sale_item_id=sale_item_id,
        passed=payload.passed,
        notes=payload.notes,
    )
    return {
        "message": "Pre-lab QC inspection submitted successfully",
        "sale_item_id": item.id,
        "qc_status": item.qc_status,
        "damage_type": item.damage_type,
        "resolution_status": item.resolution_status,
    }


@router.post(
    "/items/{sale_item_id}/post-lab",
    summary="Submit Post-Lab QC Evaluation",
    description="Inspect a SaleItem after returning from lab. Options: PASSED, FITTING_FAILURE, LAB_DAMAGE, STOCK_DAMAGE.",
)
async def submit_post_lab_qc_endpoint(
    sale_item_id: int,
    payload: PostLabQCRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:perform")),
):
    item = await perform_post_lab_qc(
        db=db,
        user=current_user,
        sale_item_id=sale_item_id,
        outcome=payload.outcome,
        notes=payload.notes,
    )
    return {
        "message": f"Post-lab QC evaluation ({payload.outcome}) submitted successfully",
        "sale_item_id": item.id,
        "qc_status": item.qc_status,
        "damage_type": item.damage_type,
        "rework_count": item.rework_count,
        "resolution_status": item.resolution_status,
    }


@router.post(
    "/items/{sale_item_id}/contact-log",
    summary="Log Customer Contact & Choice",
    description="Record manual (Phone/WhatsApp) or system email contact with customer regarding order issues.",
)
async def log_customer_contact_endpoint(
    sale_item_id: int,
    payload: QCCustomerContactRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:perform")),
):
    log_entry = await log_customer_contact(
        db=db,
        user=current_user,
        sale_item_id=sale_item_id,
        contact_channel=payload.contact_channel,
        summary_notes=payload.summary_notes,
        customer_choice=payload.customer_choice,
    )
    return {
        "message": "Customer contact log entry recorded successfully",
        "log_id": log_entry.id,
        "contact_channel": log_entry.contact_channel,
        "customer_choice": log_entry.customer_choice,
    }


@router.get(
    "/items/{sale_item_id}/history",
    response_model=list[SaleItemQCHistoryRead],
    summary="Get SaleItem QC Audit History",
    description="Retrieve full chronological timeline of all QC evaluations and transitions for a line item.",
)
async def get_item_qc_history_endpoint(
    sale_item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:read")),
):
    return await get_item_qc_history(db, sale_item_id)


@router.get(
    "/items/{sale_item_id}/contact-logs",
    response_model=list[QCCustomerContactLogRead],
    summary="Get SaleItem Customer Contact Logs",
    description="Retrieve all customer contact notes and choices logged for a line item.",
)
async def get_item_contact_logs_endpoint(
    sale_item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("qc:read")),
):
    item = await get_sale_item_with_context(db, sale_item_id)
    return item.contact_logs
