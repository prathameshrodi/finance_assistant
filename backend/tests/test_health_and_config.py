"""
Tests for Health checks and System Configuration endpoints.
Positive and Negative Test Cases.
"""

from src.config import settings


def test_health_check_v1_positive(client):
    """Positive: /api/v1/health returns online status and correct app info."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["app"] == settings.APP_NAME
    assert "statements_dir" in data
    assert "websocket_url" in data


def test_health_check_legacy_alias_positive(client):
    """Positive: /api/health alias returns identical healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"


def test_health_check_invalid_method_negative(client):
    """Negative: POST request to health endpoint should return 405 Method Not Allowed."""
    response = client.post("/api/v1/health", json={"data": "test"})
    assert response.status_code == 405


def test_nonexistent_api_endpoint_negative(client):
    """Negative: Requesting invalid API route returns 404."""
    response = client.get("/api/v1/non_existent_route_xyz")
    assert response.status_code == 404
