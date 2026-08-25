"""
Test configuration, database fixtures, and mocks for backend tests.
"""

import os
import sys
import uuid
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend root is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.pool import StaticPool

from src.database import Base, get_db
from src.main import app
from src.models import (
    Account,
    Category,
    Institution,
    Transaction,
    User,
)

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def engine():
    eng = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=eng)
    yield eng
    Base.metadata.drop_all(bind=eng)


@pytest.fixture(scope="function")
def db_session(engine):
    """Provides a fresh database session for each test function."""
    SessionTest = sessionmaker(bind=engine, autoflush=True, autocommit=False)
    session = SessionTest()
    yield session
    session.close()


@pytest.fixture(scope="function")
def seed_user_and_accounts(db_session):
    """Seeds a test user, institutions, accounts, and categories."""
    db_session.query(Transaction).delete()
    db_session.query(Account).delete()
    db_session.query(Institution).delete()
    db_session.query(Category).delete()
    db_session.query(User).delete()
    db_session.commit()

    user = User(
        id=str(uuid.uuid4()),
        email="testuser@local.finance",
        full_name="Test Investor",
        risk_profile="moderate",
        base_currency="INR",
        monthly_salary=150000.0,
        created_at=datetime.utcnow(),
    )
    db_session.add(user)
    db_session.commit()

    inst_bank = Institution(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name="HDFC Bank",
        institution_type="bank",
        is_active=True,
        created_at=datetime.utcnow(),
    )
    inst_broker = Institution(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name="Zerodha",
        institution_type="broker",
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db_session.add_all([inst_bank, inst_broker])
    db_session.commit()

    acc_savings = Account(
        id=str(uuid.uuid4()),
        user_id=user.id,
        institution_id=inst_bank.id,
        account_type="savings",
        account_name="HDFC Salary Account",
        currency="INR",
        balance_snapshot=250000.0,
        snapshot_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    acc_demat = Account(
        id=str(uuid.uuid4()),
        user_id=user.id,
        institution_id=inst_broker.id,
        account_type="demat",
        account_name="Zerodha Demat",
        currency="INR",
        balance_snapshot=500000.0,
        snapshot_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db_session.add_all([acc_savings, acc_demat])
    db_session.commit()

    # Categories
    cat_salary = Category(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name="Salary & Income",
        icon="wallet",
        category_type="income",
        is_system=True,
        created_at=datetime.utcnow(),
    )
    cat_dining = Category(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name="Food & Dining",
        icon="utensils",
        category_type="expense",
        is_system=True,
        created_at=datetime.utcnow(),
    )
    cat_rent = Category(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name="Housing & Rent",
        icon="home",
        category_type="expense",
        is_system=True,
        created_at=datetime.utcnow(),
    )
    cat_invest = Category(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name="Investments & Demat",
        icon="trending-up",
        category_type="investment",
        is_system=True,
        created_at=datetime.utcnow(),
    )
    db_session.add_all([cat_salary, cat_dining, cat_rent, cat_invest])
    db_session.commit()

    return {
        "user": user,
        "inst_bank": inst_bank,
        "inst_broker": inst_broker,
        "acc_savings": acc_savings,
        "acc_demat": acc_demat,
        "cat_salary": cat_salary,
        "cat_dining": cat_dining,
        "cat_rent": cat_rent,
        "cat_invest": cat_invest,
    }


@pytest.fixture(scope="function")
def client(engine, db_session):
    """FastAPI TestClient with overridden get_db dependency and mocked SessionLocal."""
    SessionTest = sessionmaker(bind=engine, autoflush=True, autocommit=False)

    def _override_get_db():
        s = SessionTest()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = _override_get_db

    import src.database as db_mod
    import src.main as main_mod

    orig_main_session = main_mod.SessionLocal
    orig_db_session = db_mod.SessionLocal
    main_mod.SessionLocal = SessionTest
    db_mod.SessionLocal = SessionTest

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    main_mod.SessionLocal = orig_main_session
    db_mod.SessionLocal = orig_db_session
