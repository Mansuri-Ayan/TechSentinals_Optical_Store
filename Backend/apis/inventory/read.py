# API: inventory/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from schemas.inventory import InventoryRead, InventoryResponse
from services.inventory_service import (
    get_inventory,
    get_inventories_by_owner,
    get_low_stock_items,
)

router = APIRouter()


def _inventory_to_read(inv) -> InventoryRead:
    product = inv.product
    selling_price = product.selling_price if product else None
    return InventoryRead(
        **{c.key: getattr(inv, c.key) for c in inv.__table__.columns},
        product_name=product.name if product else None,
        product_sku=product.sku if product else None,
        category_id=product.category_id if product else None,
        category_name=product.category.name if product and product.category else None,
        subcategory_id=product.subcategory_id if product else None,
        subcategory_name=product.subcategory.name if product and product.subcategory else None,
        brand_id=product.brand_id if product else None,
        brand_name=product.brand.name if product and product.brand else None,
        cost_price=product.cost_price if product else None,
        selling_price=selling_price,
        price=selling_price,
        image_url=product.image_url if product else None,
        discount_percent=product.discount_percent if product else 0.00,
        warranty_months=product.warranty_months if product else 0,
        frame_product=product.frame_product if product else None,
        lens_product=product.lens_product if product else None,
        accessory_product=product.accessory_product if product else None,
    )


@router.get(
    "/",
    response_model=InventoryResponse,
    summary="List inventories",
    description="List inventory records filtered by owner type and ID with pagination and stats.",
)
async def list_inventories(
    owner_type: str = Query(..., description="ADMIN or STORE"),
    owner_id: int | None = Query(default=None, description="Admin ID or Store ID. Omit for aggregated warehouse view."),
    active_only: bool = Query(True),
    search: str | None = Query(default=None, description="Search product name or SKU"),
    category_id: int | None = Query(default=None, description="Filter by category ID"),
    subcategory_id: int | None = Query(default=None, description="Filter by subcategory ID"),
    brand_id: int | None = Query(default=None, description="Filter by brand ID"),
    stock_status: str | None = Query(
        default=None,
        description="Filter by stock status: in_stock, low_stock, out_of_stock",
    ),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Page size"),
    paginate: bool = Query(default=True, description="Enable pagination"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> InventoryResponse:
    if not isinstance(current_user, Admin):
        owner_type = "STORE"
        owner_id = current_user.store_id

    result_dict = await get_inventories_by_owner(
        db,
        owner_type=owner_type,
        owner_id=owner_id,
        active_only=active_only,
        search=search,
        category_id=category_id,
        subcategory_id=subcategory_id,
        brand_id=brand_id,
        stock_status=stock_status,
        page=page,
        limit=limit,
        paginate=paginate,
    )
    
    return InventoryResponse(
        items=[_inventory_to_read(inv) for inv in result_dict["items"]],
        total=result_dict["total"],
        page=result_dict["page"],
        limit=result_dict["limit"],
        pages=result_dict["pages"],
        total_products=result_dict["total_products"],
        low_stock_count=result_dict["low_stock_count"],
        out_of_stock_count=result_dict["out_of_stock_count"],
        total_valuation=result_dict["total_valuation"],
    )


@router.get(
    "/low-stock",
    response_model=list[InventoryRead],
    summary="Get low-stock items",
    description="Get all items where available quantity is at or below the reorder level.",
)
async def low_stock_items(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> list[InventoryRead]:
    if isinstance(current_user, Admin):
        items = await get_low_stock_items(db, admin_id=current_user.id)
    else:
        items, _ = await get_inventories_by_owner(
            db,
            owner_type="STORE",
            owner_id=current_user.store_id,
            active_only=True,
            stock_status="low_stock",
            paginate=False,
        )
    return [_inventory_to_read(inv) for inv in items]


@router.get(
    "/{inventory_id}",
    response_model=InventoryRead,
    summary="Get single inventory record",
)
async def get_inventory_endpoint(
    inventory_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> InventoryRead:
    inv = await get_inventory(db, inventory_id)
    if inv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found",
        )
    if not isinstance(current_user, Admin):
        if inv.owner_type != "STORE" or inv.owner_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this store's inventory",
            )
    return _inventory_to_read(inv)
