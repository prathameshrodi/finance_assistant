from datetime import datetime
import json
from src.database import SessionLocal
from src.models import User
from src.repositories import LedgerRepository, PortfolioRepository, MarketRepository
from langchain_core.tools import tool
import logging
logger = logging.getLogger(__name__)


@tool
def get_spend_analysis(start_date: str, end_date: str):
    """Useful to fetch category spending and daily burn rate for a given date range (YYYY-MM-DD)."""
    db = SessionLocal()
    try:
        user = db.query(User).first()
        start_date_new = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_date_new = datetime.strptime(end_date, "%Y-%m-%d").date()
        ledger = LedgerRepository(db, user.id)
        spending = ledger.get_spending_by_category(start_date_new, end_date_new)
        burn = ledger.get_monthly_burn_rate(start_date_new.year, end_date_new.month)

        return json.dumps({
            "start_date": start_date,
            "end_date": end_date,
            "category_spending": spending,
            "monthly_burn_metrics": burn,
            "monthly_salary": user.monthly_salary
        })
    except Exception as e:
        logger.error(f"Failed to get Spend Analysis : {e}")
        raise Exception(e)
    finally:
        db.close()
@tool
def get_portfolio_analysis():
    """get current holdings, total net worth, asset allocation weights, and XIRR"""
    """Useful to fetch user's current Demat stock/mutual fund holdings, total net worth, P&L, and asset allocation."""
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            return "No user profile found."

        repo = PortfolioRepository(db, user.id)
        holdings = repo.get_holdings_with_market_prices()
        allocation = repo.get_asset_allocation_breakdown()

        total_val = sum(h["current_value"] for h in holdings)
        total_cost = sum(h["cost_basis"] for h in holdings)
        total_pnl = round(total_val - total_cost, 2)

        return json.dumps({
            "total_portfolio_value": total_val,
            "total_invested_cost": total_cost,
            "unrealized_pnl": total_pnl,
            "holdings": holdings,
            "asset_allocation": allocation
        }, indent=2)
    except Exception as e:
        logger.error(f"Failed to get Portfolio Analysis : {e}")
        raise Exception(e)
    finally:
        db.close()

@tool
def get_stock_opportunities():
    """get active stock signals (RSI oversold dips, PE discounts)"""
    """Useful to fetch active stock opportunities, oversold dips (RSI < 35), and valuation discounts."""
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            return "No user profile found."

        repo = MarketRepository(db, user.id)
        opps = repo.get_active_opportunities()
        watchlist = repo.get_watchlist_with_prices()

        return json.dumps({
            "active_opportunities": [
                {
                    "symbol": o.symbol,
                    "signal_type": o.signal_type,
                    "current_price": o.current_price,
                    "target_price": o.target_price,
                    "thesis": o.thesis
                }
                for o in opps
            ],
            "watchlist": watchlist
        }, indent=2)
    except Exception as e:
        logger.error(f"Failed to get Stock Opportunities Analysis : {e}")
        raise Exception(e)
    finally:
        db.close()

