# Model: lens_product.py
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


class LensProduct(Base):
    __tablename__ = "lens_products"

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

    lens_type = Column(
        String(100),
        nullable=True,
        comment="Lens type (e.g. Single Vision, Bifocal, Progressive)",
    )
    material = Column(
        String(100),
        nullable=True,
        comment="Lens material (e.g. CR-39, Polycarbonate, Glass, Trivex)",
    )
    index_value = Column(
        String(100),
        nullable=True,
        comment="Refractive index (e.g. 1.50, 1.56, 1.60, 1.67, 1.74)",
    )
    coating = Column(
        String(100),
        nullable=True,
        comment="Coating type (e.g. Anti-Reflective, Scratch-Resistant, HMC)",
    )
    tint_color = Column(
        String(100),
        nullable=True,
        comment="Tint color if applicable",
    )
    uv_protection = Column(
        String(100),
        nullable=True,
        comment="UV protection level (e.g. UV400, UV380)",
    )
    blue_cut = Column(
        String(100),
        nullable=True,
        comment="Blue-light filtering (e.g. Yes, No, Percentage)",
    )
    photochromic = Column(
        String(100),
        nullable=True,
        comment="Photochromic / transition capability",
    )
    polarized = Column(
        String(100),
        nullable=True,
        comment="Polarization (e.g. Yes, No)",
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
        back_populates="lens_product",
    )

    def __repr__(self) -> str:
        return (
            f"<LensProduct(id={self.id!r}, product_id={self.product_id!r}, "
            f"lens_type={self.lens_type!r})>"
        )
