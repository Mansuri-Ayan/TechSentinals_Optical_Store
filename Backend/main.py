# Main module: main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.authrouter import auth_router
from routes.store_router import store_router
from routes.worker_router import worker_router
from routes.optician_router import optician_router
from routes.manager_router import manager_router
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


@app.get(
    "/",
    tags=["Health"],
    summary="Health check",
)
def read_root():
    return {
        "status": "healthy",
        "service": "TechSentinals Optical Store API",
        "version": "2.0.0",
    }
