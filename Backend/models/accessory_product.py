# Model: accessory_product.py
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    String,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base

class AccessoryProduct(Base):
    __tablename__ = "accessory_products"

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
        comment="FK → products.id — one-to-one link to base product",
    )

    accessory_type = Column(
        String(100),
        nullable=True,
        comment="Accessory type (e.g. Case, Cloth, Chain, Solution)",
    )
    material = Column(
        String(100),
        nullable=True,
        comment="Accessory material",
    )
    color = Column(
        String(100),
        nullable=True,
        comment="Accessory color",
    )
    size = Column(
        String(100),
        nullable=True,
        comment="Accessory size / dimensions",
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
    product = relationship(
        "Product",
        back_populates="accessory_product",
    )

    def __repr__(self) -> str:
        return (
            f"<AccessoryProduct(id={self.id!r}, product_id={self.product_id!r}, "
            f"type={self.accessory_type!r})>"
        )
