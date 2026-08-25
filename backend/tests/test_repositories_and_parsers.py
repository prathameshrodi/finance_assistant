"""
Unit tests for database repositories and utility parsers.
Positive and Negative Test Cases.
"""

import uuid
from datetime import date

import pytest

from src.models import PortfolioHolding, Transaction
from src.repositories import LedgerRepository, PortfolioRepository
from src.utils.date_parsers import parse_date


def test_date_parser_positive():
    """Positive: Successfully parse dates across supported format strings."""
    dt1 = parse_date("2026-08-24")
    assert dt1.year == 2026 and dt1.month == 8 and dt1.day == 24

    dt2 = parse_date("24/08/2026")
    assert dt2.year == 2026 and dt2.month == 8 and dt2.day == 24

    dt3 = parse_date("August 24, 2026")
    assert dt3.year == 2026 and dt3.month == 8 and dt3.day == 24


def test_date_parser_negative():
    """Negative: Unparseable date strings raise ValueError."""
    with pytest.raises(ValueError):
        parse_date("invalid-date-string")


def test_ledger_repository_metrics_positive(db_session, seed_user_and_accounts):
    """Positive: LedgerRepository computes category spending and monthly burn correctly."""
    user = seed_user_and_accounts["user"]
    acc = seed_user_and_accounts["acc_savings"]
    cat = seed_user_and_accounts["cat_dining"]

    # Add 2 transactions in current month
    t1 = Transaction(
        id=str(uuid.uuid4()),
        user_id=user.id,
        account_id=acc.id,
        category_id=cat.id,
        amount=1500.0,
        txn_type="debit",
        transaction_date=date(2026, 8, 10),
        description="Restaurant A",
    )
    t2 = Transaction(
        id=str(uuid.uuid4()),
        user_id=user.id,
        account_id=acc.id,
        category_id=cat.id,
        amount=2500.0,
        txn_type="debit",
        transaction_date=date(2026, 8, 15),
        description="Restaurant B",
    )
    db_session.add_all([t1, t2])
    db_session.commit()

    repo = LedgerRepository(db_session, user.id)
    spending = repo.get_spending_by_category(date(2026, 8, 1), date(2026, 8, 31))
    assert len(spending) >= 1
    assert spending[0]["category"] == "Food & Dining"
    assert spending[0]["total_spent"] == 4000.0
    assert spending[0]["txn_count"] == 2

    burn = repo.get_monthly_burn_rate(2026, 8)
    assert burn["total_spent"] == 4000.0
    assert burn["txn_count"] == 2


def test_portfolio_repository_allocation_positive(db_session, seed_user_and_accounts):
    """Positive: PortfolioRepository calculates asset allocation percentages."""
    user = seed_user_and_accounts["user"]
    acc = seed_user_and_accounts["acc_demat"]

    h1 = PortfolioHolding(
        id=str(uuid.uuid4()),
        user_id=user.id,
        account_id=acc.id,
        symbol="INFY",
        exchange="NSE",
        asset_class="equity",
        quantity=10.0,
        avg_buy_price=1000.0,
    )
    db_session.add(h1)
    db_session.commit()

    repo = PortfolioRepository(db_session, user.id)
    total_val = repo.get_total_portfolio_value()
    assert total_val >= 10000.0
