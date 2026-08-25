"""
Tests for Settings and Accounts management APIs.
Positive and Negative Test Cases.
"""


def test_get_system_config_positive(client, seed_user_and_accounts):
    """Positive: Successfully fetch full system config with user profile and paths."""
    response = client.get("/api/v1/settings/config")
    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert "paths" in data
    assert "ai" in data
    assert data["user"]["email"] == "testuser@local.finance"
    assert data["user"]["base_currency"] == "INR"


def test_update_system_config_positive(client, seed_user_and_accounts):
    """Positive: Update user monthly salary and currency."""
    payload = {
        "name": "Updated Investor",
        "monthly_salary": 220000.0,
        "base_currency": "USD",
        "auto_sync_enabled": False,
    }
    response = client.post("/api/v1/settings/config", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify change persists
    get_resp = client.get("/api/v1/settings/config")
    assert get_resp.status_code == 200
    assert get_resp.json()["user"]["monthly_salary"] == 220000.0
    assert get_resp.json()["user"]["base_currency"] == "USD"


def test_list_user_accounts_positive(client, seed_user_and_accounts):
    """Positive: List all active bank and demat accounts."""
    response = client.get("/api/v1/settings/accounts")
    assert response.status_code == 200
    data = response.json()
    assert "accounts" in data
    assert len(data["accounts"]) >= 2
    acc_names = [a["account_name"] for a in data["accounts"]]
    assert "HDFC Salary Account" in acc_names


def test_create_and_update_account_positive(client, seed_user_and_accounts):
    """Positive: Create a new credit card account and then update its balance."""
    create_payload = {
        "institution_name": "ICICI Bank",
        "account_name": "ICICI Amazon Pay Credit Card",
        "account_number": "9876",
        "type": "credit_card",
        "currency": "INR",
        "current_balance": 15000.0,
    }
    create_resp = client.post("/api/v1/settings/accounts", json=create_payload)
    assert create_resp.status_code == 200
    assert create_resp.json()["status"] == "success"

    # Verify account was created
    acc_list = client.get("/api/v1/settings/accounts").json()["accounts"]
    new_acc = next((a for a in acc_list if a["account_name"] == "ICICI Amazon Pay Credit Card"), None)
    assert new_acc is not None
    assert new_acc["type"] == "credit_card"

    # Update account
    update_payload = {
        "id": new_acc["id"],
        "institution_name": "ICICI Bank",
        "account_name": "ICICI Amazon Pay Credit Card - Platinum",
        "account_number": "9876",
        "type": "credit_card",
        "currency": "INR",
        "current_balance": 25000.0,
    }
    update_resp = client.post("/api/v1/settings/accounts", json=update_payload)
    assert update_resp.status_code == 200

    # Delete the created account
    del_resp = client.delete(f"/api/v1/settings/accounts/{new_acc['id']}")
    assert del_resp.status_code == 200


def test_delete_nonexistent_account_negative(client, seed_user_and_accounts):
    """Negative: Attempting to delete non-existent account ID returns 404."""
    response = client.delete("/api/v1/settings/accounts/non-existent-account-id-12345")
    assert response.status_code == 404


def test_update_nonexistent_account_negative(client, seed_user_and_accounts):
    """Negative: Updating non-existent account returns 404."""
    payload = {
        "id": "non-existent-id-99999",
        "institution_name": "Fake Bank",
        "account_name": "Fake Account",
        "account_number": "0000",
        "type": "checking",
        "currency": "INR",
        "current_balance": 1000.0,
    }
    response = client.post("/api/v1/settings/accounts", json=payload)
    assert response.status_code == 404
