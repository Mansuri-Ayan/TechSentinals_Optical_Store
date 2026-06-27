# Routes: api_transactions_router.py
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_admin, get_current_user
from db.session import get_db
from models.admin import Admin
from schemas.inventory_transaction import TransactionRead, TransferRequest
from services.transfer_service import (
    get_transactions_filtered,
    admin_to_store_transfer,
    store_to_admin_transfer,
    store_to_store_transfer,
    approve_transaction_service,
    reject_transaction_service,
    get_warehouse_transactions,
    create_pending_request_service,
)

router = APIRouter(
    prefix="/api/transactions",
    tags=["Transactions (Admin)"],
)


class RejectionPayload(BaseModel):
    reason: str


class AdminRequestPayload(BaseModel):
    product_id: int
    quantity: int
    from_owner_type: str  # "ADMIN" or "STORE"
    from_owner_id: int    # Source store ID (or Admin ID if ADMIN)
    to_owner_type: str    # "STORE" (always STORE for requests)
    to_owner_id: int      # Destination store ID
    remarks: Optional[str] = None


def _txn_to_read(txn) -> TransactionRead:
    snap = txn.product_snapshot
    return TransactionRead(
        **{c.key: getattr(txn, c.key) for c in txn.__table__.columns},
        product_snapshot=snap,
        product_name=snap.name if snap else (txn.product.name if txn.product else None),
        product_sku=snap.sku if snap else (txn.product.sku if txn.product else None),
        send_store_name=txn.send_store.store_name if txn.send_store else "Admin Warehouse",
        receive_store_name=txn.receive_store.store_name if txn.receive_store else "Admin Warehouse",
        requested_by_store_name=txn.requested_by_store.store_name if txn.requested_by_store else None,
        approved_by_store_name=txn.approved_by_store.store_name if txn.approved_by_store else None,
    )


@router.get("/", response_model=list[TransactionRead])
async def list_all_transactions(
    status_filter: Optional[str] = Query(None, alias="status"),
    transfer_direction: Optional[str] = Query(None),
    is_request: Optional[bool] = Query(None),
    store_id: Optional[str] = Query(None),
    product_id: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    transaction_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """List all transactions across all stores (Admin only)."""
    offset = (page - 1) * limit
    items, total = await get_transactions_filtered(
        db=db,
        admin_id=current_admin.id,
        status=status_filter,
        transfer_direction=transfer_direction,
        is_request=is_request,
        store_id=store_id,
        product_id=product_id,
        date_from=date_from,
        date_to=date_to,
        transaction_type=transaction_type,
        search=search,
        limit=limit,
        offset=offset,
    )
    return [_txn_to_read(item) for item in items]


@router.get("/store/{store_id}", response_model=list[TransactionRead])
async def list_store_transactions(
    store_id: str,
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
    current_admin: Admin = Depends(get_current_admin),
):
    """List transactions for a specific store (Admin only)."""
    offset = (page - 1) * limit
    items, total = await get_transactions_filtered(
        db=db,
        admin_id=current_admin.id,
        status=status_filter,
        transfer_direction=transfer_direction,
        is_request=is_request,
        store_id=store_id,
        product_id=product_id,
        date_from=date_from,
        date_to=date_to,
        transaction_type=transaction_type,
        search=search,
        limit=limit,
        offset=offset,
    )
    return [_txn_to_read(item) for item in items]


@router.get("/warehouse", response_model=list[TransactionRead])
async def list_warehouse_transactions(
    status_filter: Optional[str] = Query(None, alias="status"),
    product_id: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    transaction_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """List transactions specifically for the admin warehouse (Admin only)."""
    offset = (page - 1) * limit
    items, total = await get_warehouse_transactions(
        db=db,
        admin_id=current_admin.id,
        status=status_filter,
        product_id=product_id,
        date_from=date_from,
        date_to=date_to,
        transaction_type=transaction_type,
        search=search,
        limit=limit,
        offset=offset,
    )
    return [_txn_to_read(item) for item in items]


@router.post("/", response_model=list[TransactionRead], status_code=status.HTTP_201_CREATED)
async def create_admin_transaction(
    payload: TransferRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Create a transaction directly as Admin (Auto-completed)."""
    from_type = payload.from_owner_type.upper()
    to_type = payload.to_owner_type.upper()

    if from_type == to_type and payload.from_owner_id == payload.to_owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination must be different",
        )

    if from_type == "ADMIN" and to_type == "STORE":
        txn_out, txn_in = await admin_to_store_transfer(
            db=db,
            admin_id=payload.from_owner_id,
            store_id=payload.to_owner_id,
            product_id=payload.product_id,
            quantity=payload.quantity,
            created_by=current_admin.id,
            remarks=payload.remarks,
        )
    elif from_type == "STORE" and to_type == "ADMIN":
        txn_out, txn_in = await store_to_admin_transfer(
            db=db,
            admin_id=payload.to_owner_id,
            store_id=payload.from_owner_id,
            product_id=payload.product_id,
            quantity=payload.quantity,
            created_by=current_admin.id,
            remarks=payload.remarks,
            is_admin_pull=True,
        )
    elif from_type == "STORE" and to_type == "STORE":
        txn_out, txn_in = await store_to_store_transfer(
            db=db,
            from_store_id=payload.from_owner_id,
            to_store_id=payload.to_owner_id,
            product_id=payload.product_id,
            quantity=payload.quantity,
            created_by=current_admin.id,
            remarks=payload.remarks,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported transfer direction: {from_type} → {to_type}",
        )

    return [_txn_to_read(txn_out), _txn_to_read(txn_in)]


@router.post("/request", response_model=list[TransactionRead], status_code=status.HTTP_201_CREATED)
async def create_admin_transfer_request(
    payload: AdminRequestPayload,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Create a pending transfer request (pull request) as Admin on behalf of a store.
    Here, the destination store (to_owner_id) is requesting from the source store (from_owner_id).
    """
    from_type = payload.from_owner_type.upper()
    to_type = payload.to_owner_type.upper()

    if from_type == to_type and payload.from_owner_id == payload.to_owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination must be different",
        )

    if to_type != "STORE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Destination of a pending request must be a store branch",
        )

    # Use create_pending_request_service
    txn_out, txn_in = await create_pending_request_service(
        db=db,
        manager_user_id=current_admin.id,
        manager_store_id=payload.to_owner_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        from_owner_type=from_type,
        from_owner_id=payload.from_owner_id,
        remarks=payload.remarks,
    )
    return [_txn_to_read(txn_out), _txn_to_read(txn_in)]


@router.put("/{id}/approve", response_model=list[TransactionRead])
async def approve_pending_transaction(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Approve a pending transaction (Admin or correct Manager)."""
    txn, sibling = await approve_transaction_service(
        db=db,
        txn_id=id,
        user=current_user,
    )
    result = [_txn_to_read(txn)]
    if sibling:
        result.append(_txn_to_read(sibling))
    return result


@router.put("/{id}/reject", response_model=list[TransactionRead])
async def reject_pending_transaction(
    id: int,
    payload: RejectionPayload,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Reject a pending transaction (Admin or correct Manager)."""
    txn, sibling = await reject_transaction_service(
        db=db,
        txn_id=id,
        user=current_user,
        reason=payload.reason,
    )
    result = [_txn_to_read(txn)]
    if sibling:
        result.append(_txn_to_read(sibling))
    return result
