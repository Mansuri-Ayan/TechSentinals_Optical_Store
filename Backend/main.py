# Main module: main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.authrouter import auth_router
from db.session import engine
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield                                             
    await engine.dispose()                               
app = FastAPI(
    title="TechSentinals Optical Store API",
    description=(
        "Backend REST API for the TechSentinals Optical Store "
        "management system.  Handles staff authentication, "
        "inventory, sales, and prescriptions."
    ),
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],                                       
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
@app.get(
    "/",
    tags=["Health"],
    summary="Health check",
)
def read_root():
    return {
        "status": "healthy",
        "service": "TechSentinals Optical Store API",
        "version": "1.0.0",
    }
