from sqlalchemy import Column, String, Float, DateTime, JSON
from src.database import Base
import uuid
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    risk_profile = Column(String(50), default="moderate")  # conservative, moderate, aggressive
    base_currency = Column(String(10), default="INR")
    monthly_salary = Column(Float, default=100000.00)
    preferences = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
