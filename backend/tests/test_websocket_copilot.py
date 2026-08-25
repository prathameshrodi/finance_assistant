"""
Tests for WebSocket Copilot Chat and Realtime Dashboard state streaming.
Positive and Negative Test Cases.
"""

import json
from unittest.mock import patch


def test_websocket_connect_and_receive_snapshot_positive(client, seed_user_and_accounts):
    """Positive: Connecting to /ws receives initial DASHBOARD_SNAPSHOT frame."""
    with client.websocket_connect("/ws") as ws:
        msg_text = ws.receive_text()
        msg = json.loads(msg_text)
        assert msg["type"] == "DASHBOARD_SNAPSHOT"
        assert "payload" in msg
        assert "hero_metrics" in msg["payload"]
        assert "charts" in msg["payload"]


def test_websocket_trigger_sync_positive(client, seed_user_and_accounts):
    """Positive: Sending TRIGGER_SYNC action emits SYNC_STATUS and DASHBOARD_SNAPSHOT."""
    with client.websocket_connect("/ws") as ws:
        # Read initial snapshot
        _ = ws.receive_text()

        # Send sync command
        ws.send_text(json.dumps({"type": "TRIGGER_SYNC"}))

        # Receive SYNC_STATUS (syncing)
        sync_msg1 = json.loads(ws.receive_text())
        assert sync_msg1["type"] == "SYNC_STATUS"
        assert sync_msg1["payload"]["step"] == "syncing_ledger"

        # Receive DASHBOARD_SNAPSHOT
        snap_msg = json.loads(ws.receive_text())
        assert snap_msg["type"] == "DASHBOARD_SNAPSHOT"

        # Receive SYNC_STATUS (completed)
        sync_msg2 = json.loads(ws.receive_text())
        assert sync_msg2["type"] == "SYNC_STATUS"
        assert sync_msg2["payload"]["step"] == "completed"


def test_websocket_copilot_chat_positive(client, seed_user_and_accounts):
    """Positive: Sending SEND_CHAT action streams back tokens and complete message."""
    from unittest.mock import MagicMock

    from langchain_core.messages import AIMessage

    mock_graph = MagicMock()
    mock_graph.invoke.return_value = {"messages": [AIMessage(content="Your net worth is INR 2,50,000.")]}

    with patch("src.ai.financial_agent_graph.create_financial_copilot_graph", return_value=mock_graph):
        with client.websocket_connect("/ws") as ws:
            # Consume initial snapshot
            _ = ws.receive_text()

            # Send question
            ws.send_text(json.dumps({"type": "SEND_CHAT", "payload": {"content": "What is my net worth?"}}))

            # Collect streamed messages
            received_types = []
            for _ in range(30):
                try:
                    frame = json.loads(ws.receive_text())
                    received_types.append(frame["type"])
                    if frame["type"] == "CHAT_COMPLETE":
                        break
                except Exception:
                    break

            assert "CHAT_TOKEN" in received_types
            assert "CHAT_COMPLETE" in received_types
