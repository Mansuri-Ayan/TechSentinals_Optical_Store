# API: auth/me.py
from fastapi import APIRouter, Depends
from core.deps import get_current_user
from models.admin import Admin
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from schemas.admin import AdminRead
from schemas.manager import ManagerRead
from schemas.worker import WorkerRead
from schemas.optician import OpticianRead

router = APIRouter()


@router.get(
    "/me",
    summary="Get current user profile",
    description=(
        "Returns the profile of the currently authenticated user (Admin, Manager, Worker, or Optician).  "
        "Requires a valid Bearer access token or access_token cookie."
    ),
)
async def me(
    current_user = Depends(get_current_user),
):
    """
    Return the authenticated user's profile serialized with the correct Pydantic schema
    depending on their role type.
    """
    if isinstance(current_user, Admin):
        data = AdminRead.model_validate(current_user).model_dump()
        data["role"] = "admin"
        data["first_name"] = current_user.owner_first_name
        data["last_name"] = current_user.owner_last_name
        data["full_name"] = f"{current_user.owner_first_name} {current_user.owner_last_name}"
        data["store_name"] = "Central Warehouse"
        return data
    elif isinstance(current_user, Manager):
        data = ManagerRead.model_validate(current_user).model_dump()
        data["role"] = "manager"
        data["full_name"] = f"{current_user.first_name} {current_user.last_name}"
        data["store_name"] = current_user.store.store_name if current_user.store else None
        return data
    elif isinstance(current_user, Worker):
        data = WorkerRead.model_validate(current_user).model_dump()
        data["role"] = "worker"
        data["full_name"] = f"{current_user.first_name} {current_user.last_name}"
        data["store_name"] = current_user.store.store_name if current_user.store else None
        return data
    elif isinstance(current_user, Optician):
        data = OpticianRead.model_validate(current_user).model_dump()
        data["role"] = "optician"
        data["full_name"] = f"{current_user.first_name} {current_user.last_name}"
        data["store_name"] = current_user.store.store_name if current_user.store else None
        return data
