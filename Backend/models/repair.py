# Model: repair.py
"""
Repair — a repair or service job for a customer's optical product.
Can be linked to an existing Sale (for warranty tracking) or standalone (walk-in).
Staff assignment is polymorphic (Manager / Worker / Optician).
"""
import enum
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class RepairType(str, enum.Enum):
    FRAME_REPAIR = "FRAME_REPAIR"
    LENS_REPLACEMENT = "LENS_REPLACEMENT"
    ACCESSORY_REPAIR = "ACCESSORY_REPAIR"
    WARRANTY_SERVICE = "WARRANTY_SERVICE"
    OTHER = "OTHER"


class RepairStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class RepairStaffType(str, enum.Enum):
    MANAGER = "MANAGER"
    WORKER = "WORKER"
    OPTICIAN = "OPTICIAN"


class Repair(Base):
    __tablename__ = "repairs"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    repair_number = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Human-readable repair ID (e.g. REP-2026-00001)",
    )

    admin_id = Column(
        BigInteger,
        ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → admins.id — owning business (multi-tenant)",
    )

    store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → stores.id — store handling this repair",
    )

    customer_id = Column(
        BigInteger,
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → customers.id — NULL for walk-in customers",
    )

    sale_id = Column(
        BigInteger,
        ForeignKey("sales.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → sales.id — original sale for warranty reference",
    )

    product_unit_id = Column(
        BigInteger,
        ForeignKey("product_units.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → product_units.id — physical unit being repaired",
    )

    customer_name = Column(
        String(255),
        nullable=True,
        comment="Walk-in customer name when customer_id is NULL",
    )

    repair_type = Column(
        Enum(RepairType, name="repair_type_enum", create_constraint=True),
        nullable=False,
        default=RepairType.FRAME_REPAIR,
        comment="Type of repair or service",
    )

    status = Column(
        Enum(RepairStatus, name="repair_status_enum", create_constraint=True),
        nullable=False,
        default=RepairStatus.RECEIVED,
        server_default="RECEIVED",
        comment="Current repair lifecycle status",
    )

    is_warranty = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        comment="Whether this repair is covered under product warranty",
    )

    description = Column(
        Text,
        nullable=True,
        comment="Detailed description of the repair issue",
    )

    estimated_cost = Column(
        Numeric(10, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Estimated repair cost (0 for warranty service)",
    )

    final_cost = Column(
        Numeric(10, 2),
        nullable=True,
        comment="Actual final cost after repair is completed",
    )

    advance_paid = Column(
        Numeric(10, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Advance payment received at drop-off",
    )

    received_date = Column(
        Date,
        nullable=False,
        comment="Date the item was received for repair",
    )

    estimated_completion_date = Column(
        Date,
        nullable=True,
        comment="Estimated date of repair completion",
    )

    completed_date = Column(
        Date,
        nullable=True,
        comment="Actual date the repair was completed",
    )

    # Polymorphic staff reference
    handled_by_type = Column(
        Enum(RepairStaffType, name="repair_staff_type_enum", create_constraint=True),
        nullable=True,
        comment="Type of staff handling this repair (MANAGER/WORKER/OPTICIAN)",
    )

    handled_by_id = Column(
        BigInteger,
        nullable=True,
        index=True,
        comment="Polymorphic FK — managers.id / workers.id / opticians.id",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Internal notes about the repair process",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Row creation timestamp",
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Row last-update timestamp",
    )

    # ── Relationships ──────────────────────────────────────────
    admin = relationship(
        "Admin",
        back_populates="repairs",
        lazy="selectin",
    )
    store = relationship(
        "Store",
        back_populates="repairs",
        lazy="selectin",
    )
    customer = relationship(
        "Customer",
        back_populates="repairs",
        lazy="selectin",
    )
    sale = relationship(
        "Sale",
        back_populates="repairs",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<Repair(id={self.id!r}, number={self.repair_number!r}, "
            f"type={self.repair_type!r}, status={self.status!r})>"
        )
