# 💰 Personal Finance & Investment AI Assistant (Ollama Local Edition)

A sovereign, local-first personal finance platform powered by **Local Ollama AI (`llama3.2:3b`)**, **LangGraph Multi-Agent Workflows**, **FastAPI & SQLite**, and a **Real-Time Next.js Dashboard**.

---

## 📚 Documentation Index

| Document | Description |
|---|---|
| 📖 **[setup.md](file:///d:/Work/ai_finance_assistant/setup.md)** | **Complete Installation & Setup Guide** — Step-by-step instructions for Ollama, Python virtual environment, SQLite, Next.js, and background workers. |
| 🏗️ **[Architecture.md](file:///d:/Work/ai_finance_assistant/Architecture.md)** | **Technical Architecture & Data Models** — Detailed domain models, database schema, WebSocket protocols, and grounding pipelines. |
| 🧭 **[ARCHITECTURE_WALKTHROUGH.md](file:///d:/Work/ai_finance_assistant/ARCHITECTURE_WALKTHROUGH.md)** | **Architecture Deep-Dive** — Visual mermaid diagrams, multi-source ingestion state graphs, and copilot reasoning flows. |
| 🗺️ **[Implementation_plan.md](file:///d:/Work/ai_finance_assistant/Implementation_plan.md)** | **Phased Implementation Roadmap** — 10-gate feature milestones, test criteria, and verification checkpoints. |

---

## 🌟 Key Features

1. **🧠 100% On-Device AI via Ollama**:
   - **Local Copilot (`llama3.2:3b`)**: Answers questions with strict grounding in your SQLite database records.
   - **6-Pillar Deep Stock Analyzer**: Comprehensive valuation, economic moat, 50/200 DMA technicals, RSI-14, RSS catalyst news, and personal portfolio fit.
   - **Behavioral Financial Analytics**: Detects high-spend velocity windows, recurring subscriptions, and emotional spending spikes.

2. **📊 Interactive Visual Dashboard**:
   - **Income vs Spend Flow**: Real-time comparison of Credits (cash inflows) vs Debits (cash outflows) with cumulative and daily breakdowns.
   - **50/30/20 Budget Health Rings**: Live tracking of Needs, Wants, and Savings adherence.
   - **Asset Allocation Concentric Donut**: Actual vs Target allocation across Equity, Mutual Funds, Cash, and Gold.
   - **Weighted Portfolio Alpha & Growth**: Real historical weighted stock growth compared against the **NIFTY 50 (`^NSEI`)** benchmark.
   - **Stock Opportunity Radar**: Scans for oversold high-quality pullbacks based on your unallocated monthly cash surplus.

3. **🌍 Global Ticker Search & Watchlist**:
   - Live worldwide auto-complete across Indian (`NSE`, `BSE`), US (`NASDAQ`, `NYSE`), European, and Asian exchanges, plus Crypto assets (`BTC-USD`, `ETH-USD`).
   - One-click Watchlist addition and on-demand 6-pillar analysis.

4. **⚡ Multi-Source Statement Ingestion**:
   - Automated parsing for PDF Bank Statements (HDFC, Central Bank of India, etc.), Demat Trade Books (Zerodha, Groww), and Excel spreadsheets.
   - Intelligent deduplication with SHA-256 transaction fingerprints.
   - Optional **Direct Ingestion** mode to skip staging and commit immediately to the live ledger.

5. **🔄 Single Bi-directional WebSocket Pipe (`/ws`)**:
   - Real-time dashboard hydration, live background sync updates, and streaming AI reasoning tokens with zero REST polling overhead.

---

## 🚀 Quick Setup Overview

### 1. Prerequisites
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com/) with model installed:
  ```bash
  ollama run llama3.2:3b
  ```

### 2. Start Backend
```bash
# In terminal 1:
cd backend
python -m venv .venv
.venv\Scripts\activate      # On macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python init_db.py

cd ..
python run_backend.py
# Backend live at http://localhost:8000 (API docs: http://localhost:8000/docs)
```

### 3. Start Frontend
```bash
# In terminal 2:
cd frontend
npm install
npm run dev
# Dashboard live at http://localhost:3000
```

> 💡 *For detailed environment variable configuration, statement ingestion methods, and troubleshooting, see the **[setup.md](file:///d:/Work/ai_finance_assistant/setup.md)** guide.*

---

## 🗄️ Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, SQLite, LangChain, LangGraph, Pydantic, yfinance.
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- **Local AI**: Ollama (`llama3.2:3b`, `gemma2:2b`).
- **Protocols**: WebSockets, REST APIs, JSON-Lines.

---

## 📜 License
Private & Local-First Personal Finance Project.
