# API: exchange/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission
from db.session import get_db
from models.admin import Admin
from schemas.exchange import ExchangeRead
from services.exchange_service import get_exchange, cancel_exchange
from apis.exchange.create import _exchange_to_read

router = APIRouter()


@router.post(
    "/{exchange_id}/cancel",
    response_model=ExchangeRead,
    summary="Cancel Exchange",
    description="Cancel an exchange, restore stock of issued items, and remove stock of returned item.",
)
async def cancel_exchange_endpoint(
    exchange_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("exchanges", "delete")),
) -> ExchangeRead:
    exchange = await get_exchange(db, exchange_id)
    if not exchange:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange not found.",
        )

    if isinstance(current_user, Admin):
        allowed = exchange.admin_id == current_user.id
    else:
        allowed = exchange.store_id == current_user.store_id

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's exchange records.",
        )

    cancelled = await cancel_exchange(db, exchange, cancelled_by=current_user.id)
    return _exchange_to_read(cancelled)
