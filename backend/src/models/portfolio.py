import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from src.database import Base


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)  # INFY, RELIANCE, VOO
    exchange = Column(String(20), default="NSE")  # NSE, BSE, NASDAQ
    asset_class = Column(String(50), default="equity")  # equity, mutual_fund, etf, bond, gold, crypto
    sector = Column(String(100), default="General")
    quantity = Column(Float, nullable=False)
    avg_buy_price = Column(Float, nullable=False)
    last_synced_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", back_populates="holdings")


class StagedHolding(Base):
    __tablename__ = "staged_holdings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sync_run_id = Column(String(36), ForeignKey("sync_runs.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(50), nullable=False, index=True)
    exchange = Column(String(20), default="NSE")
    asset_class = Column(String(50), default="equity")
    sector = Column(String(100), default="General")
    quantity = Column(Float, nullable=False)
    avg_buy_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=True)
    status = Column(String(30), default="pending_review")  # pending_review, promoted, discarded
    confidence = Column(Float, default=0.95)
    account_number = Column(String(256), default="")
    broker = Column(String(256), default="")
    llm_raw_output = Column(JSON, default=dict)
    is_duplicate = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class MarketPriceCache(Base):
    __tablename__ = "market_price_cache"

    symbol = Column(String(50), primary_key=True)
    exchange = Column(String(20), primary_key=True, default="NSE")
    current_price = Column(Float, nullable=False)
    day_change_pct = Column(Float, default=0.0)
    pe_ratio = Column(Float, nullable=True)
    pb_ratio = Column(Float, nullable=True)
    rsi_14 = Column(Float, nullable=True)
    fifty_two_week_high = Column(Float, nullable=True)
    fifty_two_week_low = Column(Float, nullable=True)
    fetched_at = Column(DateTime, default=datetime.utcnow)
    ttl_seconds = Column(Integer, default=900)


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), default="Primary Radar")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("WatchlistItem", back_populates="watchlist", cascade="all, delete-orphan")


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    watchlist_id = Column(String(36), ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(50), nullable=False)
    exchange = Column(String(20), default="NSE")
    target_buy_price = Column(Float, nullable=True)
    alert_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    watchlist = relationship("Watchlist", back_populates="items")


class InvestmentOpportunity(Base):
    __tablename__ = "investment_opportunities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    exchange = Column(String(20), default="NSE")
    signal_type = Column(String(50), nullable=False)  # rsi_oversold, pe_discount, rebalance_gap, dividend_yield
    confidence_score = Column(Float, default=0.85)
    target_price = Column(Float, nullable=True)
    current_price = Column(Float, nullable=False)
    thesis = Column(Text, nullable=False)
    technical_indicators = Column(JSON, default=dict)
    status = Column(String(30), default="active")  # active, dismissed, executed
    created_at = Column(DateTime, default=datetime.utcnow)
