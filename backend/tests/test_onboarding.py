"""
Tests for Onboarding status and setup completion flow.
Positive and Negative Test Cases.
"""


def test_onboarding_status_unonboarded_positive(client, db_session):
    """Positive: Clean DB with default/no user returns is_onboarded = False."""
    response = client.get("/api/v1/onboarding/status")
    assert response.status_code == 200
    data = response.json()
    assert data["is_onboarded"] is False


def test_onboarding_complete_positive(client, db_session):
    """Positive: Submitting valid onboarding payload creates user and accounts."""
    payload = {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "monthly_salary": 180000.0,
        "base_currency": "INR",
        "bank_name": "Axis Bank",
        "account_number": "1234567890",
        "initial_balance": 50000.0,
        "demat_broker": "Groww",
        "financial_goal": "Retirement & House",
        "risk_tolerance": "Aggressive",
        "savings_target_pct": 35.0,
    }
    response = client.post("/api/v1/onboarding/complete", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "success"
    assert res_data["user"]["name"] == "Jane Doe"
    assert res_data["user"]["monthly_salary"] == 180000.0

    # Verify status now returns is_onboarded = True
    status_resp = client.get("/api/v1/onboarding/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["is_onboarded"] is True
    assert status_data["user"]["name"] == "Jane Doe"


def test_onboarding_missing_required_fields_negative(client):
    """Negative: Payload missing required monthly_salary returns 422 Unprocessable Entity."""
    bad_payload = {
        "name": "Jane Doe"
        # missing monthly_salary
    }
    response = client.post("/api/v1/onboarding/complete", json=bad_payload)
    assert response.status_code == 422


def test_onboarding_invalid_data_types_negative(client):
    """Negative: Submitting string for monthly_salary when float expected returns 422."""
    bad_payload = {
        "name": "Jane Doe",
        "monthly_salary": "not-a-number",
        "base_currency": "INR",
    }
    response = client.post("/api/v1/onboarding/complete", json=bad_payload)
    assert response.status_code == 422
