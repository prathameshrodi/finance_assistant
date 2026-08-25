import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, LargeBinary, String

from src.database import Base


class AdvisorSession(Base):
    __tablename__ = "advisor_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    encrypted_state = Column(LargeBinary, nullable=True)
    encryption_key_ref = Column(String(100), default="default_key")
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    ttl_seconds = Column(Integer, default=86400)


class EvidenceQuery(Base):
    __tablename__ = "evidence_queries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(36), ForeignKey("advisor_sessions.id", ondelete="CASCADE"), nullable=True)
    query_template = Column(String(100), nullable=False)
    query_params = Column(JSON, default=dict)
    result_hash = Column(String(64), nullable=False)
    result_snapshot = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    ttl_seconds = Column(Integer, default=86400)


class FinAuditLog(Base):
    __tablename__ = "fin_audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
