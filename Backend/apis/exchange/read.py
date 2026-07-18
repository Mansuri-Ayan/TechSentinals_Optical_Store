# API: exchange/read.py
import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission
from db.session import get_db
from models.admin import Admin
from schemas.exchange import ExchangeRead
from services.exchange_service import get_exchange, list_exchanges
from apis.exchange.create import _exchange_to_read
from services.bill_service import generate_exchange_bill_html

router = APIRouter()


@router.get(
    "/",
    summary="List exchanges",
    description="List exchanges with store, customer, date, status filters, and search.",
)
async def list_exchanges_endpoint(
    store_id: str | None = Query(default=None),
    customer_id: int | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("exchanges", "read")),
):
    if isinstance(current_user, Admin):
        admin_id = current_user.id
        numeric_store_id = None
        if store_id and store_id.lower() != "admin":
            try:
                numeric_store_id = int(store_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid store_id format")
    else:
        admin_id = current_user.store.admin_id
        numeric_store_id = current_user.store_id

    exchanges, total = await list_exchanges(
        db,
        admin_id=admin_id,
        store_id=numeric_store_id,
        customer_id=customer_id,
        status_filter=status_filter,
        date_from=date_from,
        date_to=date_to,
        search=search,
        page=page,
        limit=limit,
    )

    validated = [_exchange_to_read(exc) for exc in exchanges]

    return {
        "items": validated,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if limit else 1,
    }


@router.get(
    "/{exchange_id}",
    response_model=ExchangeRead,
    summary="Get exchange",
    description="Get single exchange details.",
)
async def get_exchange_endpoint(
    exchange_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("exchanges", "read")),
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange not found.",
        )

    return _exchange_to_read(exchange)


@router.get(
    "/{exchange_id}/receipt",
    summary="Get exchange receipt HTML",
    description="Get custom styled HTML bill for exchange.",
)
async def get_exchange_receipt_endpoint(
    exchange_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("exchanges", "read")),
):
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange not found.",
        )

    html_content = await generate_exchange_bill_html(exchange, db)

    return {
        "id": exchange.id,
        "exchange_number": exchange.exchange_number,
        "html_content": html_content,
    }
