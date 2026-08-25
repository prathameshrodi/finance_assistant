"""
Tests for Ledger Transactions API (CRUD, metadata, listing, error handling).
Positive and Negative Test Cases.
"""


def test_get_ledger_meta_positive(client, seed_user_and_accounts):
    """Positive: Successfully fetch accounts and categories for ledger metadata."""
    response = client.get("/api/v1/ledger/meta")
    assert response.status_code == 200
    data = response.json()
    assert "accounts" in data
    assert "categories" in data
    assert len(data["accounts"]) >= 2
    assert len(data["categories"]) >= 4


def test_list_transactions_empty_positive(client, seed_user_and_accounts):
    """Positive: Clean ledger returns empty list of transactions with total = 0."""
    response = client.get("/api/v1/ledger/transactions")
    assert response.status_code == 200
    data = response.json()
    assert data["transactions"] == []
    assert data["total"] == 0


def test_create_and_read_transaction_positive(client, seed_user_and_accounts):
    """Positive: Create a new expense transaction and verify it is returned in list."""
    acc = seed_user_and_accounts["acc_savings"]
    cat = seed_user_and_accounts["cat_dining"]

    payload = {
        "account_id": acc.id,
        "category_id": cat.id,
        "amount": 1450.0,
        "transaction_date": "2026-08-20",
        "description": "Team Dinner at Smokehouse Deli",
        "txn_type": "debit",
    }
    create_resp = client.post("/api/v1/ledger/transactions", json=payload)
    assert create_resp.status_code == 200
    res_data = create_resp.json()
    assert res_data["status"] == "success"
    txn_id = res_data["transaction_id"]

    # Verify transaction in list
    list_resp = client.get("/api/v1/ledger/transactions")
    assert list_resp.status_code == 200
    txns = list_resp.json()["transactions"]
    created_txn = next((t for t in txns if t["id"] == txn_id), None)
    assert created_txn is not None
    assert created_txn["amount"] == 1450.0
    assert created_txn["description"] == "Team Dinner at Smokehouse Deli"
    assert created_txn["txn_type"] == "debit"


def test_update_transaction_positive(client, seed_user_and_accounts):
    """Positive: Update existing transaction amount and description."""
    acc = seed_user_and_accounts["acc_savings"]
    cat = seed_user_and_accounts["cat_rent"]

    # First create
    create_payload = {
        "account_id": acc.id,
        "category_id": cat.id,
        "amount": 35000.0,
        "transaction_date": "2026-08-01",
        "description": "August Rent",
        "txn_type": "debit",
    }
    create_resp = client.post("/api/v1/ledger/transactions", json=create_payload)
    txn_id = create_resp.json()["transaction_id"]

    # Update
    update_payload = {
        "amount": 37000.0,
        "description": "August Rent + Maintenance",
    }
    update_resp = client.put(f"/api/v1/ledger/transactions/{txn_id}", json=update_payload)
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "success"

    # Verify update
    list_resp = client.get("/api/v1/ledger/transactions")
    updated_txn = next((t for t in list_resp.json()["transactions"] if t["id"] == txn_id), None)
    assert updated_txn["amount"] == 37000.0
    assert updated_txn["description"] == "August Rent + Maintenance"


def test_delete_transaction_positive(client, seed_user_and_accounts):
    """Positive: Delete a transaction and verify it is removed from ledger."""
    acc = seed_user_and_accounts["acc_savings"]
    cat = seed_user_and_accounts["cat_dining"]

    create_payload = {
        "account_id": acc.id,
        "category_id": cat.id,
        "amount": 500.0,
        "transaction_date": "2026-08-15",
        "description": "Coffee",
        "txn_type": "debit",
    }
    txn_id = client.post("/api/v1/ledger/transactions", json=create_payload).json()["transaction_id"]

    del_resp = client.delete(f"/api/v1/ledger/transactions/{txn_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "success"

    # Verify it is no longer listed
    list_resp = client.get("/api/v1/ledger/transactions")
    assert not any(t["id"] == txn_id for t in list_resp.json()["transactions"])


def test_update_nonexistent_transaction_negative(client, seed_user_and_accounts):
    """Negative: Attempting to update a non-existent transaction ID returns 404."""
    response = client.put("/api/v1/ledger/transactions/invalid-txn-id-9999", json={"amount": 100.0})
    assert response.status_code == 404


def test_delete_nonexistent_transaction_negative(client, seed_user_and_accounts):
    """Negative: Attempting to delete a non-existent transaction ID returns 404."""
    response = client.delete("/api/v1/ledger/transactions/invalid-txn-id-9999")
    assert response.status_code == 404


def test_create_transaction_invalid_date_negative(client, seed_user_and_accounts):
    """Negative: Creating a transaction with invalid date format returns 500/422."""
    acc = seed_user_and_accounts["acc_savings"]
    cat = seed_user_and_accounts["cat_dining"]
    bad_payload = {
        "account_id": acc.id,
        "category_id": cat.id,
        "amount": 500.0,
        "transaction_date": "invalid-date-format",
        "description": "Invalid Date Txn",
    }
    response = client.post("/api/v1/ledger/transactions", json=bad_payload)
    assert response.status_code in [422, 500]
