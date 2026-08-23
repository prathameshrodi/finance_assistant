"""Direct script to initialize and test the local SQLite database."""
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.database import init_db, SessionLocal
from src.models import User, Category, Account, Institution, Transaction

if __name__ == "__main__":
    print("Initializing SQLite database 'finance.db'...")
    init_db()
    
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        cat_count = db.query(Category).count()
        acc_count = db.query(Account).count()
        
        print("\n[SUCCESS] Database Tables Created Successfully in finance.db!")
        print(f"  * Users in DB: {user_count}")
        print(f"  * Categories Seeded: {cat_count}")
        print(f"  * Accounts Configured: {acc_count}")
        
        user = db.query(User).first()
        if user:
            print(f"\nDefault User: {user.full_name} ({user.email}) - Base Currency: {user.base_currency}")
            print(f"Monthly Salary Baseline: INR {user.monthly_salary:,.2f}")
    finally:
        db.close()
