import hashlib
import json
import logging
import re
import uuid
from typing import Any, TypedDict

from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama
from langgraph.graph import END, START, StateGraph
from pypdf import PdfReader

from src.database import SessionLocal
from src.models import Category, Transaction, TransactionFingerprintSource
from src.utils.date_parsers import parse_date
from src.utils.temproary_log import check_for_old_record, delete_file, get_file_name, read_from_file, write_to_file

logger = logging.getLogger(__name__)

llm = ChatOllama(model="gemma2:2b", temperature=0)
PROMPT = """
You are an expert Bank Statement Parser. 
Extract all financial transactions from the bank statement text below.
For each transaction, return a JSON object with:
- "date": "YYYY-MM-DD"
- "description": "Original raw description or narration"
- "merchant": "Clean merchant or counterparty name (e.g. Swiggy, Amazon, Salary, ATM)"
- "amount": float (positive number)
- "txn_type": "debit" or "credit"
- "category": "Food & Dining", "Bills & Utilities", "Salary & Income", "Shopping", "Transfers", or "Other Expenses"
Return ONLY a valid JSON array of objects.
"""


class StatementIngestionState(TypedDict):
    file_path: str
    account_id: str
    user_id: str
    raw_text_chunk: list[str]
    extracted_transactions: list[dict[str, Any]]
    promoted_transactions: list[dict[str, Any]]
    duplicated_transactions: list[dict[str, Any]]
    duplicated_skipped: int
    errors: list[str]


def extract_pdf_text_node(state: StatementIngestionState) -> dict:
    """"""

    reader = PdfReader(state["file_path"])
    chunks = []
    for page in reader.pages:
        text = page.extract_text()
        if text and len(text.strip()) > 0:
            chunks.append(text.strip())
    return {"raw_text_chunk": chunks}


def parse_transactions_with_ollama_node(state: StatementIngestionState) -> dict:
    """"""
    data = []
    file_name = get_file_name(state["file_path"])
    if check_for_old_record(file_name):
        return {"extracted_transactions": read_from_file(file_name)}
    prompt = ChatPromptTemplate.from_messages(
        [("system", PROMPT), ("human", "Extract all transactions from this bank statement page:\n\n{context}")]
    )
    chain = prompt | llm
    for i in state["raw_text_chunk"]:
        response = chain.invoke({"context": i})
        content = response.content.strip()
        try:
            json_match = re.search(r"\[.*\]", content, re.DOTALL)
            if json_match:
                parsed_list = json.loads(json_match.group(0))
                data.extend(parsed_list)
        except Exception as e:
            logger.error("JSON parsing error on statement chunk: %s", e)
    write_to_file(data, file_name)
    return {"extracted_transactions": data}


def dedup_and_commit_node(state: StatementIngestionState) -> dict:
    db = SessionLocal()
    promoted = []
    duplicated_transaction = []
    skipped = 0
    try:
        categories = {c.name.lower(): c.id for c in db.query(Category).all()}
        default_cat_id = db.query(Category).first().id
        for txn in state["extracted_transactions"]:
            try:
                amount = float(txn.get("amount", 0.0))
                date_str = str(txn.get("date", ""))
                merchant = str(txn.get("merchant", "Unknown")).strip()
                txn_type = str(txn.get("txn_type", "debit")).lower()
                desc = str(txn.get("description", merchant))
                cat_name = str(txn.get("category", "Other Expenses")).lower()
                cat_id = categories.get(cat_name, default_cat_id)
                # 1. Compute SHA-256 Fingerprint (Dedup Layer 2)
                fp_str = f"{amount}_{date_str}_{merchant.lower()}_{state['account_id']}"
                fp_hash = hashlib.sha256(fp_str.encode()).hexdigest()
                existing = db.query(TransactionFingerprintSource).filter_by(fingerprint_hash=fp_hash).first()
                if existing:
                    duplicated_transaction.append(txn)
                    skipped += 1
                    continue
                txn_date_obj = parse_date(date_str).date()
                new_txn = Transaction(
                    id=str(uuid.uuid4()),
                    user_id=state["user_id"],
                    account_id=state["account_id"],
                    category_id=cat_id,
                    amount=amount,
                    transaction_date=txn_date_obj,
                    description=desc,
                    txn_type=txn_type,
                )
                db.add(new_txn)
                db.flush()
                fp_record = TransactionFingerprintSource(
                    id=str(uuid.uuid4()),
                    user_id=state["user_id"],
                    transaction_id=new_txn.id,
                    fingerprint_hash=fp_hash,
                    fingerprint_components={"amount": amount, "date": date_str, "merchant": merchant},
                )
                db.add(fp_record)
                db.flush()
                promoted.append(txn)
            except Exception as e:
                logger.error("Error saving transaction %s: %s", txn, e)
                db.rollback()
        db.commit()
        file_name = get_file_name(state["file_path"])
        delete_file(file_name)
    except Exception as e:
        logger.exception("Unexpected error in dedup_and_commit_node: %s", e)
        db.rollback()
    finally:
        db.close()
    return {
        "promoted_transactions": promoted,
        "duplicated_skipped": skipped,
        "duplicated_transactions": duplicated_transaction,
    }


def bank_statement_upload_workflow():
    """"""
    workflow = StateGraph(StatementIngestionState)
    workflow.add_node("extract_pdf", extract_pdf_text_node)
    workflow.add_node("parse_ollama", parse_transactions_with_ollama_node)
    workflow.add_node("dedup_commit", dedup_and_commit_node)
    workflow.add_edge(START, "extract_pdf")
    workflow.add_edge("extract_pdf", "parse_ollama")
    workflow.add_edge("parse_ollama", "dedup_commit")
    workflow.add_edge("dedup_commit", END)
    return workflow.compile()
