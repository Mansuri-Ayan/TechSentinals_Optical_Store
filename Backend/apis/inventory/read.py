# API: inventory/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.inventory import InventoryRead, InventoryResponse, UniversalInventoryResponse
from services.inventory_service import (
    get_inventory,
    get_inventories_by_owner,
    get_low_stock_items,
)

router = APIRouter()


def _inventory_to_read(inv, store_map: dict | None = None) -> InventoryRead:
    product = inv.product
    selling_price = inv.selling_price if inv.selling_price is not None else (product.selling_price if product else None)
    owner_name = None
    ot_str = inv.owner_type.value if hasattr(inv.owner_type, "value") else str(inv.owner_type)
    if "ADMIN" in ot_str:
        owner_name = "Admin Warehouse"
    elif store_map:
        owner_name = store_map.get(inv.owner_id, "Unknown Store")

    supplier_id = None
    supplier_name = None
    if product and product.supplier_products:
        active_sps = [sp for sp in product.supplier_products if sp.is_active and sp.supplier]
        if active_sps:
            supplier_id = active_sps[0].supplier_id
            supplier_name = active_sps[0].supplier.company_name

    data = {c.key: getattr(inv, c.key) for c in inv.__table__.columns}
    data.update({
        "owner_name": owner_name,
        "product_name": product.name if product else None,
        "product_sku": product.sku if product else None,
        "category_id": product.category_id if product else None,
        "category_name": product.category.name if product and product.category else None,
        "subcategory_id": product.subcategory_id if product else None,
        "subcategory_name": product.subcategory.name if product and product.subcategory else None,
        "brand_id": product.brand_id if product else None,
        "brand_name": product.brand.name if product and product.brand else None,
        "cost_price": inv.last_purchase_price if inv.last_purchase_price is not None else (product.cost_price if product else None),
        "selling_price": selling_price,
        "price": selling_price,
        "image_url": product.image_url if product else None,
        "discount_percent": product.discount_percent if product else 0.00,
        "warranty_months": product.warranty_months if product else 0,
        "frame_product": product.frame_product if product else None,
        "lens_product": product.lens_product if product else None,
        "accessory_product": product.accessory_product if product else None,
        "other_stocks": getattr(inv, "other_stocks", []),
        "supplier_id": inv.supplier_id if getattr(inv, "supplier_id", None) is not None else supplier_id,
        "supplier_name": getattr(inv, "supplier_name", None) or supplier_name,
    })
    return InventoryRead(**data)


async def _populate_other_stocks(
    db: AsyncSession,
    inventories: list,
    admin_id: int,
    store_map: dict,
    resolved_owner_type: str,
    resolved_owner_id: int,
) -> None:
    if not inventories:
        return

    from sqlalchemy import select, and_, or_
    from models.inventory import Inventory
    from schemas.inventory import StoreStockRead

    product_ids = [inv.product_id for inv in inventories if inv.product_id]
    if not product_ids:
        return

    # Fetch all active inventory records for these products across all stores of this admin
    store_ids = list(store_map.keys())
    conditions = [
        and_(Inventory.owner_type == "ADMIN", Inventory.owner_id == admin_id),
    ]
    if store_ids:
        conditions.append(
            and_(Inventory.owner_type == "STORE", Inventory.owner_id.in_(store_ids))
        )

    inv_stmt = select(Inventory).where(
        Inventory.product_id.in_(product_ids),
        Inventory.is_active.is_(True),
        or_(*conditions)
    )
    inv_res = await db.execute(inv_stmt)
    all_inventories = inv_res.scalars().all()

    # Group inventories by (product_id, owner_type, owner_id) and sum them
    from collections import defaultdict
    inv_totals = defaultdict(lambda: {"qty": 0, "avail": 0})
    for inv in all_inventories:
        ot_str = inv.owner_type.value if hasattr(inv.owner_type, "value") else str(inv.owner_type)
        key = (inv.product_id, ot_str, inv.owner_id)
        inv_totals[key]["qty"] += inv.quantity
        inv_totals[key]["avail"] += inv.available_quantity

    for item in inventories:
        other_stocks = []
        # 1. Admin Warehouse
        if not (resolved_owner_type == "ADMIN" and resolved_owner_id == admin_id):
            admin_totals = inv_totals.get((item.product_id, "ADMIN", admin_id), {"qty": 0, "avail": 0})
            other_stocks.append(
                StoreStockRead(
                    store_id=admin_id,
                    store_name="Admin Warehouse",
                    owner_type="ADMIN",
                    quantity=admin_totals["qty"],
                    available_quantity=admin_totals["avail"]
                )
            )
        # 2. Store Branches
        for s_id, s_name in store_map.items():
            if resolved_owner_type == "STORE" and resolved_owner_id == s_id:
                continue
            
            store_totals = inv_totals.get((item.product_id, "STORE", s_id), {"qty": 0, "avail": 0})
            other_stocks.append(
                StoreStockRead(
                    store_id=s_id,
                    store_name=s_name,
                    owner_type="STORE",
                    quantity=store_totals["qty"],
                    available_quantity=store_totals["avail"]
                )
            )
        item.other_stocks = other_stocks


@router.get(
    "/",
    response_model=InventoryResponse,
    summary="List inventories",
    description="List inventory records filtered by owner type and ID with pagination and stats.",
)
async def list_inventories(
    owner_type: str = Query(..., description="ADMIN or STORE"),
    owner_id: int | None = Query(default=None, description="Admin ID or Store ID. Omit for aggregated warehouse view."),
    product_id: int | None = Query(default=None, description="Filter by product ID"),
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
    warehouse_only: bool = Query(default=False, description="If true and owner_type is ADMIN, only returns warehouse inventory (no stores)"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('inventory', 'read')),
) -> InventoryResponse:
    from core.deps import get_user_admin_id
    from sqlalchemy import select
    from models.store import Store

    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = get_user_admin_id(current_user)

    stores_stmt = select(Store.id, Store.store_name).where(Store.admin_id == admin_id)
    stores_res = await db.execute(stores_stmt)
    store_map = {row[0]: row[1] for row in stores_res.fetchall()}

    if not isinstance(current_user, Admin):
        from models.worker import Worker
        from models.optician import Optician
        from models.accountant import Accountant

        is_store_scoped = isinstance(current_user, (Worker, Optician)) or (isinstance(current_user, Accountant) and current_user.store_id is not None)

        if is_store_scoped:
            # Strictly limit to their own store scope
            owner_type = "STORE"
            owner_id = current_user.store_id
        else:
            # Manager or business-level Accountant: allow querying their own admin warehouse or any store under the same admin
            requested_owner_type = owner_type.upper()
            if requested_owner_type == "ADMIN":
                # Manager querying admin warehouse — force owner_id to their admin
                owner_id = admin_id
            elif requested_owner_type == "STORE":
                if owner_id is None:
                    # Default to their own store
                    owner_id = current_user.store_id
                else:
                    # Validate the store belongs to the same admin
                    store_check = await db.execute(
                        select(Store.admin_id).where(Store.id == owner_id)
                    )
                    store_admin = store_check.scalar_one_or_none()
                    if store_admin != admin_id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access denied to this store's inventory",
                        )
            else:
                owner_type = "STORE"
                owner_id = current_user.store_id

    result_dict = await get_inventories_by_owner(
        db,
        owner_type=owner_type,
        owner_id=owner_id,
        product_id=product_id,
        active_only=active_only,
        search=search,
        category_id=category_id,
        subcategory_id=subcategory_id,
        brand_id=brand_id,
        stock_status=stock_status,
        page=page,
        limit=limit,
        paginate=paginate,
        warehouse_only=warehouse_only,
    )
    
    await _populate_other_stocks(
        db,
        result_dict["items"],
        admin_id=admin_id,
        store_map=store_map,
        resolved_owner_type=owner_type,
        resolved_owner_id=owner_id,
    )

    return InventoryResponse(
        items=[_inventory_to_read(inv, store_map) for inv in result_dict["items"]],
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
    "/warehouse",
    response_model=InventoryResponse,
    summary="List warehouse-only inventories",
    description="List warehouse-only inventory records for the current admin.",
)
async def list_warehouse_inventories(
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
    current_user = Depends(require_permission('inventory', 'read')),
) -> InventoryResponse:
    from core.deps import get_user_admin_id
    from sqlalchemy import select
    from models.store import Store
    from models.admin import Admin

    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        from models.worker import Worker
        from models.optician import Optician
        from models.accountant import Accountant

        is_store_scoped = isinstance(current_user, (Worker, Optician)) or (isinstance(current_user, Accountant) and current_user.store_id is not None)
        if is_store_scoped:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to warehouse inventories",
            )
        admin_id = get_user_admin_id(current_user)

    stores_stmt = select(Store.id, Store.store_name).where(Store.admin_id == admin_id)
    stores_res = await db.execute(stores_stmt)
    store_map = {row[0]: row[1] for row in stores_res.fetchall()}

    result_dict = await get_inventories_by_owner(
        db,
        owner_type="ADMIN",
        owner_id=admin_id,
        active_only=active_only,
        search=search,
        category_id=category_id,
        subcategory_id=subcategory_id,
        brand_id=brand_id,
        stock_status=stock_status,
        page=page,
        limit=limit,
        paginate=paginate,
        warehouse_only=True,
    )
    
    await _populate_other_stocks(
        db,
        result_dict["items"],
        admin_id=admin_id,
        store_map=store_map,
        resolved_owner_type="ADMIN",
        resolved_owner_id=admin_id,
    )

    return InventoryResponse(
        items=[_inventory_to_read(inv, store_map) for inv in result_dict["items"]],
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
    current_user = Depends(require_permission('inventory', 'read')),
) -> list[InventoryRead]:
    from core.deps import get_user_admin_id
    from sqlalchemy import select
    from models.store import Store

    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = get_user_admin_id(current_user)

    stores_stmt = select(Store.id, Store.store_name).where(Store.admin_id == admin_id)
    stores_res = await db.execute(stores_stmt)
    store_map = {row[0]: row[1] for row in stores_res.fetchall()}

    if isinstance(current_user, Admin):
        items = await get_low_stock_items(db, admin_id=current_user.id)
    else:
        result = await get_inventories_by_owner(
            db,
            owner_type="STORE",
            owner_id=current_user.store_id,
            active_only=True,
            stock_status="low_stock",
            paginate=False,
        )
        items = result["items"]
    return [_inventory_to_read(inv, store_map) for inv in items]


@router.get(
    "/universal",
    response_model=UniversalInventoryResponse,
    summary="Universal search inventories",
    description="Search products with stock levels at all stores and warehouse.",
)
async def universal_search_inventories(
    owner_type: str = Query(..., description="ADMIN or STORE"),
    owner_id: int | None = Query(default=None, description="Admin ID or Store ID. Omit for default."),
    search: str | None = Query(default=None, description="Search product name or SKU"),
    category_id: int | None = Query(default=None, description="Filter by category ID"),
    subcategory_id: int | None = Query(default=None, description="Filter by subcategory ID"),
    brand_id: int | None = Query(default=None, description="Filter by brand ID"),
    stock_status: str | None = Query(
        default=None,
        description="Filter by stock status: in_stock, low_stock, out_of_stock",
    ),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=1000, description="Page size"),
    paginate: bool = Query(default=True, description="Enable pagination"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('inventory', 'read')),
) -> UniversalInventoryResponse:
    from core.deps import get_user_admin_id
    from sqlalchemy import select, and_, or_, func
    from sqlalchemy.orm import aliased, selectinload
    from models.product import Product
    from models.store import Store
    from models.inventory import Inventory
    from schemas.inventory import StoreStockRead, UniversalInventoryRead, UniversalInventoryResponse
    import math

    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = get_user_admin_id(current_user)

    # Resolve default owner_id
    resolved_owner_type = owner_type.upper()
    resolved_owner_id = owner_id
    if not isinstance(current_user, Admin):
        from models.worker import Worker
        from models.optician import Optician
        from models.accountant import Accountant

        is_store_scoped = isinstance(current_user, (Worker, Optician)) or (isinstance(current_user, Accountant) and current_user.store_id is not None)

        if is_store_scoped:
            resolved_owner_type = "STORE"
            resolved_owner_id = current_user.store_id
        else:
            if resolved_owner_type == "ADMIN":
                resolved_owner_id = admin_id
            elif resolved_owner_type == "STORE":
                if resolved_owner_id is None:
                    resolved_owner_id = current_user.store_id
                else:
                    # check permission
                    store_check = await db.execute(
                        select(Store.admin_id).where(Store.id == resolved_owner_id)
                    )
                    store_admin = store_check.scalar_one_or_none()
                    if store_admin != admin_id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access denied to this store's inventory",
                        )
    else:
        if resolved_owner_id is None:
            if resolved_owner_type == "ADMIN":
                resolved_owner_id = admin_id
            else:
                # Default to admin ID or first store
                resolved_owner_id = admin_id

    # Fetch store details for mapping
    stores_stmt = select(Store.id, Store.store_name).where(Store.admin_id == admin_id)
    stores_res = await db.execute(stores_stmt)
    store_map = {row[0]: row[1] for row in stores_res.fetchall()}
    
    # We want to query products that belong to this admin and are active
    product_conditions = [
        Product.admin_id == admin_id,
        Product.is_active.is_(True)
    ]

    if search:
        search_term = f"%{search.strip()}%"
        product_conditions.append(
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term),
            )
        )
    
    if category_id is not None:
        product_conditions.append(Product.category_id == category_id)
    if subcategory_id is not None:
        product_conditions.append(Product.subcategory_id == subcategory_id)
    if brand_id is not None:
        product_conditions.append(Product.brand_id == brand_id)

    local_inv = aliased(Inventory)
    local_inv_join_cond = and_(
        Product.id == local_inv.product_id,
        local_inv.owner_type == resolved_owner_type,
        local_inv.owner_id == resolved_owner_id,
        local_inv.is_active.is_(True)
    )

    stmt_count = select(func.count(Product.id)).where(*product_conditions)
    from models.supplier_product import SupplierProduct
    stmt_data = (
        select(Product)
        .where(*product_conditions)
        .options(
            selectinload(Product.category),
            selectinload(Product.subcategory),
            selectinload(Product.brand),
            selectinload(Product.frame_product),
            selectinload(Product.lens_product),
            selectinload(Product.accessory_product),
            selectinload(Product.supplier_products).selectinload(SupplierProduct.supplier),
        )
        .order_by(Product.id.desc())
    )

    if stock_status:
        stmt_count = stmt_count.outerjoin(local_inv, local_inv_join_cond)
        stmt_data = stmt_data.outerjoin(local_inv, local_inv_join_cond)

        if stock_status == "out_of_stock":
            stmt_count = stmt_count.where(or_(local_inv.id.is_(None), local_inv.available_quantity == 0))
            stmt_data = stmt_data.where(or_(local_inv.id.is_(None), local_inv.available_quantity == 0))
        elif stock_status == "low_stock":
            stmt_count = stmt_count.where(
                and_(
                    local_inv.id.is_not(None),
                    local_inv.available_quantity > 0,
                    or_(
                        and_(local_inv.reorder_level > 0, local_inv.available_quantity <= local_inv.reorder_level),
                        and_(local_inv.reorder_level == 0, local_inv.available_quantity <= 10)
                    )
                )
            )
            stmt_data = stmt_data.where(
                and_(
                    local_inv.id.is_not(None),
                    local_inv.available_quantity > 0,
                    or_(
                        and_(local_inv.reorder_level > 0, local_inv.available_quantity <= local_inv.reorder_level),
                        and_(local_inv.reorder_level == 0, local_inv.available_quantity <= 10)
                    )
                )
            )
        elif stock_status == "in_stock":
            stmt_count = stmt_count.where(
                and_(
                    local_inv.id.is_not(None),
                    or_(
                        and_(local_inv.reorder_level > 0, local_inv.available_quantity > local_inv.reorder_level),
                        and_(local_inv.reorder_level == 0, local_inv.available_quantity > 10)
                    )
                )
            )
            stmt_data = stmt_data.where(
                and_(
                    local_inv.id.is_not(None),
                    or_(
                        and_(local_inv.reorder_level > 0, local_inv.available_quantity > local_inv.reorder_level),
                        and_(local_inv.reorder_level == 0, local_inv.available_quantity > 10)
                    )
                )
            )

    # Execute count
    res_count = await db.execute(stmt_count)
    total = res_count.scalar() or 0

    # Paginate
    if paginate:
        offset = (page - 1) * limit
        stmt_data = stmt_data.offset(offset).limit(limit)

    res_data = await db.execute(stmt_data)
    products = list(res_data.scalars().unique().all())

    # If no products, return early
    if not products:
        return UniversalInventoryResponse(
            items=[],
            total=total,
            page=page,
            limit=limit,
            pages=1
        )

    # Fetch all active inventory records for these products across all stores of this admin
    store_ids = list(store_map.keys())
    conditions = [
        and_(Inventory.owner_type == "ADMIN", Inventory.owner_id == admin_id),
    ]
    if store_ids:
        conditions.append(
            and_(Inventory.owner_type == "STORE", Inventory.owner_id.in_(store_ids))
        )
    inv_stmt = (
        select(Inventory)
        .where(
            Inventory.product_id.in_([p.id for p in products]),
            or_(*conditions)
        )
        .order_by(Inventory.id.desc())
    )
    inv_res = await db.execute(inv_stmt)
    all_inventories = inv_res.scalars().all()

    # Group inventories by product_id
    from collections import defaultdict
    inv_by_product = defaultdict(list)
    for inv in all_inventories:
        inv_by_product[inv.product_id].append(inv)

    items = []
    for p in products:
        p_invs = inv_by_product[p.id]
        
        # Find local inventory record (prefer active, fallback to latest inactive)
        local_rec = None
        for inv in p_invs:
            if inv.owner_type == resolved_owner_type and inv.owner_id == resolved_owner_id:
                if local_rec is None or (inv.is_active and not local_rec.is_active):
                    local_rec = inv

        # Calculate local inventory totals across all active batches for this product/owner
        total_quantity = sum(inv.quantity for inv in p_invs if inv.owner_type == resolved_owner_type and inv.owner_id == resolved_owner_id and inv.is_active)
        total_available = sum(inv.available_quantity for inv in p_invs if inv.owner_type == resolved_owner_type and inv.owner_id == resolved_owner_id and inv.is_active)

        # Calculate other stocks (include all other stores and the warehouse under the same admin, even with 0 stock)
        other_stocks = []
        
        # 1. Admin Warehouse (if not current local context)
        if not (resolved_owner_type == "ADMIN" and resolved_owner_id == admin_id):
            admin_qty = sum(inv.quantity for inv in p_invs if inv.owner_type == "ADMIN" and inv.owner_id == admin_id and inv.is_active)
            admin_avail = sum(inv.available_quantity for inv in p_invs if inv.owner_type == "ADMIN" and inv.owner_id == admin_id and inv.is_active)
            other_stocks.append(
                StoreStockRead(
                    store_id=admin_id,
                    store_name="Admin Warehouse",
                    owner_type="ADMIN",
                    quantity=admin_qty,
                    available_quantity=admin_avail
                )
            )

        # 2. Store Branches (excluding current local context)
        for s_id, s_name in store_map.items():
            if resolved_owner_type == "STORE" and resolved_owner_id == s_id:
                continue
            
            store_qty = sum(inv.quantity for inv in p_invs if inv.owner_type == "STORE" and inv.owner_id == s_id and inv.is_active)
            store_avail = sum(inv.available_quantity for inv in p_invs if inv.owner_type == "STORE" and inv.owner_id == s_id and inv.is_active)
            other_stocks.append(
                StoreStockRead(
                    store_id=s_id,
                    store_name=s_name,
                    owner_type="STORE",
                    quantity=store_qty,
                    available_quantity=store_avail
                )
            )

        # Build UniversalInventoryRead
        owner_name = None
        if resolved_owner_type == "ADMIN":
            owner_name = "Admin Warehouse"
        else:
            owner_name = store_map.get(resolved_owner_id, f"Store {resolved_owner_id}")

        supplier_id = None
        supplier_name = None
        if p.supplier_products:
            active_sps = [sp for sp in p.supplier_products if sp.is_active and sp.supplier]
            if active_sps:
                supplier_id = active_sps[0].supplier_id
                supplier_name = active_sps[0].supplier.company_name

        items.append(
            UniversalInventoryRead(
                id=local_rec.id if local_rec else None,
                product_id=p.id,
                product_name=p.name,
                product_sku=p.sku,
                category_id=p.category_id,
                category_name=p.category.name if p.category else None,
                subcategory_id=p.subcategory_id,
                subcategory_name=p.subcategory.name if p.subcategory else None,
                brand_id=p.brand_id,
                brand_name=p.brand.name if p.brand else None,
                cost_price=p.cost_price,
                selling_price=p.selling_price,
                price=p.selling_price,
                image_url=p.image_url,
                discount_percent=p.discount_percent,
                warranty_months=p.warranty_months,
                supplier_id=supplier_id,
                supplier_name=supplier_name,
                
                # local stock
                quantity=total_quantity,
                available_quantity=total_available,
                reorder_level=local_rec.reorder_level if local_rec else 0,
                is_active=local_rec.is_active if local_rec else True,
                owner_type=resolved_owner_type,
                owner_id=resolved_owner_id,
                owner_name=owner_name,
                other_stocks=other_stocks,
                frame_product=p.frame_product,
                lens_product=p.lens_product,
                accessory_product=p.accessory_product
            )
        )

    return UniversalInventoryResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit) if total > 0 else 1
    )


@router.get(
    "/{inventory_id}",
    response_model=InventoryRead,
    summary="Get single inventory record",
)
async def get_inventory_endpoint(
    inventory_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('inventory', 'read')),
) -> InventoryRead:
    inv = await get_inventory(db, inventory_id)
    if inv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found",
        )
    
    from core.deps import get_user_admin_id
    from sqlalchemy import select
    from models.store import Store

    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = get_user_admin_id(current_user)

    stores_stmt = select(Store.id, Store.store_name).where(Store.admin_id == admin_id)
    stores_res = await db.execute(stores_stmt)
    store_map = {row[0]: row[1] for row in stores_res.fetchall()}

    if not isinstance(current_user, Admin):
        from models.worker import Worker
        from models.optician import Optician
        from models.accountant import Accountant

        is_store_scoped = isinstance(current_user, (Worker, Optician)) or (isinstance(current_user, Accountant) and current_user.store_id is not None)

        ot_str = inv.owner_type.value if hasattr(inv.owner_type, "value") else str(inv.owner_type)
        is_own_store = ot_str == "STORE" and inv.owner_id == current_user.store_id
        is_warehouse = ot_str == "ADMIN" and inv.owner_id == admin_id and not is_store_scoped

        if not (is_own_store or is_warehouse):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this inventory record",
            )
    return _inventory_to_read(inv, store_map)


@router.get(
    "/{inventory_id}/batches",
    summary="Get batches for an inventory item",
    description="Returns all inventory rows (purchase batches) for the product and owner of the given inventory_id.",
)
async def get_inventory_batches_endpoint(
    inventory_id: int,
    product_id: int | None = None,
    owner_type: str | None = None,
    owner_id: int | None = None,
    warehouse_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('inventory', 'read')),
):
    from models.inventory import Inventory, OwnerType
    from models.store import Store
    from sqlalchemy import select, and_, or_
    from core.deps import get_user_admin_id
    
    # 1. Resolve admin_id
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = get_user_admin_id(current_user)

    if product_id is not None and owner_type is not None and owner_id is not None:
        resolved_owner_type = OwnerType[owner_type.upper()]
        resolved_owner_id = owner_id
        resolved_product_id = product_id
    else:
        # Fallback to fetching reference inventory row
        inv_stmt = select(Inventory).where(Inventory.id == inventory_id)
        inv_res = await db.execute(inv_stmt)
        inv = inv_res.scalar_one_or_none()
        if inv is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory record not found",
            )
        resolved_owner_type = inv.owner_type
        resolved_owner_id = inv.owner_id
        resolved_product_id = inv.product_id

    # 2. Check permissions
    ot_str = resolved_owner_type.value if hasattr(resolved_owner_type, "value") else str(resolved_owner_type)
    if not isinstance(current_user, Admin):
        from models.worker import Worker
        from models.optician import Optician
        from models.accountant import Accountant

        is_store_scoped = isinstance(current_user, (Worker, Optician)) or (isinstance(current_user, Accountant) and current_user.store_id is not None)

        is_own_store = ot_str == "STORE" and resolved_owner_id == current_user.store_id
        is_warehouse = ot_str == "ADMIN" and resolved_owner_id == admin_id and not is_store_scoped

        if not (is_own_store or is_warehouse):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this inventory record",
            )

    batches_stmt = (
        select(Inventory)
        .where(
            Inventory.product_id == resolved_product_id,
            Inventory.owner_type == resolved_owner_type,
            Inventory.owner_id == resolved_owner_id,
        )
        .order_by(Inventory.id.asc())
    )

    batches_res = await db.execute(batches_stmt)
    batches = list(batches_res.scalars().all())

    # Fetch store name mapping
    stores_stmt = select(Store.id, Store.store_name).where(Store.admin_id == admin_id)
    stores_res = await db.execute(stores_stmt)
    store_map = {row[0]: row[1] for row in stores_res.fetchall()}

    # 4. Resolve status for each batch
    resolved_batches = []
    active_idx = 0

    for b in batches:
        if b.available_quantity > 0 and b.is_active:
            if active_idx == 0:
                status_str = "Current"
            elif active_idx == 1:
                status_str = "Next"
            else:
                status_str = "Upcoming"
            active_idx += 1
        else:
            status_str = "Consumed"

        supplier_company = b.supplier.company_name if b.supplier else "N/A"
        
        b_ot_str = b.owner_type.value if hasattr(b.owner_type, "value") else str(b.owner_type)
        if b_ot_str == "ADMIN":
            store_name = "Admin Warehouse"
        else:
            store_name = store_map.get(b.owner_id, "Unknown Store")

        resolved_batches.append({
            "id": b.id,
            "purchase_date": b.purchase_date.isoformat() if b.purchase_date else None,
            "purchase_cost": float(b.purchase_cost),
            "selling_price": float(b.selling_price) if b.selling_price is not None else float(b.product.selling_price if b.product else 0.00),
            "initial_quantity": b.initial_quantity,
            "available_quantity": b.available_quantity,
            "supplier_name": supplier_company,
            "store_name": store_name,
            "status": status_str,
        })

    return resolved_batches



