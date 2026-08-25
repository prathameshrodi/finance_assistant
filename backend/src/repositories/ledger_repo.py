import calendar
from datetime import date

from sqlalchemy import func

from src.models import Category, Transaction
from src.repositories.base import BaseRepository
from src.utils.log_functions import logtime


class LedgerRepository(BaseRepository):
    @logtime
    def get_spending_by_category(self, start_date: date, end_date: date) -> list[dict]:
        """

        :param start_date:
        :param end_date:
        :return:
        """
        spending = (
            self.db.query(
                Category.name.label("category"),
                Category.icon.label("icon"),
                func.sum(Transaction.amount).label("total_spent"),
                func.count(Transaction.id).label("txn_count"),
            )
            .join(Category, Transaction.category_id == Category.id)
            .filter(
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
                Transaction.user_id == self.user_id,
                Transaction.txn_type == "debit",
            )
            .group_by(Category.name, Category.icon)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )
        return [
            {
                "category": row.category,
                "icon": row.icon,
                "total_spent": float(row.total_spent or 0.0),
                "txn_count": int(row.txn_count),
            }
            for row in spending
        ]

    @logtime
    def get_monthly_burn_rate(self, year: int, month: int) -> dict:
        """

        :param year:
        :param month:
        :return:
        """
        num_days_in_month = calendar.monthrange(year, month)[-1]
        start_date = date(year, month, 1)
        end_date = date(year, month, num_days_in_month)

        result = (
            self.db.query(func.sum(Transaction.amount).label("total"), func.count(Transaction.id).label("count"))
            .filter(
                Transaction.user_id == self.user_id,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
                Transaction.txn_type == "debit",
            )
            .first()
        )
        today = date.today()
        if year == today.year and month == today.month:
            days_elapsed = max(today.day, 1)
        else:
            days_elapsed = num_days_in_month
        total_spent = float(result.total or 0.0)
        txn_count = int(result.count or 0)
        daily_average = round(total_spent / days_elapsed, 2)
        projected_month_end = round(daily_average * num_days_in_month, 2)

        return {
            "year": year,
            "month": month,
            "total_spent": total_spent,
            "txn_count": txn_count,
            "transaction_count": txn_count,
            "days_elapsed": days_elapsed,
            "days_in_month": num_days_in_month,
            "daily_burn_rate": daily_average,
            "projected_month_end_spend": projected_month_end,
        }

    @logtime
    def get_recent_transactions(self, limit: int = 10) -> list[Transaction]:
        """

        :param limit:
        :return:
        """
        return self._scoped_query(Transaction).order_by(Transaction.transaction_date.desc()).limit(limit).all()
