# Model: frame_product.py
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


class FrameProduct(Base):
    __tablename__ = "frame_products"

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

    frame_type = Column(
        String(100),
        nullable=True,
        comment="Frame type (e.g. Full-Rim, Half-Rim, Rimless)",
    )
    shape = Column(
        String(100),
        nullable=True,
        comment="Frame shape (e.g. Rectangle, Round, Aviator, Cat-Eye)",
    )
    material = Column(
        String(100),
        nullable=True,
        comment="Frame material (e.g. Acetate, Metal, TR-90, Titanium)",
    )
    color = Column(
        String(100),
        nullable=True,
        comment="Frame color",
    )
    lens_width = Column(
        String(100),
        nullable=True,
        comment="Lens width in mm",
    )
    bridge_width = Column(
        String(100),
        nullable=True,
        comment="Bridge width in mm",
    )
    temple_length = Column(
        String(100),
        nullable=True,
        comment="Temple length in mm",
    )
    gender = Column(
        String(100),
        nullable=True,
        comment="Target gender (e.g. Male, Female, Unisex)",
    )
    age_group = Column(
        String(100),
        nullable=True,
        comment="Target age group (e.g. Adult, Kids)",
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
        back_populates="frame_product",
    )

    def __repr__(self) -> str:
        return (
            f"<FrameProduct(id={self.id!r}, product_id={self.product_id!r}, "
            f"frame_type={self.frame_type!r})>"
        )
