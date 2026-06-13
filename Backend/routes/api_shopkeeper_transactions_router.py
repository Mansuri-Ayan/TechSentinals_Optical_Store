# Routes: api_shopkeeper_transactions_router.py
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, get_user_admin_id
from db.session import get_db
from models.manager import Manager
from schemas.inventory_transaction import TransactionRead
from schemas.pagination import PaginatedResponse
from services.transfer_service import (
    get_transactions_filtered,
    create_pending_request_service,
    create_pending_push_service,
    store_to_admin_transfer,
    purchase_stock,
)

router = APIRouter(
    prefix="/api/shopkeeper/transactions",
    tags=["Transactions (Manager)"],
)


class ManagerRequestPayload(BaseModel):
    product_id: int
    quantity: int
    from_owner_type: str  # "ADMIN" or "STORE"
    from_owner_id: int    # Admin ID or source store ID
    remarks: Optional[str] = None


class ManagerPushPayload(BaseModel):
    product_id: int
    quantity: int
    to_store_id: int      # Destination store ID
    remarks: Optional[str] = None


def _txn_to_read(txn) -> TransactionRead:
    return TransactionRead(
        **{c.key: getattr(txn, c.key) for c in txn.__table__.columns},
        product_name=txn.product.name if txn.product else None,
        product_sku=txn.product.sku if txn.product else None,
        send_store_name=txn.send_store.store_name if txn.send_store else "Admin Warehouse",
        receive_store_name=txn.receive_store.store_name if txn.receive_store else "Admin Warehouse",
        requested_by_store_name=txn.requested_by_store.store_name if txn.requested_by_store else None,
        approved_by_store_name=txn.approved_by_store.store_name if txn.approved_by_store else None,
    )


@router.get("/", response_model=PaginatedResponse[TransactionRead])
async def list_manager_transactions(
    status_filter: Optional[str] = Query(None, alias="status"),
    transfer_direction: Optional[str] = Query(None),
    is_request: Optional[bool] = Query(None),
    product_id: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    transaction_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """List transactions for the manager's store only."""
    if not isinstance(current_user, Manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden — Manager role required",
        )
    
    admin_id = get_user_admin_id(current_user)
    offset = (page - 1) * limit
    
    items, total = await get_transactions_filtered(
        db=db,
        admin_id=admin_id,
        status=status_filter,
        transfer_direction=transfer_direction,
        is_request=is_request,
        store_id=current_user.store_id,
        product_id=product_id,
        date_from=date_from,
        date_to=date_to,
        transaction_type=transaction_type,
        search=search,
        limit=limit,
        offset=offset,
    )
    pages = (total + limit - 1) // limit if limit > 0 else 1
    return PaginatedResponse[TransactionRead](
        items=[_txn_to_read(item) for item in items],
        total=total,
        page=page,
        pages=pages,
        limit=limit,
    )


@router.post("/request", response_model=list[TransactionRead], status_code=status.HTTP_201_CREATED)
async def create_manager_transfer_request(
    payload: ManagerRequestPayload,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Create a transfer request (pull request) as Manager (Rule 3 or Rule 4)."""
    if not isinstance(current_user, Manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden — Manager role required",
        )

    txn_out, txn_in = await create_pending_request_service(
        db=db,
        manager_user_id=current_user.id,
        manager_store_id=current_user.store_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        from_owner_type=payload.from_owner_type,
        from_owner_id=payload.from_owner_id,
        remarks=payload.remarks,
    )
    return [_txn_to_read(txn_out), _txn_to_read(txn_in)]


@router.post("/push", response_model=list[TransactionRead], status_code=status.HTTP_201_CREATED)
async def create_manager_transfer_push(
    payload: ManagerPushPayload,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Create a stock push transfer to another store (Rule 5) or send back to Admin (Rule 6)."""
    if not isinstance(current_user, Manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden — Manager role required",
        )

    # Note: manager sending stock back to Admin (Rule 6) can be triggered if to_store_id is 0 or matches Admin
    # In the UI, the dropdown lists other stores, but Rule 6 could be invoked if we detect admin.
    # We will support a push back to Admin warehouse if to_store_id == 0.
    if payload.to_store_id == 0:
        # Rule 6: Send back to Admin warehouse
        admin_id = get_user_admin_id(current_user)
        txn_out, txn_in = await store_to_admin_transfer(
            db=db,
            admin_id=admin_id,
            store_id=current_user.store_id,
            product_id=payload.product_id,
            quantity=payload.quantity,
            created_by=current_user.id,
            remarks=payload.remarks,
            is_admin_pull=False,  # This tells the service it is a manager return
        )
        return [_txn_to_read(txn_out), _txn_to_read(txn_in)]

    # Rule 5: Manager pushes stock to another store (PENDING)
    txn_out, txn_in = await create_pending_push_service(
        db=db,
        manager_user_id=current_user.id,
        manager_store_id=current_user.store_id,
        to_store_id=payload.to_store_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        remarks=payload.remarks,
    )
    return [_txn_to_read(txn_out), _txn_to_read(txn_in)]


class ManagerPurchasePayload(BaseModel):
    product_id: int
    quantity: int
    purchase_price: float
    remarks: Optional[str] = None


@router.post("/purchase", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
async def create_manager_purchase(
    payload: ManagerPurchasePayload,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Record a supplier purchase directly into the manager's own store inventory."""
    if not isinstance(current_user, Manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden — Manager role required",
        )

    admin_id = get_user_admin_id(current_user)
    txn = await purchase_stock(
        db,
        admin_id=admin_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        purchase_price=payload.purchase_price,
        created_by=current_user.id,
        owner_type="STORE",
        owner_id=current_user.store_id,
        remarks=payload.remarks,
    )
    return _txn_to_read(txn)
