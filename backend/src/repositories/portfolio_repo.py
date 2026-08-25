from typing import Any

from src.models import MarketPriceCache, PortfolioHolding
from src.repositories.base import BaseRepository
from src.utils.log_functions import logtime


class PortfolioRepository(BaseRepository):
    @logtime
    def get_holdings(self) -> list[PortfolioHolding]:
        """Returns all raw portfolio holdings for the user."""
        return self._scoped_query(PortfolioHolding).all()

    @logtime
    def get_holdings_with_market_prices(self) -> list[dict[str, Any]]:
        """Joins holdings with cached market prices and calculates real-time P&L."""
        holdings = self._scoped_query(PortfolioHolding).all()
        results = []

        for h in holdings:
            cached_price_obj = (
                self.db.query(MarketPriceCache)
                .filter(
                    MarketPriceCache.symbol == h.symbol,
                    MarketPriceCache.exchange == h.exchange,
                )
                .first()
            )

            current_price = cached_price_obj.current_price if cached_price_obj else h.avg_buy_price
            day_change_pct = cached_price_obj.day_change_pct if cached_price_obj else 0.0
            rsi_14 = cached_price_obj.rsi_14 if cached_price_obj else None

            cost_basis = round(h.quantity * h.avg_buy_price, 2)
            current_value = round(h.quantity * current_price, 2)
            unrealized_pnl = round(current_value - cost_basis, 2)
            pnl_pct = round((unrealized_pnl / cost_basis) * 100, 2) if cost_basis > 0 else 0.0

            results.append(
                {
                    "holding_id": h.id,
                    "symbol": h.symbol,
                    "exchange": h.exchange,
                    "asset_class": h.asset_class,
                    "sector": h.sector,
                    "quantity": h.quantity,
                    "avg_buy_price": h.avg_buy_price,
                    "current_price": current_price,
                    "day_change_pct": day_change_pct,
                    "rsi_14": rsi_14,
                    "cost_basis": cost_basis,
                    "current_value": current_value,
                    "unrealized_pnl": unrealized_pnl,
                    "pnl_pct": pnl_pct,
                }
            )

        return results

    @logtime
    def get_asset_allocation_breakdown(self) -> list[dict[str, Any]]:
        """Calculates asset class distribution and weights."""
        holdings_with_prices = self.get_holdings_with_market_prices()
        total_val = sum(item["current_value"] for item in holdings_with_prices)

        class_sums: dict[str, float] = {}
        for item in holdings_with_prices:
            ac = item["asset_class"].lower()
            class_sums[ac] = class_sums.get(ac, 0.0) + item["current_value"]

        allocation = []
        for ac, val in class_sums.items():
            pct = round((val / total_val) * 100, 1) if total_val > 0 else 0.0
            allocation.append(
                {
                    "asset_class": ac,
                    "total_value": round(val, 2),
                    "pct_of_portfolio": pct,
                }
            )

        return sorted(allocation, key=lambda x: x["total_value"], reverse=True)

    @logtime
    def get_total_portfolio_value(self) -> float:
        """Calculates total portfolio value across all holdings."""
        holdings_with_prices = self.get_holdings_with_market_prices()
        return round(sum(item["current_value"] for item in holdings_with_prices), 2)
