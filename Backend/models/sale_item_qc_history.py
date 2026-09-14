# Model: sale_item_qc_history.py
"""
SaleItemQCHistory — tracks full chronological audit history of QC inspections,
rework iterations, and state transitions for each individual SaleItem.
"""
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class SaleItemQCHistory(Base):
    __tablename__ = "sale_item_qc_histories"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    sale_item_id = Column(
        BigInteger,
        ForeignKey("sale_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → sale_items.id — individual item inspected",
    )

    sale_id = Column(
        BigInteger,
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → sales.id — order containing this item",
    )

    inspector_id = Column(
        BigInteger,
        nullable=False,
        comment="User ID of inspector who performed this QC action",
    )

    inspector_type = Column(
        String(50),
        nullable=False,
        comment="Role/type of inspector (e.g. ADMIN, MANAGER, OPTICIAN, WORKER)",
    )

    inspector_name = Column(
        String(150),
        nullable=True,
        comment="Cached display name of inspector",
    )

    previous_status = Column(
        String(50),
        nullable=True,
        comment="QC status before this transition",
    )

    new_status = Column(
        String(50),
        nullable=False,
        comment="QC status resulting from this inspection",
    )

    damage_type = Column(
        String(50),
        nullable=True,
        comment="STOCK_DAMAGE, LAB_DAMAGE, or FITTING_FAILURE (if failed)",
    )

    rework_cycle = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Iteration number of rework cycle (0 for normal, 1+ for fitting reworks)",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Inspector observations, fault descriptions, or rework instructions",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Timestamp of inspection event",
    )

    # ── Relationships ──────────────────────────────────────────
    sale_item = relationship(
        "SaleItem",
        back_populates="qc_history",
    )
    sale = relationship(
        "Sale",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<SaleItemQCHistory(id={self.id!r}, sale_item_id={self.sale_item_id!r}, "
            f"new_status={self.new_status!r}, rework_cycle={self.rework_cycle!r})>"
        )
