# API: repair/bill.py
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from core.deps import require_permission, get_user_admin_id
from models.admin import Admin
from services.repair_service import get_repair
from services.bill_service import update_bill_for_repair
from services.pdf_bill_service import generate_repair_pdf

router = APIRouter()

@router.get(
    "/{repair_id}/bill",
    summary="Get repair bill HTML",
    description="Fetch stored HTML bill for a repair job. Generates one if it doesn't exist yet.",
)
async def get_repair_bill_endpoint(
    repair_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("repairs", "read")),
):
    admin_id = get_user_admin_id(current_user)
    repair = await get_repair(db, repair_id=repair_id, admin_id=admin_id)
    if not repair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repair job not found",
        )

    if not isinstance(current_user, Admin) and repair.store_id != current_user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's repair bill.",
        )

    bill = await update_bill_for_repair(db, repair_id=repair_id, commit=True)
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate repair bill",
        )

    return {
        "repair_id": repair_id,
        "bill_number": bill.bill_number,
        "html_content": bill.html_content,
    }


@router.get(
    "/{repair_id}/bill/download",
    summary="Download repair bill PDF",
    description="Download the repair bill as a PDF document.",
)
async def download_repair_bill_endpoint(
    repair_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("repairs", "read")),
):
    admin_id = get_user_admin_id(current_user)
    repair = await get_repair(db, repair_id=repair_id, admin_id=admin_id)
    if not repair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repair job not found",
        )

    if not isinstance(current_user, Admin) and repair.store_id != current_user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's repair bill.",
        )

    pdf_bytes = await generate_repair_pdf(repair, db)

    cost = repair.final_cost if repair.final_cost is not None else (repair.estimated_cost or 0)
    if repair.is_warranty:
        cost = 0
    paid = repair.advance_paid or 0
    is_final = (cost - paid) <= 0 or repair.is_warranty
    prefix = "Final" if is_final else "Temporary"

    filename = f"{prefix}_Repair_Bill_{repair.repair_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
