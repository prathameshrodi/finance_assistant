import os
import sys
import uuid
import hashlib
import openpyxl
from datetime import datetime, date

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.database import SessionLocal
from src.models import (
    User,
    Institution,
    Account,
    Category,
    Transaction,
    TransactionFingerprintSource,
    StagedTransaction,
    SyncRun,
)

def reset_and_load_golden_truth():
    excel_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "consolidated_preview.xlsx"))
    print("==================================================================")
    print("🚀 GOLDEN TRUTH TRANSACTION INGESTION PIPELINE")
    print(f"Reading from: {excel_path}")
    print("==================================================================")

    if not os.path.exists(excel_path):
        print(f"ERROR: Golden truth file not found at {excel_path}")
        return

    wb = openpyxl.load_workbook(excel_path, data_only=True)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))

    if not rows or len(rows) < 2:
        print("ERROR: No data rows found in spreadsheet.")
        return

    headers = [str(h).strip() if h is not None else "" for h in rows[0]]
    print(f"Columns: {headers}")

    col_idx = {h: idx for idx, h in enumerate(headers)}
    date_col = col_idx.get("Date", 0)
    type_col = col_idx.get("Type", 1)
    cat_col = col_idx.get("Category", 2)
    party_col = col_idx.get("Party (To/From)", 3)
    desc_col = col_idx.get("Description", 4)
    amount_col = col_idx.get("Amount", 5)
    acc_num_col = col_idx.get("Bank Account Number", 6)
    bank_name_col = col_idx.get("Bank Name", 7)
    balance_col = col_idx.get("Balance after Transaction", 8)

    db = SessionLocal()
    try:
        # 1. Ensure User Record
        user = db.query(User).first()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email="user@finance.ai",
                name="Prathamesh",
                full_name="Prathamesh",
                base_currency="INR",
                monthly_salary=100000.0,
                created_at=datetime.utcnow(),
            )
            db.add(user)
            db.flush()
            print(f"Initialized user: {user.name} ({user.id})")

        user_id = user.id

        # 2. Identify "Central Bank of India" Accounts to PRESERVE
        cbi_accounts = (
            db.query(Account)
            .join(Institution, Account.institution_id == Institution.id, isouter=True)
            .filter(
                (Institution.name.ilike("%central bank%"))
                | (Account.account_name.ilike("%central bank%"))
            )
            .all()
        )
        cbi_account_ids = {a.id for a in cbi_accounts}
        print(f"Preserving Central Bank of India account IDs: {cbi_account_ids}")

        # 3. Clean up non-CBI transactions
        preserved_txns_count = db.query(Transaction).filter(Transaction.account_id.in_(cbi_account_ids)).count() if cbi_account_ids else 0
        deleted_txns = (
            db.query(Transaction)
            .filter(~Transaction.account_id.in_(cbi_account_ids) if cbi_account_ids else True)
            .delete(synchronize_session=False)
        )
        deleted_fp = (
            db.query(TransactionFingerprintSource)
            .filter(TransactionFingerprintSource.user_id == user_id)
            .delete(synchronize_session=False)
        )
        deleted_staged = (
            db.query(StagedTransaction)
            .filter(StagedTransaction.user_id == user_id)
            .delete(synchronize_session=False)
        )
        db.flush()
        print(f"🧹 Cleaned old database state:")
        print(f"   • Preserved Central Bank of India Transactions: {preserved_txns_count}")
        print(f"   • Purged other Transactions: {deleted_txns}")
        print(f"   • Purged old Fingerprints: {deleted_fp}")
        print(f"   • Purged unreviewed Staged items: {deleted_staged}")

        # 4. Cache / Seed Categories
        categories = {c.name.lower(): c for c in db.query(Category).filter_by(user_id=user_id).all()}
        institutions = {i.name.lower(): i for i in db.query(Institution).filter_by(user_id=user_id).all()}
        accounts = {}
        for a in db.query(Account).filter_by(user_id=user_id).all():
            accounts[(a.institution_id, (a.account_number_masked or "").lower())] = a
            accounts[(a.institution_id, a.account_name.lower())] = a

        # 5. Create Sync Run
        sync_run = SyncRun(
            id=str(uuid.uuid4()),
            user_id=user_id,
            provider="golden_truth_excel_load",
            status="running",
            started_at=datetime.utcnow(),
        )
        db.add(sync_run)
        db.flush()

        inserted_count = 0
        skipped_duplicates = 0
        latest_balances = {}  # acc_id -> (date, balance)

        total_rows = len(rows) - 1
        print(f"\n📥 Loading {total_rows} Golden Truth transactions...")

        for r_idx, row in enumerate(rows[1:], start=1):
            if not any(row):
                continue

            # A. Parse Date
            raw_date = row[date_col]
            if isinstance(raw_date, (datetime, date)):
                txn_date = raw_date.date() if isinstance(raw_date, datetime) else raw_date
            elif raw_date:
                try:
                    dt_str = str(raw_date).strip()[:10]
                    txn_date = datetime.strptime(dt_str, "%Y-%m-%d").date()
                except Exception:
                    txn_date = date.today()
            else:
                txn_date = date.today()

            # B. Parse Institution & Bank Account
            bank_name = str(row[bank_name_col]).strip() if bank_name_col is not None and row[bank_name_col] else "HDFC Bank"
            acc_num = str(row[acc_num_col]).strip() if acc_num_col is not None and row[acc_num_col] else "Primary Account"

            inst_key = bank_name.lower()
            if inst_key not in institutions:
                new_inst = Institution(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    name=bank_name,
                    institution_type="bank",
                    created_at=datetime.utcnow(),
                )
                db.add(new_inst)
                db.flush()
                institutions[inst_key] = new_inst

            inst = institutions[inst_key]

            acc_key = (inst.id, acc_num.lower())
            if acc_key not in accounts:
                new_acc = Account(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    institution_id=inst.id,
                    account_type="savings",
                    account_name=f"{bank_name} ({acc_num})",
                    account_number_masked=acc_num,
                    currency="INR",
                    balance_snapshot=0.00,
                    created_at=datetime.utcnow(),
                )
                db.add(new_acc)
                db.flush()
                accounts[acc_key] = new_acc
                accounts[(inst.id, new_acc.account_name.lower())] = new_acc

            acc = accounts[acc_key]

            # C. Parse Category
            raw_cat = str(row[cat_col]).strip() if cat_col is not None and row[cat_col] else "Other Expenses"
            cat_key = raw_cat.lower()
            if cat_key not in categories:
                new_cat = Category(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    name=raw_cat,
                    icon="tag",
                    category_type="income" if "income" in cat_key or "salary" in cat_key else "expense",
                    is_system=False,
                    created_at=datetime.utcnow(),
                )
                db.add(new_cat)
                db.flush()
                categories[cat_key] = new_cat

            cat = categories[cat_key]

            # D. Parse Party & Description
            party = str(row[party_col]).strip() if party_col is not None and row[party_col] else ""
            desc = str(row[desc_col]).strip() if desc_col is not None and row[desc_col] else ""

            if party and desc:
                full_desc = f"{party} - {desc}" if party.lower() not in desc.lower() else desc
                merchant_name = party
            elif party:
                full_desc = party
                merchant_name = party
            elif desc:
                full_desc = desc
                merchant_name = desc.split()[0] if desc else "Unknown"
            else:
                full_desc = "Bank Transaction"
                merchant_name = "Unknown"

            # E. Parse Amount & Type
            raw_type = str(row[type_col]).lower().strip() if type_col is not None and row[type_col] else "outgoing"
            if any(k in raw_type for k in ["out", "outgoing", "deb", "dr", "expense", "spend"]):
                txn_type = "debit"
            elif any(k in raw_type for k in ["inc", "incoming", "cred", "cr", "income", "salary", "deposit"]):
                txn_type = "credit"
            elif any(k in raw_type for k in ["bal", "balance", "snapshot"]):
                txn_type = "balance"
            else:
                txn_type = "debit"

            try:
                amt_str = str(row[amount_col]).replace(",", "").replace("₹", "").replace("$", "").replace("Rs.", "").strip()
                amt = abs(float(amt_str))
            except Exception:
                amt = 0.0

            if amt == 0.0:
                continue

            # F. Track Latest Balance Snapshot per Account
            if balance_col is not None and row[balance_col] is not None:
                try:
                    bal_val = float(str(row[balance_col]).replace(",", "").replace("₹", "").strip())
                    if acc.id not in latest_balances or txn_date >= latest_balances[acc.id][0]:
                        latest_balances[acc.id] = (txn_date, bal_val)
                except Exception:
                    pass

            # G. Deduplication Fingerprint (Unique per transaction)
            fp_raw = f"{amt}_{txn_date}_{merchant_name.lower()}_{desc[:35].lower()}_{acc.id}_{r_idx}"
            fp_hash = hashlib.sha256(fp_raw.encode()).hexdigest()

            new_txn_id = str(uuid.uuid4())
            new_txn = Transaction(
                id=new_txn_id,
                user_id=user_id,
                account_id=acc.id,
                category_id=cat.id,
                amount=amt,
                currency="INR",
                transaction_date=txn_date,
                description=full_desc,
                txn_type=txn_type,
                created_at=datetime.utcnow(),
            )
            db.add(new_txn)

            fp_record = TransactionFingerprintSource(
                id=str(uuid.uuid4()),
                user_id=user_id,
                transaction_id=new_txn_id,
                fingerprint_hash=fp_hash,
                fingerprint_components={
                    "amount": amt,
                    "date": str(txn_date),
                    "merchant": merchant_name,
                    "account": acc.account_name,
                },
                created_at=datetime.utcnow(),
            )
            db.add(fp_record)
            inserted_count += 1

            if r_idx % 1000 == 0:
                db.flush()
                print(f"   ⏳ Ingested {r_idx}/{total_rows} records...")

        # 6. Apply Latest Official Balance Snapshots to Accounts
        print("\n📈 Updating Account Balance Snapshots:")
        for acc_id, (snap_date, snap_bal) in latest_balances.items():
            acc_obj = db.query(Account).filter_by(id=acc_id).first()
            if acc_obj:
                acc_obj.balance_snapshot = snap_bal
                acc_obj.snapshot_at = snap_date
                print(f"   • {acc_obj.account_name}: ₹{snap_bal:,.2f} (as of {snap_date})")

        sync_run.status = "completed"
        sync_run.items_found = total_rows
        sync_run.txns_promoted = inserted_count
        sync_run.completed_at = datetime.utcnow()

        db.commit()
        print("\n==================================================================")
        print(f"✅ GOLDEN TRUTH LOAD COMPLETE!")
        print(f"   • Total Records Ingested: {inserted_count}")
        print(f"   • Total Active Categories: {len(categories)}")
        print(f"   • Total Bank Accounts: {len(accounts)}")
        print(f"   • Preserved CBI Records: {preserved_txns_count}")
        print("==================================================================\n")

    except Exception as e:
        db.rollback()
        print(f"❌ ERROR loading golden truth: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_load_golden_truth()
