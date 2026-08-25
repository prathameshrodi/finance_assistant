"""
Tests for Behavioral Analytics, AI Prognosis, and Investment Opportunity Scanner.
Positive and Negative Test Cases.
"""

from unittest.mock import patch


def test_get_behavioral_analytics_positive(client, seed_user_and_accounts):
    """Positive: Compute spending trends and category insights."""
    response = client.get("/api/v1/analytics/behavioral")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "data" in data


def test_generate_behavioral_prognosis_positive(client, seed_user_and_accounts):
    """Positive: Trigger AI behavioral prognosis synthesis."""
    with patch("src.ai.behavioral_analysis_flow.generate_ai_behavioral_prognosis") as mock_prog:
        mock_prog.return_value = {
            "prognosis": "Disciplined savings trajectory with strong liquidity retention.",
            "health_score": 85,
            "key_risks": ["Dining expenses increased 12%"],
            "recommendations": ["Allocate surplus to index ETFs"],
        }
        response = client.post("/api/v1/analytics/generate-prognosis")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["result"]["health_score"] == 85


def test_trigger_opportunities_scan_positive(client, seed_user_and_accounts):
    """Positive: Opportunity scanner computes surplus and discovers investment signals."""
    response = client.post("/api/v1/opportunities/scan")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "opportunities_found" in data
    assert "opportunities" in data
    assert len(data["opportunities"]) > 0
