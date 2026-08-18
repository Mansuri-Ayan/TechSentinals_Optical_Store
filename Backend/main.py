# Main module: main.py
import logging

import os
from alembic.config import Config
from alembic import command

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

from contextlib import asynccontextmanager
import os
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from alembic import command
from alembic.config import Config
from routes.authrouter import auth_router
from routes.store_router import store_router
from routes.worker_router import worker_router
from routes.optician_router import optician_router
from routes.manager_router import manager_router
from routes.category_router import category_router
from routes.brand_router import brand_router
from routes.product_router import product_router
from routes.inventory_router import inventory_router
from routes.transfer_router import transfer_router
from routes.supplier_router import supplier_router
from routes.purchase_order_router import purchase_order_router
from routes.customer_router import customer_router
from routes.prescription_router import prescription_router
from routes.sale_router import sale_router
from routes.report_router import report_router
from routes.expense_router import expense_router
from routes.repair_router import repair_router
from routes.shopkeeper_brand_router import shopkeeper_brand_router
from routes.shopkeeper_category_router import shopkeeper_category_router
from routes.api_transactions_router import router as api_transactions_router
from routes.api_shopkeeper_transactions_router import router as api_shopkeeper_transactions_router
from routes.notification_router import router as notification_router
from routes.loyalty_router import router as loyalty_router
from routes.shopkeeper_loyalty_router import router as shopkeeper_loyalty_router
from routes.lab_router import lab_router
from routes.exchange_router import exchange_router
from routes.deadstock_router import deadstock_router
from apis.permission.me import router as permission_me_router
from apis.permission.tier2 import router as permission_tier2_router
from apis.permission.tier3 import router as permission_tier3_router
from apis.permission.staff_list import router as permission_staff_list_router
from routes.superadmin_router import superadmin_router
from apis.bill_settings.operations import router as bill_settings_router
from db.session import engine
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Application startup
    # NOTE: the selling_price column and staff_type_enum's 'ADMIN' value used
    # to be applied here via raw ALTER TABLE/TYPE SQL on every boot, bypassing
    # Alembic. That schema drift is now captured properly as migration
    # d4e5f6a7b8c9 — run `alembic upgrade head` instead of relying on this
    # hook. Only the (non-schema) inventory-reactivation data patch remains.
    from sqlalchemy import text
    try:
        async with engine.begin() as conn:
            await conn.execute(text("UPDATE inventories SET is_active = true WHERE is_active = false;"))
            await conn.execute(text("UPDATE sales SET lab_status = 'Cancelled' WHERE status = 'CANCELLED' AND lab_status IS NOT NULL AND lab_status != 'Cancelled';"))
    except Exception as e:
        logging.warning(f"Skipped database reactivation / status fix: {e}")
    yield
    # Application shutdown
    await engine.dispose()
app = FastAPI(
    title="TechSentinals Optical Store API",
    # Trigger uvicorn reload to rerun safe database migrations
    description=(
        "Backend REST API for the TechSentinals Optical Store "
        "management system.  Handles admin authentication, "
        "store management, staff (workers/opticians), and roles."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from core.rate_limit import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "Content-Disposition"],
)

from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )
# ── Register routers ──────────────────────────────────────────
app.include_router(auth_router)
app.include_router(store_router)
app.include_router(worker_router)
app.include_router(optician_router)
app.include_router(manager_router)
# ── Inventory Management module ───────────────────────────────
app.include_router(category_router)
app.include_router(brand_router)
app.include_router(product_router)
app.include_router(inventory_router)
app.include_router(transfer_router)
# ── Supplier Management module ────────────────────────────────
app.include_router(supplier_router)
app.include_router(purchase_order_router)
# ── Sales module ──────────────────────────────────────────────
app.include_router(customer_router)
app.include_router(prescription_router)
app.include_router(sale_router)
# ── Expenses module ───────────────────────────────────────────
app.include_router(expense_router)
# ── Reports & Analysis module ─────────────────────────────────
app.include_router(report_router)
# ── Repair & Services module ──────────────────────────────────
app.include_router(repair_router)
app.include_router(shopkeeper_brand_router)
app.include_router(shopkeeper_category_router)
app.include_router(api_transactions_router)
app.include_router(api_shopkeeper_transactions_router)
app.include_router(notification_router)
app.include_router(loyalty_router)
app.include_router(shopkeeper_loyalty_router)
app.include_router(lab_router)
app.include_router(exchange_router)
app.include_router(deadstock_router)
# ── Permissions & SuperAdmin module ───────────────────────────
app.include_router(permission_me_router)
app.include_router(permission_tier2_router)
app.include_router(permission_tier3_router)
app.include_router(permission_staff_list_router)
app.include_router(superadmin_router)
app.include_router(bill_settings_router, prefix="/bill-settings", tags=["Bill Settings"])

