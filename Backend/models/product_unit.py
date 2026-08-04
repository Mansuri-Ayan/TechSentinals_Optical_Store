import enum
from sqlalchemy import (
    Column,
    String,
    BigInteger,
    ForeignKey,
    DateTime,
    Enum,
    func,
)
from sqlalchemy.orm import relationship, validates
from db.session import Base
from models.inventory import OwnerType

class UnitStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    SOLD = "SOLD"
    DAMAGED = "DAMAGED"
    IN_REPAIR = "IN_REPAIR"
    LOST = "LOST"
    RESERVED = "RESERVED"
    DEADSTOCK = "DEADSTOCK"
    EXCHANGED = "EXCHANGED"

class UnitSourceType(str, enum.Enum):
    PURCHASE_ORDER = "PURCHASE_ORDER"
    MANUAL_ADD = "MANUAL_ADD"
    TRANSFER_IN = "TRANSFER_IN"
    RETURN = "RETURN"
    EXCHANGE_IN = "EXCHANGE_IN"

class ProductUnit(Base):
    """
    Represents an individual physical unit of a product.
    Tracks location, status, and full lifecycle of a single item.
    """

    __tablename__ = "product_units"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    unit_sku = Column(
        String(150),
        nullable=False,
        unique=True,
        index=True,
        comment="Unique SKU per physical unit (e.g., FRM-RB-001-U0001)",
    )

    product_id = Column(
        BigInteger,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → products.id",
    )

    inventory_batch_id = Column(
        BigInteger,
        ForeignKey("inventories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → inventories.id — links unit to its cost batch",
    )

    original_batch_id = Column(
        BigInteger,
        ForeignKey("inventories.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="FK → inventories.id — links unit to its original batch before transfer",
    )

    status = Column(
        Enum(UnitStatus),
        nullable=False,
        default=UnitStatus.AVAILABLE,
        index=True,
        comment="Current physical status of this specific unit",
    )

    owner_type = Column(
        Enum(OwnerType),
        nullable=False,
        index=True,
        comment="Enum: ADMIN or STORE",
    )

    owner_id = Column(
        BigInteger,
        nullable=False,
        index=True,
        comment="Polymorphic ID matching owner_type (admin.id or store.id)",
    )

    source_type = Column(
        Enum(UnitSourceType),
        nullable=False,
        comment="How this unit entered the system",
    )

    manufacturer_serial = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Optional external serial number from manufacturer",
    )

    sale_item_id = Column(
        BigInteger,
        ForeignKey("sale_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → sale_items.id — tracks which sale item sold this unit",
    )

    repair_id = Column(
        BigInteger,
        ForeignKey("repairs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → repairs.id — tracks if this unit is currently in repair",
    )

    sold_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when status changed to SOLD",
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Timestamp when unit was created",
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Timestamp when unit was last updated",
    )

    # ── Relationships ──────────────────────────────────────────────────────────

    product = relationship("Product", backref="product_units")
    inventory_batch = relationship("Inventory", backref="product_units", foreign_keys="[ProductUnit.inventory_batch_id]")
    sale_item = relationship("SaleItem", backref="assigned_units")
    repair = relationship("Repair", backref="repaired_units", foreign_keys="[ProductUnit.repair_id]")

    @validates("unit_sku")
    def validate_unit_sku(self, key, value):
        if value:
            return "".join(c for c in value if c.isalnum()).upper()
        return value
