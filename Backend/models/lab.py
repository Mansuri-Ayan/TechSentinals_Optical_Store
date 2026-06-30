# Model: lab.py
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class Lab(Base):
    __tablename__ = "labs"

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
        index=True,
        comment="FK → admins.id — owner of this lab record",
    )

    name = Column(
        String(255),
        nullable=False,
        comment="Lab display name",
    )

    contact_number = Column(
        String(50),
        nullable=False,
        comment="Lab contact phone number",
    )

    email = Column(
        String(255),
        nullable=False,
        comment="Lab email address",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether the lab is currently active",
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
        back_populates="labs",
    )
    
    lab_orders = relationship(
        "Sale",
        back_populates="lab",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<Lab(id={self.id!r}, name={self.name!r})>"
