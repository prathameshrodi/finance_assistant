"""
Tests for Ledger Holdings (Portfolio) API.
Positive and Negative Test Cases.
"""


def test_list_holdings_empty_positive(client, seed_user_and_accounts):
    """Positive: Fetching holdings on clean ledger returns empty list with total = 0."""
    response = client.get("/api/v1/ledger/holdings")
    assert response.status_code == 200
    data = response.json()
    assert data["holdings"] == []
    assert data["total"] == 0


def test_create_and_list_holding_positive(client, seed_user_and_accounts):
    """Positive: Create a new stock holding and verify PnL and market value calculation."""
    acc = seed_user_and_accounts["acc_demat"]
    payload = {
        "account_id": acc.id,
        "symbol": "TCS.NS",
        "exchange": "NSE",
        "asset_class": "equity",
        "sector": "Information Technology",
        "quantity": 25.0,
        "avg_buy_price": 3800.0,
        "current_price": 4200.0,
    }
    create_resp = client.post("/api/v1/ledger/holdings", json=payload)
    assert create_resp.status_code == 200
    res_data = create_resp.json()
    assert res_data["status"] == "success"
    holding_id = res_data["holding_id"]

    # Verify holding in list
    list_resp = client.get("/api/v1/ledger/holdings")
    assert list_resp.status_code == 200
    holdings = list_resp.json()["holdings"]
    holding = next((h for h in holdings if h["id"] == holding_id), None)
    assert holding is not None
    assert holding["symbol"] == "TCS.NS"
    assert holding["quantity"] == 25.0
    assert holding["cost_basis"] == 95000.0  # 25 * 3800
    assert holding["current_value"] == 105000.0  # 25 * 4200
    assert holding["pnl_amount"] == 10000.0


def test_update_holding_positive(client, seed_user_and_accounts):
    """Positive: Update holding quantity and avg buy price."""
    acc = seed_user_and_accounts["acc_demat"]
    create_payload = {
        "account_id": acc.id,
        "symbol": "INFY.NS",
        "exchange": "NSE",
        "asset_class": "equity",
        "sector": "Information Technology",
        "quantity": 50.0,
        "avg_buy_price": 1500.0,
        "current_price": 1600.0,
    }
    holding_id = client.post("/api/v1/ledger/holdings", json=create_payload).json()["holding_id"]

    # Update
    update_payload = {
        "quantity": 100.0,
        "avg_buy_price": 1450.0,
        "current_price": 1650.0,
    }
    update_resp = client.put(f"/api/v1/ledger/holdings/{holding_id}", json=update_payload)
    assert update_resp.status_code == 200

    # Verify update
    list_resp = client.get("/api/v1/ledger/holdings")
    updated = next((h for h in list_resp.json()["holdings"] if h["id"] == holding_id), None)
    assert updated["quantity"] == 100.0
    assert updated["avg_buy_price"] == 1450.0
    assert updated["current_value"] == 165000.0


def test_delete_holding_positive(client, seed_user_and_accounts):
    """Positive: Delete holding removes it from list."""
    acc = seed_user_and_accounts["acc_demat"]
    create_payload = {
        "account_id": acc.id,
        "symbol": "RELIANCE.NS",
        "exchange": "NSE",
        "asset_class": "equity",
        "sector": "Energy",
        "quantity": 10.0,
        "avg_buy_price": 2800.0,
    }
    holding_id = client.post("/api/v1/ledger/holdings", json=create_payload).json()["holding_id"]

    del_resp = client.delete(f"/api/v1/ledger/holdings/{holding_id}")
    assert del_resp.status_code == 200

    list_resp = client.get("/api/v1/ledger/holdings")
    assert not any(h["id"] == holding_id for h in list_resp.json()["holdings"])


def test_update_nonexistent_holding_negative(client, seed_user_and_accounts):
    """Negative: Updating non-existent holding returns 404."""
    resp = client.put("/api/v1/ledger/holdings/nonexistent-holding-id", json={"quantity": 10})
    assert resp.status_code == 404


def test_delete_nonexistent_holding_negative(client, seed_user_and_accounts):
    """Negative: Deleting non-existent holding returns 404."""
    resp = client.delete("/api/v1/ledger/holdings/nonexistent-holding-id")
    assert resp.status_code == 404
