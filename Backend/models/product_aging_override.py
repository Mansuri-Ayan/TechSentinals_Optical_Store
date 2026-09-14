# Model: product_aging_override.py
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


class ProductAgingOverride(Base):
    __tablename__ = "product_aging_overrides"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    product_id = Column(
        BigInteger,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="FK → products.id — Product this override applies to",
    )

    admin_id = Column(
        BigInteger,
        ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → admins.id — Admin account owner",
    )

    aging_enabled = Column(
        Boolean,
        nullable=True,
        comment="Override for automated aging status (True/False or NULL to inherit)",
    )

    normal_period_months = Column(
        Integer,
        nullable=True,
        comment="Override for NORMAL period months (or NULL to inherit)",
    )

    stage_1_months = Column(
        Integer,
        nullable=True,
        comment="Override for Stage 1 duration in months (or NULL to inherit)",
    )

    stage_1_discount = Column(
        Numeric(5, 2),
        nullable=True,
        comment="Override for Stage 1 discount % (or NULL to inherit)",
    )

    stage_2_months = Column(
        Integer,
        nullable=True,
        comment="Override for Stage 2 duration in months (or NULL to inherit)",
    )

    stage_2_discount = Column(
        Numeric(5, 2),
        nullable=True,
        comment="Override for Stage 2 discount % (or NULL to inherit)",
    )

    stage_3_months = Column(
        Integer,
        nullable=True,
        comment="Override for Stage 3 duration in months (or NULL to inherit)",
    )

    stage_3_discount = Column(
        Numeric(5, 2),
        nullable=True,
        comment="Override for Stage 3 discount % (or NULL to inherit)",
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
    product = relationship("Product", backref="aging_override", lazy="selectin")
    admin = relationship("Admin", backref="product_aging_overrides", lazy="selectin")
