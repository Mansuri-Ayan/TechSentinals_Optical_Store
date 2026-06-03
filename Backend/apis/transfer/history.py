# API: transfer/history.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.inventory_transaction import TransactionRead
from services.transfer_service import get_transaction_history

router = APIRouter()


def _txn_to_read(txn) -> TransactionRead:
    return TransactionRead(
        **{c.key: getattr(txn, c.key) for c in txn.__table__.columns},
        product_name=txn.product.name if txn.product else None,
        product_sku=txn.product.sku if txn.product else None,
        send_store_name=txn.send_store.store_name if txn.send_store else None,
        receive_store_name=txn.receive_store.store_name if txn.receive_store else None,
    )


@router.get(
    "/history",
    response_model=list[TransactionRead],
    summary="Transaction history",
    description="Fetch inventory transaction history with optional filters.",
)
async def transaction_history_endpoint(
    product_id: int | None = Query(None),
    inventory_id: int | None = Query(None),
    transaction_type: str | None = Query(None),
    store_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[TransactionRead]:
    transactions = await get_transaction_history(
        db,
        admin_id=current_admin.id,
        product_id=product_id,
        inventory_id=inventory_id,
        transaction_type=transaction_type,
        store_id=store_id,
        limit=limit,
        offset=offset,
    )
    return [_txn_to_read(txn) for txn in transactions]
