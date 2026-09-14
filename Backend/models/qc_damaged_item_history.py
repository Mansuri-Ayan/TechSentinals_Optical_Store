# Model: qc_damaged_item_history.py
"""
QCDamagedItemHistory — tracks full chronological audit history of damage resolutions,
promises, re-openings, failures, and status transitions for QCDamagedItem records.
"""
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class QCDamagedItemHistory(Base):
    __tablename__ = "qc_damaged_item_histories"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    damaged_item_id = Column(
        BigInteger,
        ForeignKey("qc_damaged_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → qc_damaged_items.id — damaged item record",
    )

    changed_by_id = Column(
        BigInteger,
        nullable=False,
        comment="User ID of staff/admin who performed this transition",
    )

    changed_by_type = Column(
        String(50),
        nullable=False,
        comment="Role/type of user (e.g. ADMIN, MANAGER, OPTICIAN, WORKER)",
    )

    changed_by_name = Column(
        String(150),
        nullable=True,
        comment="Cached display name of user",
    )

    action = Column(
        String(50),
        nullable=False,
        comment="Action type: CREATED, PROMISED, VERIFIED_COMPLETED, REOPENED, RESOLUTION_CHANGED, FAILED, MARKED_AS_LOSS",
    )

    previous_status = Column(
        String(50),
        nullable=True,
        comment="Status before this transition",
    )

    new_status = Column(
        String(50),
        nullable=False,
        comment="Status resulting from this transition",
    )

    previous_resolution_type = Column(
        String(50),
        nullable=True,
        comment="Previous resolution classification (if any)",
    )

    new_resolution_type = Column(
        String(50),
        nullable=True,
        comment="New resolution classification (if any)",
    )

    previous_compensation_amount = Column(
        Numeric(12, 2),
        nullable=True,
        comment="Previous compensation amount before transition",
    )

    new_compensation_amount = Column(
        Numeric(12, 2),
        nullable=True,
        comment="New compensation amount after transition",
    )

    reason = Column(
        Text,
        nullable=True,
        comment="Mandatory reason for reopening, failing, changing resolution, or write-off",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Optional evidence, vendor correspondence, or additional observations",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Timestamp of transition event",
    )

    # ── Relationships ──────────────────────────────────────────
    damaged_item = relationship(
        "QCDamagedItem",
        back_populates="history",
    )

    def __repr__(self) -> str:
        return (
            f"<QCDamagedItemHistory(id={self.id!r}, damaged_item_id={self.damaged_item_id!r}, "
            f"action={self.action!r}, previous_status={self.previous_status!r}, new_status={self.new_status!r})>"
        )
