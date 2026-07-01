# Schema: superadmin.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SuperAdminBase(BaseModel):
    first_name: str
    last_name: str
    email: str


class SuperAdminCreate(SuperAdminBase):
    password: str


class SuperAdminOut(SuperAdminBase):
    id: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Also we need schemas for creating an Admin from SuperAdmin
class AdminCreateBySuperAdmin(BaseModel):
    business_name: str
    owner_first_name: str
    owner_last_name: str
    email: str
    phone: str
    password: str
    address: str
    city: str
    state: str
    pincode: str
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None

