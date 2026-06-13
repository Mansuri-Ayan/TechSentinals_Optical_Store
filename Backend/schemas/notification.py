# Schema: notification.py
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class NotificationTypeEnum(str, Enum):
    TRANSFER_REQUEST_RECEIVED = "TRANSFER_REQUEST_RECEIVED"
    TRANSFER_REQUEST_APPROVED = "TRANSFER_REQUEST_APPROVED"
    TRANSFER_REQUEST_REJECTED = "TRANSFER_REQUEST_REJECTED"
    TRANSFER_PUSH_RECEIVED = "TRANSFER_PUSH_RECEIVED"
    ADMIN_TRANSFER_COMPLETED = "ADMIN_TRANSFER_COMPLETED"


class NotificationRead(BaseModel):
    id: int
    recipient_user_id: int
    recipient_store_id: int | None = None
    type: NotificationTypeEnum
    title: str
    message: str
    is_read: bool
    related_transaction_id: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    notifications: list[NotificationRead]
    unread_count: int
