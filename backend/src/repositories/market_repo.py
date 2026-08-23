from typing import List, Dict, Any, Optional
from src.models import Watchlist, WatchlistItem, MarketPriceCache, InvestmentOpportunity
from src.repositories.base import BaseRepository
from src.utils.log_functions import logtime


class MarketRepository(BaseRepository):
    @logtime
    def get_watchlist_with_prices(self) -> List[Dict[str, Any]]:
        """Retrieves user watchlist items joined with cached market prices."""
        watchlists = self._scoped_query(Watchlist).all()
        results = []

        for wl in watchlists:
            for item in wl.items:
                cached = (
                    self.db.query(MarketPriceCache)
                    .filter(
                        MarketPriceCache.symbol == item.symbol,
                        MarketPriceCache.exchange == item.exchange,
                    )
                    .first()
                )

                results.append({
                    "watchlist_name": wl.name,
                    "symbol": item.symbol,
                    "exchange": item.exchange,
                    "target_buy_price": item.target_buy_price,
                    "current_price": cached.current_price if cached else None,
                    "day_change_pct": cached.day_change_pct if cached else 0.0,
                    "rsi_14": cached.rsi_14 if cached else None,
                    "pe_ratio": cached.pe_ratio if cached else None,
                    "alert_notes": item.alert_notes,
                })

        return results

    @logtime
    def get_active_opportunities(self, min_confidence: float = 0.7) -> List[InvestmentOpportunity]:
        """Returns active investment opportunities discovered by the scanner."""
        return (
            self._scoped_query(InvestmentOpportunity)
            .filter(
                InvestmentOpportunity.status == "active",
                InvestmentOpportunity.confidence_score >= min_confidence,
            )
            .order_by(InvestmentOpportunity.confidence_score.desc())
            .all()
        )

    @logtime
    def save_opportunity(self, opp_data: dict) -> InvestmentOpportunity:
        """Persists a new investment opportunity thesis."""
        opp = InvestmentOpportunity(**opp_data)
        self._create(opp)
        self.db.commit()
        self.db.refresh(opp)
        return opp
