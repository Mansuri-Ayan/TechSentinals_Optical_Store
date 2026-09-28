# API: superadmin/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from db.session import get_db
from core.deps import get_current_superadmin
from models.superadmin import SuperAdmin
from models.admin import Admin
from models.store import Store
from models.sale import Sale, SaleStatus
from services.superadmin_analytics_service import (
    get_platform_economic_overview,
    get_operational_benchmarks,
)

router = APIRouter(prefix="/dashboard", tags=["SuperAdmin - Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Returns platform-wide KPIs for the executive command center.
    """
    econ = await get_platform_economic_overview(db)
    benchmarks = await get_operational_benchmarks(db)

    # Tenant Status Breakdown
    tenants_res = await db.execute(
        select(Admin.status, func.count(Admin.id)).where(Admin.deleted_at.is_(None)).group_by(Admin.status)
    )
    status_map = {"ACTIVE": 0, "SUSPENDED": 0, "INACTIVE": 0}
    total_tenants = 0
    for r in tenants_res.fetchall():
        key = r[0].value if hasattr(r[0], "value") else str(r[0])
        status_map[key] = int(r[1])
        total_tenants += int(r[1])

    # Store Status Breakdown
    active_stores = (await db.execute(
        select(func.count(Store.id)).where(Store.deleted_at.is_(None), Store.is_active.is_(True))
    )).scalar() or 0

    return {
        "tenants": {
            "total": total_tenants,
            "active": status_map.get("ACTIVE", 0),
            "suspended": status_map.get("SUSPENDED", 0),
            "inactive": status_map.get("INACTIVE", 0),
        },
        "stores": {
            "total": benchmarks["infrastructure"]["total_stores"],
            "active": active_stores,
        },
        "staff": {
            "total": benchmarks["infrastructure"]["total_staff"],
            "managers": benchmarks["infrastructure"]["managers"],
            "workers": benchmarks["infrastructure"]["workers"],
            "opticians": benchmarks["infrastructure"]["opticians"],
            "accountants": benchmarks["infrastructure"]["accountants"],
        },
        "economics": {
            "gmv": econ["period"]["gmv"],
            "invoices": econ["period"]["invoices"],
            "aov": econ["period"]["aov"],
            "lifetime_gmv": econ["lifetime"]["gmv"],
            "lifetime_invoices": econ["lifetime"]["invoices"],
            "growth_pct": econ["period"]["gmv_growth_pct"],
        },
        "inventory": {
            "total_valuation": benchmarks["inventory"]["total_inventory_valuation"],
            "total_units": benchmarks["inventory"]["total_stock_units"],
            "deadstock_capital": benchmarks["deadstock"]["locked_capital"],
        },
    }


@router.get("/recent-activity")
async def get_dashboard_recent_activity(
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Returns recent tenant registrations and recent platform sales.
    """
    # Recent tenants
    tenants_stmt = (
        select(Admin)
        .where(Admin.deleted_at.is_(None))
        .order_by(Admin.created_at.desc())
        .limit(5)
    )
    tenants_res = await db.execute(tenants_stmt)
    recent_tenants = [
        {
            "id": a.id,
            "business_name": a.business_name,
            "owner_name": f"{a.owner_first_name} {a.owner_last_name}",
            "email": a.email,
            "phone": a.phone,
            "city": a.city,
            "state": a.state,
            "status": a.status.value if hasattr(a.status, "value") else str(a.status),
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in tenants_res.scalars().all()
    ]

    # Recent completed sales across platform
    from models.customer import Customer
    sales_stmt = (
        select(Sale, Admin.business_name, Store.store_name, Customer.first_name, Customer.last_name)
        .join(Admin, Sale.admin_id == Admin.id)
        .outerjoin(Store, Sale.store_id == Store.id)
        .outerjoin(Customer, Sale.customer_id == Customer.id)
        .where(Sale.status == SaleStatus.COMPLETED)
        .order_by(Sale.created_at.desc())
        .limit(5)
    )
    sales_res = await db.execute(sales_stmt)
    recent_sales = []
    for sale, b_name, s_name, c_first, c_last in sales_res.all():
        cust_name = f"{c_first or ''} {c_last or ''}".strip() or "Walk-in Customer"
        recent_sales.append({
            "id": sale.id,
            "invoice_number": sale.invoice_number,
            "business_name": b_name,
            "store_name": s_name or "Main Hub",
            "customer_name": cust_name,
            "total_amount": float(sale.total_amount or 0),
            "status": sale.status.value if hasattr(sale.status, "value") else str(sale.status),
            "created_at": sale.created_at.isoformat() if sale.created_at else None,
        })

    return {
        "recent_tenants": recent_tenants,
        "recent_sales": recent_sales,
    }
