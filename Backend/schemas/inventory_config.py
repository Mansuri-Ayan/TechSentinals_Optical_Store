# Schema: inventory_config.py
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from models.inventory import AgingStage


class InventoryConfigCreate(BaseModel):
    default_gst_percent: Decimal = Field(default=Decimal("18.00"), ge=0, le=100)
    aging_enabled: bool = True
    normal_period_months: int = Field(default=6, ge=0)
    stage_1_months: int = Field(default=3, ge=0)
    stage_1_discount: Decimal = Field(default=Decimal("10.00"), ge=0, le=100)
    stage_2_months: int = Field(default=3, ge=0)
    stage_2_discount: Decimal = Field(default=Decimal("20.00"), ge=0, le=100)
    stage_3_months: int = Field(default=3, ge=0)
    stage_3_discount: Decimal = Field(default=Decimal("50.00"), ge=0, le=100)


class InventoryConfigUpdate(BaseModel):
    default_gst_percent: Decimal | None = Field(default=None, ge=0, le=100)
    aging_enabled: bool | None = None
    normal_period_months: int | None = Field(default=None, ge=0)
    stage_1_months: int | None = Field(default=None, ge=0)
    stage_1_discount: Decimal | None = Field(default=None, ge=0, le=100)
    stage_2_months: int | None = Field(default=None, ge=0)
    stage_2_discount: Decimal | None = Field(default=None, ge=0, le=100)
    stage_3_months: int | None = Field(default=None, ge=0)
    stage_3_discount: Decimal | None = Field(default=None, ge=0, le=100)


class InventoryConfigRead(BaseModel):
    id: int
    admin_id: int
    default_gst_percent: Decimal
    aging_enabled: bool
    normal_period_months: int
    stage_1_months: int
    stage_1_discount: Decimal
    stage_2_months: int
    stage_2_discount: Decimal
    stage_3_months: int
    stage_3_discount: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductAgingOverrideUpsert(BaseModel):
    aging_enabled: bool | None = None
    normal_period_months: int | None = Field(default=None, ge=0)
    stage_1_months: int | None = Field(default=None, ge=0)
    stage_1_discount: Decimal | None = Field(default=None, ge=0, le=100)
    stage_2_months: int | None = Field(default=None, ge=0)
    stage_2_discount: Decimal | None = Field(default=None, ge=0, le=100)
    stage_3_months: int | None = Field(default=None, ge=0)
    stage_3_discount: Decimal | None = Field(default=None, ge=0, le=100)


class ProductAgingOverrideRead(BaseModel):
    id: int
    product_id: int
    admin_id: int
    aging_enabled: bool | None = None
    normal_period_months: int | None = None
    stage_1_months: int | None = None
    stage_1_discount: Decimal | None = None
    stage_2_months: int | None = None
    stage_2_discount: Decimal | None = None
    stage_3_months: int | None = None
    stage_3_discount: Decimal | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgingEvaluationResult(BaseModel):
    evaluated: int
    stage_changes: int
    new_dead_stock: int
    notifications_sent: int
