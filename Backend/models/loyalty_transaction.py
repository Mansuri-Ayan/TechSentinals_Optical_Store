import enum
from sqlalchemy import Column, BigInteger, ForeignKey, Integer, DateTime, func, Enum, Text, String, Numeric
from sqlalchemy.orm import relationship
from db.session import Base


class LoyaltyTransactionType(str, enum.Enum):
    EARNED_CATEGORY = "EARNED_CATEGORY"
    EARNED_PRICE    = "EARNED_PRICE"
    EARNED_CUSTOM   = "EARNED_CUSTOM"
    REDEEMED        = "REDEEMED"
    ADJUSTED        = "ADJUSTED"

class LoyaltyTransaction(Base):
    __tablename__ = "loyalty_transactions"

    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    customer_id = Column(BigInteger, ForeignKey("customers.id",
                         ondelete="CASCADE"), nullable=False, index=True)
    store_id    = Column(BigInteger, ForeignKey("stores.id",
                         ondelete="CASCADE"), nullable=False, index=True)
    sale_id     = Column(BigInteger, ForeignKey("sales.id",
                         ondelete="SET NULL"), nullable=True, index=True)

    type   = Column(Enum(LoyaltyTransactionType,
                    name="loyalty_transaction_type_enum"), nullable=False)
    points = Column(Integer, nullable=False)
             # positive = earned, negative = redeemed / adjusted

    # EARNED_CATEGORY only
    category_id = Column(BigInteger, ForeignKey("categories.id",
                          ondelete="SET NULL"), nullable=True)

    # REDEEMED only
    rupee_value = Column(Numeric(10, 2), nullable=True)
                  # rupee discount given in exchange for points

    # EARNED_CUSTOM / ADJUSTED only
    given_by_type = Column(String(20), nullable=True)  # "ADMIN" or "MANAGER"
    given_by_id   = Column(BigInteger, nullable=True)

    note       = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", lazy="selectin")
    store    = relationship("Store",    lazy="selectin")
    sale     = relationship("Sale",     lazy="selectin")
    category = relationship("Category", lazy="selectin")