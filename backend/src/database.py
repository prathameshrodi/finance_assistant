from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from src.config import settings
from src.utils.log_functions import logtime

# Configure SQLite or PostgreSQL engine
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 30}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

@logtime
def get_db():
    """FastAPI Dependency for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@logtime
def init_db():
    """Initializes all database tables and seeds default records."""
    import src.models  # noqa: F401 - Discover all models
    Base.metadata.create_all(bind=engine)
    seed_default_data()

@logtime
def seed_default_data():
    """Seeds default user and baseline categories if empty."""
    from src.models import User, Category, Account, Institution
    import uuid
    from datetime import datetime

    db: Session = SessionLocal()
    try:
        # Check if default user exists
        user = db.query(User).first()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email="user@local.finance",
                full_name="Primary Investor",
                risk_profile="moderate",
                base_currency="INR",
                monthly_salary=100000.00,
                created_at=datetime.utcnow()
            )
            db.add(user)
            db.commit()
            db.refresh(user)

                # Seed Default Categories
            default_categories = [
                {"name": "Salary & Income", "icon": "wallet", "type": "income", "is_system": True},
                {"name": "Housing & Rent", "icon": "home", "type": "expense", "is_system": True},
                {"name": "Food & Dining", "icon": "utensils", "type": "expense", "is_system": True},
                {"name": "Bills & Utilities", "icon": "zap", "type": "expense", "is_system": True},
                {"name": "Shopping & Discretionary", "icon": "shopping-bag", "type": "expense", "is_system": True},
                {"name": "Transportation", "icon": "car", "type": "expense", "is_system": True},
                {"name": "Healthcare", "icon": "heart-pulse", "type": "expense", "is_system": True},
                {"name": "Investments & Demat", "icon": "trending-up", "type": "investment", "is_system": True},
                {"name": "Transfers", "icon": "arrow-left-right", "type": "transfer", "is_system": True},
                {"name": "Other Expenses", "icon": "more-horizontal", "type": "expense", "is_system": True},
            ]

            for cat_data in default_categories:
                cat = Category(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    name=cat_data["name"],
                    icon=cat_data["icon"],
                    category_type=cat_data["type"],
                    is_system=cat_data["is_system"],
                    created_at=datetime.utcnow()
                )
                db.add(cat)

            # Seed Default Institutions & Accounts
            inst_bank = Institution(
                id=str(uuid.uuid4()),
                user_id=user.id,
                name="Primary Bank",
                institution_type="bank",
                is_active=True,
                created_at=datetime.utcnow()
            )
            inst_broker = Institution(
                id=str(uuid.uuid4()),
                user_id=user.id,
                name="Zerodha",
                institution_type="broker",
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(inst_bank)
            db.add(inst_broker)
            db.commit()

            acc_salary = Account(
                id=str(uuid.uuid4()),
                user_id=user.id,
                institution_id=inst_bank.id,
                account_type="savings",
                account_name="Primary Savings A/C",
                currency="INR",
                balance_snapshot=320000.00,
                snapshot_at=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            acc_demat = Account(
                id=str(uuid.uuid4()),
                user_id=user.id,
                institution_id=inst_broker.id,
                account_type="demat",
                account_name="Zerodha Demat Account",
                currency="INR",
                balance_snapshot=0.00,
                snapshot_at=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            db.add(acc_salary)
            db.add(acc_demat)
            db.commit()

    finally:
        db.close()

if __name__ == '__main__':
    seed_default_data()