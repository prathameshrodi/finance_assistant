from typing import List, Dict, Any, Optional
from src.models import Budget, Goal, Category
from src.repositories.base import BaseRepository
from src.utils.log_functions import logtime


class PlanningRepository(BaseRepository):
    @logtime
    def get_budgets_with_actuals(self) -> List[Dict[str, Any]]:
        """Returns category budgets alongside actual monthly spend."""
        budgets = self._scoped_query(Budget).all()
        results = []

        for b in budgets:
            category = self.db.query(Category).filter(Category.id == b.category_id).first()
            results.append({
                "budget_id": b.id,
                "category_id": b.category_id,
                "category_name": category.name if category else "Unknown",
                "category_icon": category.icon if category else "wallet",
                "monthly_limit": b.monthly_limit,
                "period": b.period,
            })
        return results

    @logtime
    def get_goals(self) -> List[Goal]:
        """Returns all financial milestone goals."""
        return self._scoped_query(Goal).filter(Goal.status == "active").all()
