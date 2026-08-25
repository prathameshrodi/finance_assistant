import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, Date, DateTime, Float, ForeignKey, String

from src.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    monthly_limit = Column(Float, nullable=False)
    period = Column(String(20), default="monthly")
    created_at = Column(DateTime, default=datetime.utcnow)


class Goal(Base):
    __tablename__ = "goals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    goal_type = Column(String(50), nullable=False)  # emergency_fund, retirement_fire, purchase, debt_payoff
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.00)
    deadline = Column(Date, nullable=True)
    allocation_rules = Column(JSON, default=dict)
    status = Column(String(30), default="active")  # active, achieved, paused
    created_at = Column(DateTime, default=datetime.utcnow)
