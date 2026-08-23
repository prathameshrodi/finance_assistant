"""Script to drop all tables in SQLite database EXCEPT the 'users' table, and recreate fresh tables."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import sqlite3
from src.config import settings
from src.database import engine, Base, init_db, SessionLocal
import src.models

def reset_all_except_user():
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if not os.path.isabs(db_path):
        db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", db_path))

    print(f"Connecting to SQLite database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Disable foreign key constraints temporarily during drop
        cursor.execute("PRAGMA foreign_keys = OFF;")

        # Get all table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [row[0] for row in cursor.fetchall()]

        dropped = []
        for table in tables:
            if table == "users":
                print("  [KEEPING] Table: users (preserved)")
                continue
            cursor.execute(f"DROP TABLE IF EXISTS \"{table}\";")
            dropped.append(table)

        conn.commit()
        print(f"\n[SUCCESS] Dropped {len(dropped)} tables:")
        for d in dropped:
            print(f"  - {d}")

    finally:
        cursor.execute("PRAGMA foreign_keys = ON;")
        conn.close()

    # Recreate all fresh tables from SQLAlchemy models
    print("\nRecreating fresh tables...")
    Base.metadata.create_all(bind=engine)
    
    # Re-seed default categories & accounts for the preserved user
    init_db()
    print("[SUCCESS] All tables recreated fresh! User data was preserved.")

if __name__ == "__main__":
    reset_all_except_user()
