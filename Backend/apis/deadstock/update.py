# API Endpoint: deadstock/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import require_permission
from db.session import get_db
from models.admin import Admin
from schemas.deadstock import DeadstockReuseResponse
from services.deadstock_service import reuse_deadstock

router = APIRouter()


@router.post(
    "/{item_id}/reuse",
    response_model=DeadstockReuseResponse,
    summary="Move a deadstock frame/accessory back into regular inventory",
)
async def reuse_deadstock_endpoint(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("deadstock", "update")),

):
    if isinstance(current_user, Admin):
        admin_id = current_user.id
        user_id = current_user.id
    else:
        admin_id = current_user.store.admin_id
        user_id = current_user.id

    ds_item, inventory = await reuse_deadstock(
        db=db,
        item_id=item_id,
        admin_id=admin_id,
        user_id=user_id,
    )

    return DeadstockReuseResponse(
        message=f"Item {ds_item.sku} successfully moved from deadstock to active inventory.",
        deadstock_item_id=ds_item.id,
        inventory_id=inventory.id,
        status=ds_item.status.value if hasattr(ds_item.status, "value") else str(ds_item.status),
    )
