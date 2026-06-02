# API: auth/me.py
from fastapi import APIRouter, Depends
from core.deps import get_current_admin
from models.admin import Admin
from schemas.admin import AdminRead

router = APIRouter()


@router.get(
    "/me",
    response_model=AdminRead,
    summary="Get current admin profile",
    description=(
        "Returns the profile of the currently authenticated admin.  "
        "Requires a valid Bearer access token or access_token cookie."
    ),
)
async def me(
    current_admin: Admin = Depends(get_current_admin),
) -> AdminRead:
    return AdminRead.model_validate(current_admin)
