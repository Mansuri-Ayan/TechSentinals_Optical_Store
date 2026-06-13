# API: transfer/operations.py
"""
Endpoints for all inventory movement operations:
  - Purchase, Admin↔Store transfer, Store↔Store transfer
  - Damage, Loss, Sale, Return
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from models.inventory_transaction import TransactionType
from schemas.inventory_transaction import (
    PurchaseRequest,
    TransferRequest,
    StockActionRequest,
    TransactionRead,
)
from services.transfer_service import (
    purchase_stock,
    admin_to_store_transfer,
    store_to_admin_transfer,
    store_to_store_transfer,
    record_stock_action,
)

router = APIRouter()


def _txn_to_read(txn) -> TransactionRead:
    return TransactionRead(
        **{c.key: getattr(txn, c.key) for c in txn.__table__.columns},
        product_name=txn.product.name if txn.product else None,
        product_sku=txn.product.sku if txn.product else None,
        send_store_name=txn.send_store.store_name if txn.send_store else None,
        receive_store_name=txn.receive_store.store_name if txn.receive_store else None,
    )


# ── Purchase ───────────────────────────────────────────────────

@router.post(
    "/purchase",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record a stock purchase",
    description="Purchase stock into the admin warehouse.",
)
async def purchase_endpoint(
    payload: PurchaseRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> TransactionRead:
    # Resolve owner: default to admin warehouse if not specified
    ot = (payload.owner_type or "ADMIN").upper()
    oid = payload.owner_id
    if ot == "ADMIN":
        oid = current_admin.id

    txn = await purchase_stock(
        db,
        admin_id=current_admin.id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        purchase_price=payload.purchase_price,
        created_by=current_admin.id,
        owner_type=ot,
        owner_id=oid,
        remarks=payload.remarks,
    )
    return _txn_to_read(txn)


# ── Transfers ──────────────────────────────────────────────────

@router.post(
    "/transfer",
    response_model=list[TransactionRead],
    status_code=status.HTTP_201_CREATED,
    summary="Transfer stock",
    description=(
        "Transfer stock between admin↔store or store↔store. "
        "Creates paired OUT/IN transaction records."
    ),
)
async def transfer_endpoint(
    payload: TransferRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[TransactionRead]:
    from_type = payload.from_owner_type.upper()
    to_type = payload.to_owner_type.upper()

    if from_type == to_type and payload.from_owner_id == payload.to_owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination must be different",
        )

    if from_type == "ADMIN" and to_type == "STORE":
        txn_out, txn_in = await admin_to_store_transfer(
            db,
            admin_id=payload.from_owner_id,
            store_id=payload.to_owner_id,
            product_id=payload.product_id,
            quantity=payload.quantity,
            created_by=current_admin.id,
            remarks=payload.remarks,
        )
    elif from_type == "STORE" and to_type == "ADMIN":
        txn_out, txn_in = await store_to_admin_transfer(
            db,
            admin_id=payload.to_owner_id,
            store_id=payload.from_owner_id,
            product_id=payload.product_id,
            quantity=payload.quantity,
            created_by=current_admin.id,
            remarks=payload.remarks,
        )
    elif from_type == "STORE" and to_type == "STORE":
        txn_out, txn_in = await store_to_store_transfer(
            db,
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


# ── Damage / Loss / Sale / Return ──────────────────────────────

@router.post(
    "/damage",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record damaged stock",
)
async def damage_endpoint(
    payload: StockActionRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> TransactionRead:
    txn = await record_stock_action(
        db,
        action=TransactionType.DAMAGE,
        owner_type=payload.owner_type.upper(),
        owner_id=payload.owner_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        created_by=current_admin.id,
        remarks=payload.remarks,
    )
    return _txn_to_read(txn)


@router.post(
    "/loss",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record lost stock",
)
async def loss_endpoint(
    payload: StockActionRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> TransactionRead:
    txn = await record_stock_action(
        db,
        action=TransactionType.LOSS,
        owner_type=payload.owner_type.upper(),
        owner_id=payload.owner_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        created_by=current_admin.id,
        remarks=payload.remarks,
    )
    return _txn_to_read(txn)


@router.post(
    "/sale",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record a sale",
    description="Decrements store inventory for a sale.",
)
async def sale_endpoint(
    payload: StockActionRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> TransactionRead:
    txn = await record_stock_action(
        db,
        action=TransactionType.SALE,
        owner_type=payload.owner_type.upper(),
        owner_id=payload.owner_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        created_by=current_admin.id,
        remarks=payload.remarks,
    )
    return _txn_to_read(txn)


@router.post(
    "/return",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record a return",
    description="Increments store inventory for a return.",
)
async def return_endpoint(
    payload: StockActionRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> TransactionRead:
    txn = await record_stock_action(
        db,
        action=TransactionType.RETURN,
        owner_type=payload.owner_type.upper(),
        owner_id=payload.owner_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        created_by=current_admin.id,
        remarks=payload.remarks,
    )
    return _txn_to_read(txn)
