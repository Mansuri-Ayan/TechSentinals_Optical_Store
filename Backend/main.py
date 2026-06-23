# Main module: main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
from db.session import engine
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()
app = FastAPI(
    title="TechSentinals Optical Store API",
    description=(
        "Backend REST API for the TechSentinals Optical Store "
        "management system.  Handles admin authentication, "
        "store management, staff (workers/opticians), and roles."
    ),
    version="2.0.0",
    lifespan=lifespan,
)
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
