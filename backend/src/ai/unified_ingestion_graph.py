import hashlib
import json
import logging
import os
import uuid
from datetime import datetime, date
from typing import List

import openpyxl
from json_repair import repair_json
from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, START, END

from src.ai.prompts import *
from src.ai.state import UnifiedIngestionState
from src.database import SessionLocal
from src.models import (
    TransactionFingerprintSource,
    Category,
    StagedTransaction,
    SyncRun,
    StagedHolding,
    Account,
    Transaction,
    PortfolioHolding,
    Institution,
    MarketPriceCache,
)


@logtime
def parse_bank_statement_node(state: UnifiedIngestionState) -> dict:
    """
    Parses bank statements.
    If state['skip_staging'] is True, commits transactions directly to the live ledger (with auto-dedup & categorization).
    Otherwise, stages the transactions for human-in-the-loop review.
    """
    data = []
    db = SessionLocal()
    skip_staging = state.get("skip_staging", False)
    user_id = state.get("user_id", "default-user")

    try:
        categories = {c.name.lower(): c.id for c in db.query(Category).filter_by(user_id=user_id).all()}
        if not categories:
            categories = {c.name.lower(): c.id for c in db.query(Category).all()}
        default_cat_id = list(categories.values())[0] if categories else None

        # Resolve or create default fallback account
        default_acc = db.query(Account).filter_by(id=state.get("account_id")).first() if state.get("account_id") else None
        if not default_acc:
            default_acc = db.query(Account).filter_by(user_id=user_id).first()

        sync_run = SyncRun(
            id=state.get("batch_id") or str(uuid.uuid4()),
            user_id=user_id,
            provider="direct_ingestion" if skip_staging else "statement_upload",
            status="running",
        )
        db.add(sync_run)
        db.flush()

        committed_count = 0
        duplicates_count = 0

        for txn in state.get("extracted_transactions", []):
            is_duplicated = False
            amount = float(txn.get("amount") or 0.0)
            date_str = str(txn.get("date") or date.today().strftime("%Y-%m-%d"))
            merchant = str(txn.get("merchant") or "Unknown").strip()
            raw_description = str(txn.get("description") or merchant)
            cat_name = str(txn.get("category") or "Other Expenses").strip()
            cat_lower = cat_name.lower()
            txn_type = str(txn.get("txn_type") or "debit").lower()
            bank_name = str(txn.get("bank_name") or "Bank Account").strip()
            account_number = str(txn.get("account_number") or "Monthly Ledger").strip()
            account_type = str(txn.get("account_type") or "savings").lower()

            date_obj = parse_date(date_str) or date.today()

            # Dynamic Account Resolution
            target_acc = default_acc
            if not target_acc or bank_name != "Unknown":
                inst = db.query(Institution).filter_by(user_id=user_id, name=bank_name).first()
                if not inst:
                    inst = Institution(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        name=bank_name,
                        institution_type="bank",
                        created_at=datetime.utcnow(),
                    )
                    db.add(inst)
                    db.flush()

                target_acc = db.query(Account).filter(
                    Account.user_id == user_id,
                    Account.institution_id == inst.id,
                    (Account.account_number_masked == account_number) | (Account.account_name == f"{bank_name} ({account_number})"),
                ).first()
                if not target_acc:
                    target_acc = Account(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        institution_id=inst.id,
                        account_type=account_type if account_type in ["savings", "current", "credit_card", "cash"] else "savings",
                        account_name=f"{bank_name} ({account_number})",
                        account_number_masked=account_number,
                        currency="INR",
                        balance_snapshot=0.00,
                        created_at=datetime.utcnow(),
                    )
                    db.add(target_acc)
                    db.flush()

            acc_id = target_acc.id if target_acc else state.get("account_id")

            # Dynamic Category Resolution
            if cat_lower not in categories:
                new_cat = Category(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    name=cat_name,
                    icon="tag",
                    category_type="expense",
                    is_system=False,
                    created_at=datetime.utcnow(),
                )
                db.add(new_cat)
                db.flush()
                categories[cat_lower] = new_cat.id

            cat_id = categories.get(cat_lower, default_cat_id)

            # Check if this record is an Account Balance Snapshot
            is_balance_record = (
                txn_type == "balance"
                or cat_lower in ["balance", "account balance", "opening balance", "closing balance", "cleared balance"]
                or "balance" in merchant.lower()
                or "cleared balance" in raw_description.lower()
            )

            if is_balance_record and target_acc:
                txn_type = "balance"
                target_acc.balance_snapshot = amount
                target_acc.snapshot_at = date_obj

            # Deduplication Fingerprint (Layer 2)
            fp_merchant = merchant.lower() if merchant else "unknown"
            fp_str = f"{amount}_{date_str}_{fp_merchant}_{acc_id}"
            fp_hash = hashlib.sha256(fp_str.encode()).hexdigest()
            existing_fp = db.query(TransactionFingerprintSource).filter_by(fingerprint_hash=fp_hash).first()

            if existing_fp:
                is_duplicated = True
                duplicates_count += 1

            if skip_staging:
                # 🚀 DIRECT COMMIT MODE: Write directly to live 'transactions' table
                if not is_duplicated:
                    new_txn_id = str(uuid.uuid4())
                    live_txn = Transaction(
                        id=new_txn_id,
                        user_id=user_id,
                        account_id=acc_id,
                        category_id=cat_id,
                        amount=amount,
                        currency="INR",
                        transaction_date=date_obj,
                        description=raw_description,
                        txn_type=txn_type,
                        created_at=datetime.utcnow(),
                    )
                    db.add(live_txn)
                    db.flush()

                    # Upsert Fingerprint
                    fp_record = TransactionFingerprintSource(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        transaction_id=new_txn_id,
                        fingerprint_hash=fp_hash,
                        fingerprint_components={
                            "amount": amount,
                            "date": str(date_obj),
                            "merchant": merchant,
                            "account": target_acc.account_name if target_acc else "Default",
                        },
                        created_at=datetime.utcnow(),
                    )
                    db.add(fp_record)
                    committed_count += 1
                else:
                    # Update existing fingerprint reference if needed
                    existing_fp.fingerprint_components = {
                        "amount": amount,
                        "date": str(date_obj),
                        "merchant": merchant,
                        "account": target_acc.account_name if target_acc else "Default",
                    }
            else:
                # 📋 STAGING REVIEW MODE: Write to 'staged_transactions' table
                stged_txn = {
                    "amount": amount,
                    "date_str": date_str,
                    "merchant": merchant,
                    "txn_type": txn_type,
                    "desc": raw_description,
                    "cat_name": cat_name,
                    "cat_id": cat_id,
                    "bank_name": bank_name,
                    "account_number": account_number,
                    "account_type": account_type,
                    "is_duplicated": is_duplicated,
                }
                data.append(stged_txn)

                staged_row = StagedTransaction(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    sync_run_id=sync_run.id,
                    email_source_id=None,
                    amount=amount,
                    transaction_date=date_obj,
                    raw_description=raw_description,
                    parsed_merchant=merchant,
                    parsed_category=cat_name,
                    confidence=0.95,
                    llm_raw_output=json.dumps(state.get("extracted_transactions", [])),
                    validation_errors={},
                    bank_name=bank_name,
                    account_number=account_number,
                    account_type=account_type,
                    is_duplicated=is_duplicated,
                )
                db.add(staged_row)

        sync_run.status = "completed"
        sync_run.items_found = len(state.get("extracted_transactions", []))
        sync_run.txns_staged = len(data)
        sync_run.txns_promoted = committed_count
        sync_run.completed_at = datetime.utcnow()
        db.commit()

        if skip_staging:
            logger.info(f"Direct Commit (Skipped Staging): Ingested {committed_count} live transactions ({duplicates_count} duplicates skipped).")
        else:
            logger.info(f"Staged {len(data)} transactions for user review ({duplicates_count} duplicates flagged).")

    except Exception as e:
        db.rollback()
        logger.error(f"Error in parse_bank_statement_node: {e}")
        raise e
    finally:
        db.close()

    return {
        "staged_transactions": data,
        "committed_count": committed_count,
        "duplicates_count": duplicates_count,
        "skip_staging": skip_staging,
    }


@logtime
def parse_demat_statement_graph(state: UnifiedIngestionState) -> dict:
    """
    Parses demat statements.
    If state['skip_staging'] is True, commits holdings directly to the live portfolio (with auto-dedup).
    Otherwise, stages the holdings for review.
    """
    data = []
    db = SessionLocal()
    skip_staging = state.get("skip_staging", False)
    user_id = state.get("user_id", "default-user")

    try:
        sync_run = SyncRun(
            id=state.get("batch_id") or str(uuid.uuid4()),
            user_id=user_id,
            provider="direct_ingestion" if skip_staging else "statement_upload",
            status="running",
        )
        db.add(sync_run)
        db.flush()

        committed_count = 0

        for txn in state.get("extracted_transactions", []):
            symbol = str(txn.get("symbol") or "Unknown").upper().strip()
            exchange = str(txn.get("exchange") or "NSE").upper().strip()
            asset_class = str(txn.get("asset_class") or "equity").lower().strip()
            sector = str(txn.get("sector") or "General").strip()
            quantity = float(txn.get("quantity") or 0.0)
            avg_buy_price = float(txn.get("avg_buy_price") or 0.0)
            current_price = float(txn.get("current_price") or 0.0)
            account_number = str(txn.get("account_number") or "Demat Account").strip()
            broker = str(txn.get("broker") or "Zerodha").strip()

            if skip_staging:
                # 🚀 DIRECT COMMIT MODE: Write directly to 'portfolio_holdings' table
                broker_inst = db.query(Institution).filter_by(user_id=user_id, name=broker).first()
                if not broker_inst:
                    broker_inst = Institution(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        name=broker,
                        institution_type="broker",
                        created_at=datetime.utcnow(),
                    )
                    db.add(broker_inst)
                    db.flush()

                demat_acc = db.query(Account).filter_by(user_id=user_id, institution_id=broker_inst.id, account_type="demat").first()
                if not demat_acc:
                    demat_acc = Account(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        institution_id=broker_inst.id,
                        account_type="demat",
                        account_name=f"{broker} Demat ({account_number})",
                        account_number_masked=account_number,
                        currency="INR",
                        balance_snapshot=0.00,
                        created_at=datetime.utcnow(),
                    )
                    db.add(demat_acc)
                    db.flush()

                existing_holding = db.query(PortfolioHolding).filter_by(
                    user_id=user_id, symbol=symbol, exchange=exchange
                ).first()

                if existing_holding:
                    existing_holding.quantity = quantity
                    existing_holding.avg_buy_price = avg_buy_price
                    existing_holding.account_id = demat_acc.id
                    existing_holding.last_synced_at = datetime.utcnow()
                else:
                    db.add(PortfolioHolding(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        account_id=demat_acc.id,
                        symbol=symbol,
                        exchange=exchange,
                        asset_class=asset_class,
                        sector=sector,
                        quantity=quantity,
                        avg_buy_price=avg_buy_price,
                        last_synced_at=datetime.utcnow(),
                    ))

                if current_price > 0:
                    cache_item = db.query(MarketPriceCache).filter_by(symbol=symbol, exchange=exchange).first()
                    if cache_item:
                        cache_item.current_price = current_price
                        cache_item.fetched_at = datetime.utcnow()
                    else:
                        db.add(MarketPriceCache(
                            symbol=symbol,
                            exchange=exchange,
                            current_price=current_price,
                            fetched_at=datetime.utcnow(),
                        ))

                committed_count += 1
            else:
                # 📋 STAGING REVIEW MODE
                stged_txn = {
                    "symbol": symbol,
                    "exchange": exchange,
                    "asset_class": asset_class,
                    "sector": sector,
                    "quantity": quantity,
                    "avg_buy_price": avg_buy_price,
                    "current_price": current_price,
                    "account_number": account_number,
                    "broker": broker,
                }
                data.append(stged_txn)
                new_holding = StagedHolding(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    sync_run_id=sync_run.id,
                    symbol=symbol,
                    exchange=exchange,
                    asset_class=asset_class,
                    sector=sector,
                    quantity=quantity,
                    avg_buy_price=avg_buy_price,
                    current_price=current_price,
                    account_number=account_number,
                    broker=broker,
                    llm_raw_output=json.dumps(state.get("extracted_transactions", [])),
                )
                db.add(new_holding)

        sync_run.status = "completed"
        sync_run.items_found = len(state.get("extracted_transactions", []))
        sync_run.txns_staged = len(data)
        sync_run.txns_promoted = committed_count
        sync_run.completed_at = datetime.utcnow()
        db.commit()

        if skip_staging:
            logger.info(f"Direct Commit (Skipped Staging): Ingested {committed_count} portfolio holdings.")
        else:
            logger.info(f"Staged {len(data)} holdings for user review.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error saving demat holdings: {e}")
        raise e
    finally:
        db.close()

    return {
        "staged_holdings": data,
        "committed_count": committed_count,
        "skip_staging": skip_staging,
    }
from src.utils.date_parsers import parse_date
from src.utils.errors import InvalidDocumentUploadError
from src.utils.log_functions import logtime
from src.utils.pdf_extractor import extract_pdf_text_helper
from src.utils.temproary_log import get_file_name, check_for_old_record, read_from_file, delete_file
from src.utils.temproary_log import write_to_file

logger = logging.getLogger(__name__)

llm = ChatOllama(
    model="gemma2:2b",
    temperature=0,
    format="json"
)


@logtime
def extract_excel_node(state: UnifiedIngestionState) -> dict:
    """
    Extracts structured transactions directly from Excel (.xlsx/.xls) files.
    Auto-detects column headers regardless of naming conventions including:
    Date, Type (Outgoing/Incoming/Balance), Category, Party (To/From), Description, Amount (₹).
    """
    file_path = state["file_path"]
    logger.info(f"Reading Excel Ledger from: {file_path}")
    if file_path.split(".")[-1] not in ['xls', 'xlsx']:
        return state
    file_name = get_file_name(file_path)
    if check_for_old_record(file_name):
        return {"extracted_transactions": read_from_file(file_name)}

    try:
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active

        rows = list(sheet.iter_rows(values_only=True))
        if not rows or len(rows) < 2:
            return {"extracted_transactions": []}

        # Normalize header row
        headers = [str(h).lower().strip() if h is not None else "" for h in rows[0]]

        def find_col(candidates):
            for idx, h in enumerate(headers):
                if any(cand in h for cand in candidates):
                    return idx
            return None

        date_col = find_col(["date", "txn_date", "timestamp", "time"])
        type_col = find_col(["type", "txn_type", "transaction_type", "direction", "flow"])
        cat_col = find_col(["category", "tag", "expense_type"])
        party_col = find_col(["party", "to/from", "party (to/from)", "merchant", "payee", "beneficiary", "sender"])
        desc_col = find_col(["description", "narration", "particulars", "details", "notes", "title", "name"])
        amount_col = find_col(["amount", "amount (₹)", "amount(₹)", "amount (rs)", "total", "spent", "value", "price"])
        debit_col = find_col(["debit", "withdrawal", "dr", "outgoing"])
        credit_col = find_col(["credit", "deposit", "cr", "incoming"])
        bank_col = find_col(["bank",])
        account_number = find_col(["bank", "account", "source", "mode", "payment_method"])

        extracted = []

        for row in rows[1:]:
            if not any(row):
                continue

            # 1. Parse Date
            raw_date = row[date_col] if date_col is not None else ""
            if isinstance(raw_date, (datetime, date)):
                date_str = raw_date.strftime("%Y-%m-%d")
            elif raw_date:
                clean_dt_str = str(raw_date).strip()[:10]
                # Format conversion if DD/MM/YYYY or DD-MM-YYYY
                if "/" in clean_dt_str:
                    parts = clean_dt_str.split("/")
                    if len(parts) == 3 and len(parts[0]) <= 2 and len(parts[2]) == 4:
                        date_str = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                    else:
                        date_str = clean_dt_str
                elif "-" in clean_dt_str:
                    parts = clean_dt_str.split("-")
                    if len(parts) == 3 and len(parts[0]) <= 2 and len(parts[2]) == 4:
                        date_str = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                    else:
                        date_str = clean_dt_str
                else:
                    date_str = clean_dt_str
            else:
                date_str = str(datetime.today().date())

            # 2. Parse Party and Description
            party_val = str(row[party_col]).strip() if party_col is not None and row[party_col] else ""
            raw_desc = str(row[desc_col]).strip() if desc_col is not None and row[desc_col] else ""

            if party_val and raw_desc:
                full_description = f"{party_val} - {raw_desc}" if party_val.lower() not in raw_desc.lower() else raw_desc
                merchant_clean = party_val
            elif party_val:
                full_description = party_val
                merchant_clean = party_val
            elif raw_desc:
                full_description = raw_desc
                first_word = raw_desc.split()[0] if raw_desc else "Unknown"
                merchant_clean = first_word.replace("UPI/", "").replace("POS/", "").strip()
            else:
                full_description = "Transaction Entry"
                merchant_clean = "Unknown"

            # 3. Parse Amount & Transaction Type (Outgoing = Debit, Incoming = Credit, Balance = Balance)
            amount = 0.0
            txn_type = "debit"

            # Check dedicated Type column (Outgoing / Incoming / Balance)
            if type_col is not None and row[type_col]:
                type_str = str(row[type_col]).lower().strip()
                if any(w in type_str for w in ["out", "outgoing", "deb", "dr", "expense", "spend"]):
                    txn_type = "debit"
                elif any(w in type_str for w in ["in", "incoming", "cred", "cr", "income", "salary", "deposit"]):
                    txn_type = "credit"
                elif any(w in type_str for w in ["bal", "balance", "snapshot"]):
                    txn_type = "balance"

            if amount_col is not None and row[amount_col]:
                try:
                    val_str = str(row[amount_col]).replace(",", "").replace("₹", "").replace("$", "").replace("Rs.", "").replace("INR", "").strip()
                    val = float(val_str)
                    amount = abs(val)
                    if type_col is None:
                        txn_type = "credit" if val < 0 else "debit"
                except ValueError:
                    pass
            elif debit_col is not None and row[debit_col]:
                try:
                    amount = abs(float(str(row[debit_col]).replace(",", "").replace("₹", "").replace("$", "").strip()))
                    txn_type = "debit"
                except ValueError:
                    pass
            elif credit_col is not None and row[credit_col]:
                try:
                    amount = abs(float(str(row[credit_col]).replace(",", "").replace("₹", "").replace("$", "").strip()))
                    txn_type = "credit"
                except ValueError:
                    pass

            if amount == 0.0:
                continue

            # 4. Parse Category & Bank
            cat_val = str(row[cat_col]).strip() if cat_col is not None and row[cat_col] else "Other Expenses"
            bank_val = str(row[bank_col]).strip() if bank_col is not None and row[bank_col] else "Monthly Ledger"

            extracted.append({
                "date": date_str,
                "description": full_description,
                "merchant": merchant_clean if merchant_clean else "Unknown",
                "amount": amount,
                "txn_type": txn_type,
                "category": cat_val,
                "bank_name": bank_val,
                "account_number": "Monthly Ledger",
                "account_type": "savings",
            })

        logger.info(f"Successfully extracted {len(extracted)} transactions from Excel with headers: Date, Type, Category, Party, Description, Amount.")
        write_to_file(extracted, file_name)
        return {"extracted_transactions": extracted}

    except Exception as e:
        logger.error(f"Failed to parse Excel ledger {file_path}: {e}")
        return {"extracted_transactions": []}


@logtime
def extract_pdf_text_node(state: UnifiedIngestionState) -> dict:
    """
    This node is responsible for extracting text from PDF files.
    """
    logger.info(f"Extracting text from {state['file_path']}")
    chunks = extract_pdf_text_helper(state["file_path"])
    logger.info(f"Found {len(chunks)} chunks in {state['file_path']}")
    return {"raw_text_chunk": chunks}

@logtime
def get_database_grounding_context(user_id: str, statement_type: str = "bank_statement") -> dict:
    """Extracts a lightweight snapshot of the user's categories, accounts, or portfolio holdings."""
    db = SessionLocal()
    try:
        if statement_type == "demat_statement":
            # 1. Known Demat Brokers & Accounts
            demat_accs = [
                f"{a.account_name} ({a.account_number_masked})"
                for a in db.query(Account).filter_by(user_id=user_id, account_type="demat").all()
            ]
            
            # 2. Existing Holdings & Sectors from Portfolio
            holdings = (
                db.query(PortfolioHolding.symbol, PortfolioHolding.sector, PortfolioHolding.asset_class)
                .filter_by(user_id=user_id)
                .all()
            )
            known_holdings = {h.symbol: f"{h.sector} ({h.asset_class})" for h in holdings if h.symbol}

            return {
                "valid_asset_classes": "equity, mutual_fund, etf, debt, gold",
                "known_brokers": ", ".join(demat_accs) if demat_accs else "Zerodha, Groww, AngelOne, Upstox",
                "known_holdings": json.dumps(known_holdings) if known_holdings else "None registered yet",
            }
        else:
            # 1. Available Categories
            cats = [c.name for c in db.query(Category).filter_by(user_id=user_id).all()]

            # 2. Known Accounts
            accs = [
                f"{a.account_name} ({a.account_number_masked})"
                for a in db.query(Account).filter_by(user_id=user_id).all()
            ]

            # 3. Top 20 Known Merchants from past transactions
            recent_txns = (
                db.query(Transaction.description, Category.name)
                .join(Category, Transaction.category_id == Category.id)
                .filter(Transaction.user_id == user_id)
                .limit(20)
                .all()
            )
            known_merchants = {desc.split()[0].upper(): cat_name for desc, cat_name in recent_txns if desc}

            return {
                "available_categories": ", ".join(cats),
                "known_accounts": ", ".join(accs) if accs else "None registered yet",
                "known_merchants": json.dumps(known_merchants) if known_merchants else "None yet",
            }
    finally:
        db.close()

@logtime
def parse_transactions_with_ollama_node(state: UnifiedIngestionState) -> dict:
    """"""
    data = []
    file_name = get_file_name(state["file_path"])
    if check_for_old_record(file_name):
        return {"extracted_transactions": read_from_file(file_name)}

    statement_type = state.get("statement_type", "bank_statement")
    if statement_type == "bank_statement":
        system_prompt = BANK_RECORD_SYSTEM_PROMPT
        human_prompt = BANK_RECORD_HUMAN_PROMPT
    elif statement_type == "demat_statement":
        system_prompt = DEMAT_RECORD_SYSTEM_PROMPT
        human_prompt = DEMAT_RECORD_HUMAN_PROMPT
    else:
        raise InvalidDocumentUploadError()

    grounding = get_database_grounding_context(state["user_id"], statement_type)
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", human_prompt),
    ])
    chain = prompt | llm

    for i in state["raw_text_chunk"]:
        invoke_payload = {**grounding, "context": i}
        response = chain.invoke(invoke_payload)
        content = response.content.strip()
        parsed = json.loads(repair_json(content))
        if isinstance(parsed, list):
            data.extend(parsed)
        elif isinstance(parsed, dict):
            for val in parsed.values():
                if isinstance(val, list):
                    data.extend(val)
                    break
            else:
                data.append(parsed)
    write_to_file(data, file_name)
    return {"extracted_transactions": data}


@logtime
def route_by_statement_type(state: UnifiedIngestionState) -> str:
    """Routes execution to Bank or Demat staging branch based on user selection."""
    if state.get("statement_type") == "demat_statement":
        return "demat_branch"
    return "bank_branch"


@logtime
def parse_bank_statement_node(state: UnifiedIngestionState) -> dict:
    """This Node parses the bank statements checks for duplicate transactions and stages the transactions for user review."""
    data = []
    db = SessionLocal()

    try:
        categories = {c.name.lower(): c.id for c in db.query(Category).all()}
        default_cat_id = db.query(Category).first().id
        sync_run = SyncRun(
            id=state.get("batch_id") or str(uuid.uuid4()),
            user_id=state["user_id"],
            provider="statement_upload",
            status="running",
        )
        db.add(sync_run)
        db.flush()
        for txn in state["extracted_transactions"]:
            is_duplicated = False
            amount = float(txn.get("amount") or 0.0)
            date_str = str(txn.get("date") or datetime.date().today().strftime("%d-%m-%Y"))
            merchant = str(txn.get("merchant") or "Unknown").strip()
            raw_description = str(txn.get("description") or merchant)
            cat_name = str(txn.get("category") or "Other Expenses").lower()
            cat_id = str(categories.get(cat_name.lower()) or default_cat_id)
            txn_type = str(txn.get("txn_type") or "Unknown")
            bank_name = str(txn.get("bank_name") or "Unknown")
            account_number = str(txn.get("account_number") or "Unknown")
            account_type = str(txn.get("account_type") or "Unknown")
            fp_str = f"{amount}_{date_str}_{merchant.lower()}_{state['account_id']}"
            fp_hash = hashlib.sha256(fp_str.encode()).hexdigest()
            existing = db.query(TransactionFingerprintSource).filter_by(fingerprint_hash=fp_hash).first()
            date_obj = parse_date(date_str)
            if existing:
                is_duplicated = True
            stged_txn = {
                "amount": amount,
                "date_str": date_str,
                "merchant": merchant,
                "txn_type": txn_type,
                "desc": raw_description,
                "cat_name": cat_name,
                "cat_id": cat_id,
                "bank_name": bank_name,
                "account_number": account_number,
                "account_type": account_type,
                "is_duplicated": is_duplicated
            }
            data.append(stged_txn)
            try:
                new_txn = StagedTransaction(
                    id=str(uuid.uuid4()),
                    user_id=state["user_id"],
                    sync_run_id=sync_run.id,
                    email_source_id=None,
                    amount=amount,
                    transaction_date=date_obj,
                    raw_description=raw_description,
                    parsed_merchant=merchant,
                    parsed_category=cat_name,
                    confidence=None,
                    llm_raw_output=json.dumps(state["extracted_transactions"]),
                    validation_errors={},
                    bank_name=bank_name,
                    account_number=account_number,
                    account_type=account_type,
                    is_duplicated=is_duplicated,
                )
                db.add(new_txn)
            except Exception as e:
                db.rollback()
                import traceback
                logger.error(f"Failed to Save Staged Transaction {e}: {traceback.format_exc()}")
                raise e
        sync_run.status = "completed"
        sync_run.items_found = len(state["extracted_transactions"])
        sync_run.txns_staged = len(data)
        sync_run.completed_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error fetching the data from categories: {e}")
        raise e
    finally:
        db.close()
    return {"staged_transactions": data}


@logtime
def parse_demat_statement_graph(state: UnifiedIngestionState) -> List[StagedTransaction]:
    """This Statement Parses Data from demat statement graph"""
    data = []
    db = SessionLocal()

    try:
        sync_run = SyncRun(
            id=state.get("batch_id") or str(uuid.uuid4()),
            user_id=state["user_id"],
            provider="statement_upload",
            status="running",
        )
        db.add(sync_run)
        db.flush()
        for txn in state["extracted_transactions"]:
            symbol = str(txn.get("symbol") or "Unknown")
            exchange = str(txn.get("exchange") or "Unknown")
            asset_class = str(txn.get("asset_class") or "Unknown")
            sector = str(txn.get("sector") or "Unknown")
            quantity = float(txn.get("quantity") or 0.0)
            avg_buy_price = float(txn.get("avg_buy_price") or 0.0)
            current_price = float(txn.get("current_price") or 0.0)
            account_number = str(txn.get("account_number") or "Unknown")
            broker = str(txn.get("broker") or "Unknown")
            stged_txn = {
                "symbol": symbol,
                "exchange": exchange,
                "asset_class": asset_class,
                "sector": sector,
                "quantity": quantity,
                "avg_buy_price": avg_buy_price,
                "current_price": current_price,
                "account_number": account_number,
                "broker": broker,
            }
            data.append(stged_txn)
            new_holding = StagedHolding(
                id=str(uuid.uuid4()),
                user_id=state["user_id"],
                sync_run_id=sync_run.id,
                symbol=symbol,
                exchange=exchange,
                asset_class=asset_class,
                sector=sector,
                quantity=quantity,
                avg_buy_price=avg_buy_price,
                current_price=current_price,
                account_number=account_number,
                broker=broker,
                llm_raw_output=json.dumps(state["extracted_transactions"])
            )
            db.add(new_holding)
            db.flush()
        sync_run.status = "completed"
        sync_run.items_found = len(state["extracted_transactions"])
        sync_run.txns_staged = len(data)
        sync_run.completed_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving staged transactions: {e}")
        raise e
    finally:
        db.close()
    return {"staged_transactions": data}


@logtime
def route_by_file_type(state: UnifiedIngestionState) -> str:
    """Routes execution to PDF extractor or Excel parser based on file extension."""
    file_path = state.get("file_path", "").lower()
    if file_path.endswith(".xlsx") or file_path.endswith(".xls") or file_path.endswith(".csv"):
        return "excel_branch"
    return "pdf_branch"


@logtime
def create_unified_ingestion_graph():
    """Builds and compiles the Unified Ingestion Graph with PDF, Excel, and Multi-Branch Routing."""
    workflow = StateGraph(UnifiedIngestionState)

    # 1. Add all nodes
    workflow.add_node("extract_pdf", extract_pdf_text_node)
    workflow.add_node("extract_excel", extract_excel_node)
    workflow.add_node("parse_ollama", parse_transactions_with_ollama_node)
    workflow.add_node("stage_bank", parse_bank_statement_node)
    workflow.add_node("stage_demat", parse_demat_statement_graph)

    # 2. 🔀 Add Conditional Routing from START: Route PDF vs Excel
    workflow.add_conditional_edges(
        START,
        route_by_file_type,
        {
            "pdf_branch": "extract_pdf",
            "excel_branch": "extract_excel",
        }
    )

    # 3. Connect PDF extractor to Ollama parser
    workflow.add_edge("extract_pdf", "parse_ollama")

    # 4. 🔀 Conditional Edge from parse_ollama & extract_excel -> Staging nodes
    workflow.add_conditional_edges(
        "parse_ollama",
        route_by_statement_type,
        {
            "bank_branch": "stage_bank",
            "demat_branch": "stage_demat",
        }
    )
    workflow.add_conditional_edges(
        "extract_excel",
        route_by_statement_type,
        {
            "bank_branch": "stage_bank",
            "demat_branch": "stage_demat",
        }
    )

    # 5. Connect staging nodes to END
    workflow.add_edge("stage_bank", END)
    workflow.add_edge("stage_demat", END)

    # 6. Return compiled graph
    return workflow.compile()


if __name__ == '__main__':
    from src.config import settings
    app = create_unified_ingestion_graph()
    
    # Process all available statements from configured directory
    stmt_dir = settings.FINANCIAL_STATEMENTS_DIR
    drive_ledger = settings.GOOGLE_DRIVE_LEDGER_PATH
    
    file_paths = {}
    if os.path.exists(drive_ledger):
        file_paths[drive_ledger] = "bank_statement"
        
    if os.path.exists(stmt_dir):
        for f in os.listdir(stmt_dir):
            if f.lower().endswith(".pdf"):
                file_paths[os.path.join(stmt_dir, f)] = "bank_statement"
    for file_path, statement_type in file_paths.items():
        app.invoke(
            {
                "file_path": file_path,
                "statement_type": statement_type,
                "account_id": "",
                "user_id": "aed69d0a-a260-4133-b028-320bb0c0d532",
                "batch_id": "",
                "raw_text_chunk": [],
                "extracted_transactions": [],
                "extracted_holdings": [],
                "staged_count": 0,
                "duplicates_count": 0,
                "errors": [],
            }
        )
