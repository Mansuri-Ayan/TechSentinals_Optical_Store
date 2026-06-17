# Schema: staff.py
from datetime import date, datetime
from pydantic import BaseModel

class StaffRead(BaseModel):
    id: int
    store_id: int
    store_name: str | None = None
    role: str  # "manager", "worker", "optician"
    first_name: str
    last_name: str
    email: str | None = None
    phone: str
    profile_image: str | None = None
    employee_code: str
    joining_date: date
    is_active: bool
    qualification: str | None = None  # Only for optician
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
