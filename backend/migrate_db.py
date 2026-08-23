"""Database table update and verification script."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.database import engine, Base, SessionLocal, init_db
import src.models  # Load all models: StagedHolding, StagedTransaction, PortfolioHolding, etc.
from sqlalchemy import inspect

def update_tables():
    print("Connecting to database and updating tables in 'finance.db'...")
    Base.metadata.create_all(bind=engine)
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print(f"\n[SUCCESS] Successfully synced {len(tables)} tables in SQLite database:")
    for t in sorted(tables):
        cols = [c["name"] for c in inspector.get_columns(t)]
        print(f"  - {t} ({len(cols)} columns)")
        
    db = SessionLocal()
    try:
        from src.models import User, Category, Account
        user_count = db.query(User).count()
        cat_count = db.query(Category).count()
        acc_count = db.query(Account).count()
        print(f"\nDatabase Records:")
        print(f"  - Users: {user_count}")
        print(f"  - Categories: {cat_count}")
        print(f"  - Accounts: {acc_count}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    update_tables()
