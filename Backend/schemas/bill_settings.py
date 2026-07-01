from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class BillSettingsBase(BaseModel):
    header_text: Optional[str] = "Optical Store"
    sub_header_text: Optional[str] = "Tax Invoice / Receipt"
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    gst_number: Optional[str] = None
    logo: Optional[str] = None
    qr_code: Optional[str] = None
    show_prescription: bool = True
    show_gst: bool = True
    theme_color: Optional[str] = "#0A0F1F"
    footer_text: Optional[str] = "Thank you for your business!"

class BillSettingsUpdate(BillSettingsBase):
    pass

class BillSettingsResponse(BillSettingsBase):
    id: int
    store_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
