"""
Tests for Staged Transactions and Statement Review/Confirmation APIs.
Positive and Negative Test Cases.
"""

import uuid
from datetime import date, datetime

from src.models import StagedTransaction, SyncRun


def test_get_staged_transactions_positive(client, seed_user_and_accounts, db_session):
    """Positive: Fetch pending staged transactions created during a sync run."""
    user = seed_user_and_accounts["user"]

    sync_run = SyncRun(
        id=str(uuid.uuid4()),
        user_id=user.id,
        provider="statement_upload",
        status="completed",
        started_at=datetime.utcnow(),
    )
    db_session.add(sync_run)
    db_session.commit()

    staged_txn = StagedTransaction(
        id=str(uuid.uuid4()),
        user_id=user.id,
        sync_run_id=sync_run.id,
        amount=2500.0,
        currency="INR",
        transaction_date=date(2026, 8, 18),
        raw_description="UPI/SWIGGY/BANGALORE/1234",
        parsed_merchant="Swiggy",
        parsed_category="Food & Dining",
        confidence=0.95,
        status="pending_review",
        bank_name="HDFC Bank",
        account_number="1234",
        account_type="savings",
        is_duplicated=False,
    )
    db_session.add(staged_txn)
    db_session.commit()

    response = client.get("/api/v1/staged-transactions")
    assert response.status_code == 200
    data = response.json()
    assert data["total_pending"] >= 1
    staged_list = data["staged_transactions"]
    found = next((t for t in staged_list if t["staged_id"] == staged_txn.id), None)
    assert found is not None
    assert found["merchant"] == "Swiggy"
    assert found["amount"] == 2500.0


def test_confirm_staged_transaction_promote_positive(client, seed_user_and_accounts, db_session):
    """Positive: Confirming and approving a staged transaction promotes it to live ledger."""
    user = seed_user_and_accounts["user"]

    sync_run = SyncRun(
        id=str(uuid.uuid4()),
        user_id=user.id,
        provider="statement_upload",
        status="completed",
    )
    db_session.add(sync_run)
    db_session.commit()

    staged_txn = StagedTransaction(
        id=str(uuid.uuid4()),
        user_id=user.id,
        sync_run_id=sync_run.id,
        amount=1200.0,
        currency="INR",
        transaction_date=date(2026, 8, 19),
        raw_description="NETFLIX SUBSCRIPTION",
        parsed_merchant="Netflix",
        parsed_category="Bills & Utilities",
        confidence=0.98,
        status="pending_review",
        bank_name="HDFC Bank",
        account_number="1234",
        account_type="savings",
        is_duplicated=False,
    )
    db_session.add(staged_txn)
    db_session.commit()

    confirm_payload = {
        "reviewed_transactions": [
            {
                "staged_id": staged_txn.id,
                "user_action": "accept",
                "final_category": "Food & Dining",
                "date": "2026-08-19",
                "merchant": "Netflix",
                "amount": 1200.0,
                "description": "Netflix Monthly Subscription",
                "bank_name": "HDFC Bank",
                "account_number": "1234",
                "account_type": "savings",
            }
        ],
        "reviewed_holdings": [],
    }
    response = client.post("/api/v1/confirm-staged-transactions", json=confirm_payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "success"
    assert res_data["promoted_transactions"] == 1


def test_confirm_staged_transaction_skip_positive(client, seed_user_and_accounts, db_session):
    """Positive: Skipping a duplicate or unwanted staged transaction marks it discarded."""
    user = seed_user_and_accounts["user"]
    sync_run = SyncRun(id=str(uuid.uuid4()), user_id=user.id, provider="statement_upload")
    db_session.add(sync_run)
    db_session.commit()

    staged_txn = StagedTransaction(
        id=str(uuid.uuid4()),
        user_id=user.id,
        sync_run_id=sync_run.id,
        amount=99.0,
        transaction_date=date(2026, 8, 19),
        raw_description="TEST DUPLICATE",
        status="pending_review",
        bank_name="HDFC Bank",
        account_number="1234",
        account_type="savings",
    )
    db_session.add(staged_txn)
    db_session.commit()

    confirm_payload = {
        "reviewed_transactions": [
            {
                "staged_id": staged_txn.id,
                "user_action": "skip",
            }
        ]
    }
    response = client.post("/api/v1/confirm-staged-transactions", json=confirm_payload)
    assert response.status_code == 200
    assert response.json()["discarded_transactions"] == 1


def test_confirm_staged_empty_list_positive(client, seed_user_and_accounts):
    """Positive: Submitting empty lists to confirm endpoint completes safely with 0 promoted."""
    confirm_payload = {
        "reviewed_transactions": [],
        "reviewed_holdings": [],
    }
    response = client.post("/api/v1/confirm-staged-transactions", json=confirm_payload)
    assert response.status_code == 200
    assert response.json()["promoted_transactions"] == 0


def test_confirm_staged_invalid_payload_negative(client):
    """Negative: Submitting malformed payload with string instead of list returns 422."""
    bad_payload = {"reviewed_transactions": "invalid-non-list"}
    response = client.post("/api/v1/confirm-staged-transactions", json=bad_payload)
    assert response.status_code == 422
