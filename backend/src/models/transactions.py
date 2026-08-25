import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from src.database import Base


class SyncRun(Base):
    __tablename__ = "sync_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)  # gmail, zerodha, statement_upload, manual
    status = Column(String(30), default="running")  # running, completed, failed, partial
    items_found = Column(Integer, default=0)
    txns_staged = Column(Integer, default=0)
    txns_promoted = Column(Integer, default=0)
    errors = Column(Integer, default=0)
    error_details = Column(JSON, default=list)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    email_sources = relationship("EmailSource", back_populates="sync_run", cascade="all, delete-orphan")
    staged_transactions = relationship("StagedTransaction", back_populates="sync_run", cascade="all, delete-orphan")


class EmailSource(Base):
    __tablename__ = "email_sources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sync_run_id = Column(String(36), ForeignKey("sync_runs.id", ondelete="CASCADE"), nullable=False)
    provider_message_id = Column(String(255), unique=True, nullable=False, index=True)  # Dedup Layer 1
    subject_hash = Column(String(64), nullable=False)
    email_date = Column(DateTime, nullable=False)
    sender = Column(String(255), nullable=False)
    source_type = Column(String(50), default="bank_alert")
    processed_at = Column(DateTime, default=datetime.utcnow)

    sync_run = relationship("SyncRun", back_populates="email_sources")
    attachments = relationship("Attachment", back_populates="email_source", cascade="all, delete-orphan")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email_source_id = Column(String(36), ForeignKey("email_sources.id", ondelete="CASCADE"), nullable=True)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    storage_path = Column(String(500), nullable=False)
    content_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    email_source = relationship("EmailSource", back_populates="attachments")


class StagedTransaction(Base):
    __tablename__ = "staged_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sync_run_id = Column(String(36), ForeignKey("sync_runs.id", ondelete="CASCADE"), nullable=False)
    email_source_id = Column(String(36), ForeignKey("email_sources.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    transaction_date = Column(Date, nullable=False)
    raw_description = Column(Text, nullable=False)
    parsed_merchant = Column(String(255), default="Unknown")
    parsed_category = Column(String(100), default="Other Expenses")
    confidence = Column(Float, default=0.0)
    status = Column(String(30), default="pending_review")  # pending_review, approved, rejected, auto_promoted
    llm_raw_output = Column(JSON, default=dict)
    validation_errors = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    bank_name = Column(Text, nullable=False)
    account_number = Column(Text, nullable=False)
    account_type = Column(Text, nullable=False)
    is_duplicated = Column(Boolean, default=False)
    sync_run = relationship("SyncRun", back_populates="staged_transactions")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id"), nullable=False, index=True)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=True, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    transaction_date = Column(Date, nullable=False, index=True)
    description = Column(String(500), nullable=False)
    txn_type = Column(String(20), default="debit")  # debit, credit, transfer, investment
    is_recurring = Column(Boolean, default=False)
    metadata_json = Column(JSON, default=dict)
    promoted_from = Column(String(36), ForeignKey("staged_transactions.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")


class TransactionFingerprintSource(Base):
    __tablename__ = "transaction_fingerprint_sources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_id = Column(String(36), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    email_source_id = Column(String(36), ForeignKey("email_sources.id", ondelete="SET NULL"), nullable=True)
    fingerprint_hash = Column(String(64), unique=True, nullable=False, index=True)  # Dedup Layer 2
    fingerprint_components = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Correction(Base):
    __tablename__ = "corrections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_id = Column(String(36), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    field_changed = Column(String(50), nullable=False)  # category_id, merchant_id, amount
    old_value = Column(Text, nullable=False)
    new_value = Column(Text, nullable=False)
    correction_source = Column(String(50), default="user_ui")
    created_at = Column(DateTime, default=datetime.utcnow)
