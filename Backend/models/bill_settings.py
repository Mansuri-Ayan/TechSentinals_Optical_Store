from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Boolean, Text
from sqlalchemy.sql import func
from db.session import Base

class BillSettings(Base):
    __tablename__ = "bill_settings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    store_id = Column(BigInteger, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    header_text = Column(String(255), nullable=True, default="Optical Store")
    sub_header_text = Column(String(255), nullable=True, default="Tax Invoice / Receipt")
    address = Column(Text, nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    gst_number = Column(String(100), nullable=True)
    
    logo = Column(Text, nullable=True)
    qr_code = Column(Text, nullable=True)
    
    show_prescription = Column(Boolean, nullable=False, default=True)
    show_gst = Column(Boolean, nullable=False, default=True)
    theme_color = Column(String(50), nullable=True, default="#0A0F1F")
    footer_text = Column(Text, nullable=True, default="Thank you for your business!")

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<BillSettings(store_id={self.store_id})>"
