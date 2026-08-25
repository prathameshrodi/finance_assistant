import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import relationship, synonym

from src.database import Base


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    institution_type = Column(String(50), nullable=False)  # bank, broker, credit_card, wallet, cash
    connection_metadata = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    accounts = relationship("Account", back_populates="institution", cascade="all, delete-orphan")


class Account(Base):
    __tablename__ = "accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    account_type = Column(String(50), nullable=False)  # savings, current, credit_card, demat, fixed_deposit, cash
    account_name = Column(String(255), nullable=False)
    account_number_masked = Column(String(50), nullable=True)
    currency = Column(String(10), default="INR")
    balance_snapshot = Column(Float, default=0.00)
    is_active = Column(Boolean, default=True)
    snapshot_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    institution = relationship("Institution", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    holdings = relationship("PortfolioHolding", back_populates="account", cascade="all, delete-orphan")

    name = synonym("account_name")
    current_balance = synonym("balance_snapshot")
