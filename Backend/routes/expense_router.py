# Routes: expense_router.py
from fastapi import APIRouter
from apis.expense.operations import router as operations_router
from apis.expense.categories import router as categories_router

expense_router = APIRouter(
    prefix="/expenses",
    tags=["Expenses"],
)

# Category routes registered under /expenses/categories
expense_router.include_router(categories_router, prefix="/categories")
# Core expense operations registered under /expenses
expense_router.include_router(operations_router)
