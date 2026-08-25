"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardState, ChatMessage } from "@/lib/types";
import { getWsBaseUrl } from "@/lib/api";

export function useDashboardWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardState | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ step?: string; message?: string; last_sync?: string }>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "copilot",
      content: "Hello! I am your Local Ollama Finance Copilot. Ask me about your salary consumption, portfolio XIRR, or stock opportunities based on your available surplus.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const wsUrl = getWsBaseUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({ type: "INIT_DASHBOARD" }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;
          const payload = data.payload;

          if (type === "DASHBOARD_SNAPSHOT") {
            setDashboardData(payload);
          } else if (type === "SYNC_STATUS") {
            setSyncStatus(payload);
            if (payload.step === "completed") {
              setTimeout(() => setSyncStatus({}), 4000);
            }
          } else if (type === "CHAT_TOKEN") {
            setIsStreaming(true);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.sender === "copilot" && last.id === "streaming-current") {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + payload.token },
                ];
              } else {
                return [
                  ...prev,
                  {
                    id: "streaming-current",
                    sender: "copilot",
                    content: payload.token,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  },
                ];
              }
            });
          } else if (type === "CHAT_COMPLETE") {
            setIsStreaming(false);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.id === "streaming-current") {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    id: "msg-" + Date.now(),
                    content: payload.full_text,
                    evidence_id: payload.evidence_id,
                    model: payload.model,
                  },
                ];
              }
              return prev;
            });
          }
        } catch (err) {
          console.error("Error parsing WS message:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close();
      };

      socketRef.current = ws;
    } catch (err) {
      console.error("Failed to connect WS:", err);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  const triggerSync = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "TRIGGER_SYNC", payload: { provider: "all" } }));
    }
  };

  const fetchDashboardForPeriod = (options: { year?: number; month?: number; date_from?: string; date_to?: string }) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "FETCH_DASHBOARD_FOR_PERIOD",
          payload: options,
        })
      );
    }
  };

  const sendChatMessage = (content: string) => {
    if (!content.trim()) return;
    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "SEND_CHAT", payload: { content } }));
    }
  };

  return {
    isConnected,
    dashboardData,
    syncStatus,
    messages,
    isStreaming,
    triggerSync,
    fetchDashboardForPeriod,
    sendChatMessage,
  };
}
