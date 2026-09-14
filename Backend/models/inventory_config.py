# Model: inventory_config.py
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class InventoryConfig(Base):
    __tablename__ = "inventory_configs"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    admin_id = Column(
        BigInteger,
        ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="FK → admins.id — Admin account this config applies to",
    )

    # --- GST Defaults ---
    default_gst_percent = Column(
        Numeric(5, 2),
        nullable=False,
        default=18.00,
        server_default="18.00",
        comment="Default GST rate percentage for all products (e.g. 18.00)",
    )

    # --- Stock Aging Defaults ---
    aging_enabled = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Flag to enable/disable automated stock aging",
    )

    normal_period_months = Column(
        Integer,
        nullable=False,
        default=6,
        server_default="6",
        comment="Number of months a product stays in NORMAL status before discounting",
    )

    stage_1_months = Column(
        Integer,
        nullable=False,
        default=3,
        server_default="3",
        comment="Number of months product stays in Stage 1 aging status",
    )

    stage_1_discount = Column(
        Numeric(5, 2),
        nullable=False,
        default=10.00,
        server_default="10.00",
        comment="Discount percentage in Stage 1",
    )

    stage_2_months = Column(
        Integer,
        nullable=False,
        default=3,
        server_default="3",
        comment="Number of months product stays in Stage 2 aging status",
    )

    stage_2_discount = Column(
        Numeric(5, 2),
        nullable=False,
        default=20.00,
        server_default="20.00",
        comment="Discount percentage in Stage 2",
    )

    stage_3_months = Column(
        Integer,
        nullable=False,
        default=3,
        server_default="3",
        comment="Number of months product stays in Stage 3 aging status",
    )

    stage_3_discount = Column(
        Numeric(5, 2),
        nullable=False,
        default=50.00,
        server_default="50.00",
        comment="Discount percentage in Stage 3",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Record creation timestamp",
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Last record update timestamp",
    )

    # Relationships
    admin = relationship("Admin", backref="inventory_config", lazy="selectin")
