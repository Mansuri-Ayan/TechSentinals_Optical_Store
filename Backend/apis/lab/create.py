# API: lab/create.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.lab import LabCreate, LabRead
from services.lab_service import create_lab

router = APIRouter()


@router.post(
    "/",
    response_model=LabRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new lab partner",
)
async def create_lab_endpoint(
    payload: LabCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("labs", "create")),
) -> LabRead:
    admin_id = get_user_admin_id(current_user)
    lab = await create_lab(db, admin_id=admin_id, payload=payload)
    return LabRead.model_validate(lab)
