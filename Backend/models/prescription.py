# Model: prescription.py
"""
Prescription — an optical prescription record for a customer.
Each prescription is linked to:
  - Customer (who this prescription is for)
  - Store (where the eye exam was done)
  - Optician (who performed the examination, optional)

A customer can have multiple prescriptions (history).
The `is_active` flag marks the current/latest prescription.
"""
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    customer_id = Column(
        BigInteger,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → customers.id — which customer this prescription belongs to",
    )

    store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → stores.id — store where the eye exam was done",
    )

    optician_id = Column(
        BigInteger,
        ForeignKey("opticians.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → opticians.id — optician who examined the patient",
    )

    # ── Right eye (OD) ────────────────────────────────────────
    sph_right = Column(
        String(10),
        nullable=True,
        comment="Right eye sphere power (e.g. -2.50)",
    )
    cyl_right = Column(
        String(10),
        nullable=True,
        comment="Right eye cylinder power (e.g. -0.75)",
    )
    axis_right = Column(
        String(10),
        nullable=True,
        comment="Right eye axis (e.g. 180)",
    )

    # ── Left eye (OS) ─────────────────────────────────────────
    sph_left = Column(
        String(10),
        nullable=True,
        comment="Left eye sphere power",
    )
    cyl_left = Column(
        String(10),
        nullable=True,
        comment="Left eye cylinder power",
    )
    axis_left = Column(
        String(10),
        nullable=True,
        comment="Left eye axis",
    )

    # ── Additional fields ─────────────────────────────────────
    addition = Column(
        String(10),
        nullable=True,
        comment="Addition (near vision) power for bifocal/progressive",
    )

    pupillary_distance = Column(
        String(10),
        nullable=True,
        comment="Pupillary distance (PD) in mm",
    )

    prescription_date = Column(
        Date,
        nullable=False,
        comment="Date of the eye examination",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Optician notes on the prescription",
    )

    lens_type = Column(
        String(100),
        nullable=True,
        comment="Type of lens prescribed",
    )
    lens_material = Column(
        String(100),
        nullable=True,
        comment="Material of the lenses",
    )
    lens_coating = Column(
        String(100),
        nullable=True,
        comment="Coating applied to the lenses",
    )
    frame_preference = Column(
        String(100),
        nullable=True,
        comment="Customer frame type preference",
    )
    expiry_date = Column(
        Date,
        nullable=True,
        comment="Expiry date of the prescription",
    )
    recommended_usage = Column(
        String(255),
        nullable=True,
        comment="Usage instructions (e.g. reading only, constant wear)",
    )
    doctor_name = Column(
        String(255),
        nullable=True,
        comment="Name of the examining doctor / optician",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether this is the current active prescription",
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
    customer = relationship(
        "Customer",
        back_populates="prescriptions",
        lazy="selectin",
    )
    store = relationship(
        "Store",
        lazy="selectin",
    )
    optician = relationship(
        "Optician",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<Prescription(id={self.id!r}, customer_id={self.customer_id!r}, "
            f"date={self.prescription_date!r}, active={self.is_active!r})>"
        )
