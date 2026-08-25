"""
Tests for Watchlist, Stock Analysis, and Market Data APIs.
Positive and Negative Test Cases.
"""

from unittest.mock import patch


def test_get_watchlist_seeds_defaults_positive(client, seed_user_and_accounts):
    """Positive: Fetching watchlist automatically creates primary radar and returns items."""
    response = client.get("/api/v1/watchlist")
    assert response.status_code == 200
    data = response.json()
    assert "watchlist" in data
    assert data["total"] >= 4
    symbols = [item["symbol"] for item in data["watchlist"]]
    assert "INFY" in symbols or "TATAMOTORS" in symbols


def test_add_and_remove_watchlist_item_positive(client, seed_user_and_accounts):
    """Positive: Add new ticker to watchlist, verify existence, and delete it."""
    add_payload = {
        "symbol": "WIPRO",
        "exchange": "NSE",
        "target_buy_price": 450.0,
        "alert_notes": "Buy on breakout above 500",
    }
    add_resp = client.post("/api/v1/watchlist", json=add_payload)
    assert add_resp.status_code == 200
    assert add_resp.json()["status"] == "success"

    # Verify item exists
    wl_resp = client.get("/api/v1/watchlist")
    assert wl_resp.status_code == 200
    items = wl_resp.json()["watchlist"]
    wipro_item = next((i for i in items if i["symbol"] == "WIPRO"), None)
    assert wipro_item is not None
    assert wipro_item["target_buy_price"] == 450.0

    # Delete item
    del_resp = client.delete(f"/api/v1/watchlist/{wipro_item['id']}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "success"


def test_add_duplicate_watchlist_item_positive(client, seed_user_and_accounts):
    """Positive: Adding an already existing ticker returns status = 'exists' without error."""
    # Seed default watchlist by calling GET
    client.get("/api/v1/watchlist")

    # INFY is now in default watchlist
    payload = {"symbol": "INFY", "exchange": "NSE"}
    resp = client.post("/api/v1/watchlist", json=payload)
    assert resp.status_code == 200
    assert resp.json()["status"] == "exists"


def test_delete_nonexistent_watchlist_item_negative(client, seed_user_and_accounts):
    """Negative: Attempting to delete non-existent watchlist item ID returns 404."""
    resp = client.delete("/api/v1/watchlist/nonexistent-item-id-999")
    assert resp.status_code == 404


def test_search_stocks_positive(client):
    """Positive: Stock search endpoint returns results."""
    with patch("src.services.stock_analyzer_service.search_global_tickers") as mock_search:
        mock_search.return_value = [
            {"symbol": "RELIANCE.NS", "name": "Reliance Industries Ltd", "exchange": "NSE", "asset_class": "equity"}
        ]
        response = client.get("/api/v1/stocks/search?q=reliance")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert len(data["results"]) == 1
        assert data["results"][0]["symbol"] == "RELIANCE.NS"


def test_get_stock_news_positive(client):
    """Positive: News endpoint returns list of articles for valid ticker."""
    with patch("src.services.stock_analyzer_service.fetch_stock_rss_news") as mock_news:
        mock_news.return_value = [
            {"title": "Tech Stocks Surge", "link": "https://example.com/news1", "published": "2026-08-20"}
        ]
        response = client.get("/api/v1/stocks/INFY/news")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert len(data["articles"]) == 1


def test_analyze_stock_positive(client, seed_user_and_accounts):
    """Positive: Trigger AI stock analysis and return structured report."""
    with patch("src.services.stock_analyzer_service.analyze_stock_deep") as mock_analyze:
        mock_analyze.return_value = {
            "symbol": "HDFCBANK.NS",
            "overall_score": 8.5,
            "recommendation": "STRONG BUY",
            "valuation": "Fair",
        }
        response = client.post("/api/v1/stocks/analyze", json={"symbol": "HDFCBANK.NS", "exchange": "NSE"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["report"]["recommendation"] == "STRONG BUY"
