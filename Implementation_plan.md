# Personal Finance & Investment AI Assistant — Implementation Plan

> **Version**: 2.5 (Rich Charts + Mobile-Responsive WebSocket Edition) · **Date**: 2026-08-15  
> **Visuals**: Interactive Recharts Suite (Burn Area, Radial 50/30/20, Allocation Donut, XIRR vs Benchmark Line, RSI Scatter Radar)  
> **Mobile Optimization**: iOS Safari & Android Chrome Responsive Design (`100dvh`, Safe Area Insets, Touch UX)  
> **Core Engine**: Ollama Local LLM (`llama3.2`) + Daily Once Batch Sync (Gmail/Zerodha)  
> **Reference**: [Architecture.md](file:///d:/Work/ai_finance_assistant/Architecture.md)

---

## 10-Gate Implementation Flow

```mermaid
graph LR
    G0["Gate 0<br/>Local & Ollama Setup"] --> G1["Gate 1<br/>Models & DB"]
    G1 --> G2["Gate 2<br/>Dedup & Repos"]
    G2 --> G3["Gate 3<br/>Chart Data Engines"]
    G3 --> G4["Gate 4<br/>Integrations (Gmail/Kite)"]
    G4 --> G5["Gate 5<br/>Daily Batch Sync Graph"]
    G5 --> G6["Gate 6<br/>Market & Stock Screener"]
    G6 --> G7["Gate 7<br/>Ollama Copilot Multi-Agent"]
    G7 --> G8["Gate 8<br/>Unified WebSocket Pipe"]
    G8 --> G9["Gate 9<br/>Mobile Dashboard & Charts"]

    style G0 fill:#238636,stroke:#2ea043
    style G3 fill:#1f6feb,stroke:#388bfd
    style G5 fill:#1f6feb,stroke:#388bfd
    style G7 fill:#8957e5,stroke:#a371f7
    style G9 fill:#e3b341,stroke:#d29922
```

---

## Gate 0: Local Environment & Ollama Setup

### What You'll Build
- Initialize clean `backend/` and `frontend/` directories in `ai_finance_assistant/`.
- Local Python virtual environment (`.venv`) with core dependencies.
- Verify Ollama connection (`http://localhost:11434`) with `langchain-ollama`.
- Next.js frontend scaffolding with `recharts`, `lucide-react`, and `tailwindcss`.

### Backend Dependencies (`backend/requirements.txt`)
```
fastapi>=0.111.0
uvicorn[standard]>=0.30.0
websockets>=12.0
sqlalchemy>=2.0.30
pydantic>=2.7.0
pydantic-settings>=2.3.0
langchain>=0.2.0
langgraph>=0.1.0
langchain-community>=0.2.0
langchain-ollama>=0.1.0
cryptography>=42.0.0
keyring>=25.0.0
google-auth>=2.29.0
google-api-python-client>=2.120.0
google-auth-oauthlib>=1.2.0
kiteconnect>=5.0.0
yfinance>=0.2.40
pypdf>=4.2.0
python-multipart>=0.0.9
apscheduler>=3.10.4
pytest>=8.2.0
```

### Frontend Dependencies (`frontend/package.json`)
```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "recharts": "^2.12.7",
    "lucide-react": "^0.395.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

### Validation Checklist
- [ ] Backend dependencies install cleanly in `.venv`.
- [ ] Ollama `llama3.2` model responds on `http://localhost:11434`.
- [ ] Frontend initializes with Recharts and Tailwind CSS.

---

## Gate 1: Domain Models & Database (SQLite)

### What You'll Build
- SQLAlchemy models:
  - `Account`, `Category`, `Merchant`, `Transaction`, `StagedTransaction`
  - `SyncRun`, `EmailSource`, `TransactionFingerprintSource`
  - `Budget`, `Goal`
  - `PortfolioHolding`, `MarketPriceCache`, `Watchlist`, `WatchlistItem`, `InvestmentOpportunity`
  - `EvidenceQuery`, `AdvisorSession`
- SQLite database initialization (`finance.db`) for zero-config sovereign storage.

### Validation Checklist
- [ ] `Base.metadata.create_all(engine)` creates all tables on startup.

---

## Gate 2: Two-Layer Dedup & User Repositories

### What You'll Build
- `FingerprintService`:
  - Layer 1: Gmail `provider_message_id` tracking.
  - Layer 2: SHA-256 financial event hash: `(amount + date + normalized_merchant + account_id)`.
- Repositories:
  - `LedgerRepo`: Read/write ledger & staged transactions.
  - `PortfolioRepo`: Read/write holdings & calculate net worth.
  - `MarketRepo`: Read/write watchlist tickers & cached quotes.
  - `EvidenceRepo`: Allow-dict parameterized evidence logger.

### Validation Checklist
- [ ] Ingesting duplicate emails or statements triggers Layer 2 dedup and skips duplicate insertion.

---

## Gate 3: Chart Data Series & Calculation Engines

### What You'll Build
- `BudgetEngine`:
  - Generates cumulative daily spend time-series (`day_of_month`, `actual_spent`, `projected_spent`, `budget_limit`).
  - Computes 50/30/20 radial distribution metrics (Needs, Wants, Investments).
- `PortfolioEngine`:
  - Computes multi-asset allocation slices (Equity, Debt, Gold, Cash, Crypto).
  - Calculates historical Net Worth time-series vs NIFTY 50 benchmark curve.
  - Calculates annualized returns (**XIRR**).

### Validation Checklist
- [ ] Chart data payloads are pre-formatted for Recharts ingestion.
- [ ] XIRR and 50/30/20 calculations validated via unit tests.

---

## Gate 4: External Integrations (Gmail, Zerodha & Keyring)

### What You'll Build
- `CredentialStore`: Stores Gmail OAuth tokens and Zerodha API secrets directly in OS Keyring.
- `GmailClient`: Batch fetcher targeting bank alerts and transaction notifications over past 24h.
- `ZerodhaClient`: Kite Connect portfolio batch puller.
- `MarketFeed`: Yahoo Finance / NSE quotes provider.

### Validation Checklist
- [ ] OAuth tokens stored safely in OS Keyring.
- [ ] Market feed fetches live quotes and updates `market_price_cache`.

---

## Gate 5: LangGraph Daily Batch Sync & Ingestion Graph

### What You'll Build
- Daily batch LangGraph ingestion workflow (runs once daily at 08:00 AM or on manual trigger):
  - Batch queries past 24h Gmail messages matching financial patterns.
  - Fetches Zerodha Demat holdings and current cash balances.
  - Extracts transactions using regex + Ollama fallback parser.
  - Validates with Pydantic (`ParsedTransaction`).
  - Applies 2-layer SHA-256 dedup.
  - Updates ledger and broadcasts sync summary event over WebSocket.

### Validation Checklist
- [ ] Invoking `sync_graph.invoke({})` successfully parses batch 24h emails/statements and updates the database.

---

## Gate 6: LangGraph Market & Stock Screener Graph

### What You'll Build
- Autonomous LangGraph market scanner workflow:
  - Refreshes quotes for all portfolio holdings and watchlist tickers.
  - Generates data for RSI & Valuation Scatter Matrix (X: 14D RSI, Y: PE Discount, Bubble: Surplus match).
  - Identifies oversold bluechips (14-day RSI < 35) and PE valuation discounts.
  - Matches available monthly salary surplus with identified stock opportunities.
  - Generates data-driven investment theses via Ollama and saves records to `investment_opportunities`.

### Validation Checklist
- [ ] Scanner populates opportunities table and formats RSI scatter plot data for the visual radar.

---

## Gate 7: Ollama Multi-Agent Copilot Graph

### What You'll Build
- Supervisor-Worker Copilot workflow powered by local Ollama (`llama3.2`):
  - `Supervisor`: Decomposes user queries and delegates to sub-agents.
  - `SpendAgent`: Synthesizes salary consumption, fixed bill commitments, and spending leaks.
  - `PortfolioAgent`: Synthesizes portfolio performance, XIRR returns, and sector drag.
  - `StockAgent`: Delivers data-driven stock suggestions matching surplus funds and screener triggers.
  - `PlanningAgent`: Evaluates emergency funds and FIRE milestones.
- Verifiable evidence tagging attaching query snapshots to AI responses.

### Validation Checklist
- [ ] Query *"Analyze my salary consumption and suggest what stocks to buy with my surplus"* returns grounded insights with attached `evidence_id` tags from local Ollama.

---

## Gate 8: Unified WebSocket Pipe (`/ws`)

### What You'll Build
- Single bi-directional WebSocket handler in FastAPI:
  - On Connect: Dispatches `DASHBOARD_SNAPSHOT` with formatted chart series (Spend Area, 50/30/20 Ring, Allocation Donut, XIRR vs Benchmark Line, RSI Scatter).
  - On `TRIGGER_SYNC`: Spawns LangGraph Daily Batch Sync in background and streams `SYNC_STATUS` updates.
  - On `SEND_CHAT`: Runs Ollama Copilot Graph and streams `CHAT_TOKEN` and `CHAT_COMPLETE` events.
  - On `ADD_WATCHLIST_TICKER`: Updates watchlist and broadcasts fresh quotes.

### Validation Checklist
- [ ] WebSocket client connects, receives chart series data in one payload, and handles live chat streaming.

---

## Gate 9: Plain & Simple Mobile-Responsive Dashboard UI (Next.js)

### What You'll Build
- Responsive Single-Page Next.js Dashboard with Recharts:
  1. **Top Metrics Bar**: Net Worth, Liquid Cash, Salary Consumed %, Portfolio XIRR.
  2. **Cumulative Spend Velocity Area Chart**: Actual vs Projected spend vs Monthly salary limit.
  3. **50/30/20 Radial Ring**: Needs vs Wants vs Investments progress rings.
  4. **Multi-Asset Allocation Donut**: Concentric ring chart with target allocation comparison.
  5. **Portfolio Performance Line Chart**: Portfolio total returns vs NIFTY 50 benchmark.
  6. **RSI & Valuation Scatter Radar**: Interactive 2D matrix plotting oversold dips.
  7. **Local AI Copilot Chat Drawer**: Responsive streaming chat drawer with evidence verification modals.
  8. **Mobile Safari & Chrome UX Polish**:
     - Dynamic viewport sizing (`100dvh`).
     - Safe area insets (`env(safe-area-inset-bottom)`).
     - Segmented mobile tab bar and bottom thumb navigation.
     - Smooth touch scrolling with zero horizontal overflow.

### Validation Checklist
- [ ] Dashboard renders smoothly on desktop browsers.
- [ ] Tested on Mobile Chrome & Safari viewports (390px - 430px) — all charts resize fluidly and bottom navigation aligns cleanly with iOS safe area insets.
- [ ] AI Copilot streams answers with clickable evidence tags.
