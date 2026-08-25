# 🛠️ Installation & Setup Guide

This guide walks you through setting up the **Personal Finance & Investment AI Assistant** from scratch on your local machine.

---

## 📋 Prerequisites & System Requirements

| Component | Minimum Requirement | Recommended |
|---|---|---|
| **Operating System** | Windows 10/11, macOS, or Ubuntu 20.04+ | Windows 11 / macOS / Linux |
| **Python** | Python 3.11+ | Python 3.11 or 3.12 |
| **Node.js** | Node.js 18.x+ (with npm) | Node.js 20.x LTS |
| **Local LLM Engine** | [Ollama](https://ollama.com/) | Ollama with GPU acceleration (NVIDIA RTX or Apple Silicon) |
| **VRAM / RAM** | 8 GB System RAM | 16 GB RAM + 4 GB+ GPU VRAM |

## ⚡ 1-Click Automated Setup (Recommended)

You can set up the entire project (Python virtual environment, dependencies, `.env` configs, database tables, and Next.js build) with a single command on any OS:

### 🪟 Windows:
Double click **`setup.bat`** or run:
```powershell
python setup.py
```

### 🍎 macOS & 🐧 Linux:
```bash
chmod +x setup.sh
./setup.sh
```

---

## 🤖 Step 1: Install & Configure Local Ollama AI

The AI Copilot and Statement Ingestion agents run 100% on-device via **Ollama**.

1. Download and install Ollama from [https://ollama.com/download](https://ollama.com/download).
2. Start the Ollama service:
   ```bash
   ollama serve
   ```
3. Pull the required models:
   ```bash
   # Primary conversational Copilot & Analysis model (fast & accurate)
   ollama run llama3.2:3b

   # (Optional) Lightweight JSON extractor
   ollama pull gemma2:2b
   ```
4. Verify Ollama is running by visiting `http://localhost:11434` in your browser.

---

## 🐍 Step 2: Backend Setup (FastAPI & SQLite)

### 1. Clone & Navigate to Repository
```bash
cd ai_finance_assistant
```

### 2. Configure Environment Variables
Copy the root `.env.example` template to `.env`:
```bash
# On Windows (PowerShell):
Copy-Item .env.example .env

# On macOS/Linux:
cp .env.example .env
```

Open `.env` and verify your local settings:
```env
# Application Settings
APP_NAME="Finance AI Assistant"
ENVIRONMENT="development"
DEBUG=true
PORT=8000
HOST="0.0.0.0"

# Local Database
DATABASE_URL="sqlite:///./finance.db"

# Local Ollama AI Settings
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="gemma2:2b"
OLLAMA_COPILOT_MODEL="llama3.2:3b"

# Statement Ingestion Paths
FINANCIAL_STATEMENTS_DIR="./FinancialStatements"
TEMP_DIR="./backend/temp"
GOOGLE_DRIVE_LEDGER_PATH="G:/My Drive/MonthlyLedger.xlsx"
```

### 3. Create Python Virtual Environment & Install Dependencies
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (CMD):
.venv\Scripts\activate.bat
# macOS/Linux:
source .venv/bin/activate

# Upgrade pip & install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Initialize Database
Create SQLite database tables and seed standard accounts, default user, and budget categories:
```bash
python init_db.py
```

### 5. Start Backend Server
```bash
# From repository root (with virtual environment active):
cd ..
python run_backend.py
```
- **API Server**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **WebSocket Stream**: `ws://localhost:8000/ws`

---

## 🌐 Step 3: Frontend Setup (Next.js & Tailwind CSS)

### 1. Navigate to Frontend Directory
Open a **new terminal window**:
```bash
cd ai_finance_assistant/frontend
```

### 2. Configure Frontend Environment
Create `.env.local` from template:
```bash
# Windows (PowerShell):
Copy-Item .env.example .env.local

# macOS/Linux:
cp .env.example .env.local
```

Verify contents of `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://praths-pc.tail2bb261.ts.net:8000"
NEXT_PUBLIC_WS_URL="ws://praths-pc.tail2bb261.ts.net:8000/ws"
```

### 3. Install Node Modules & Start Development Server
```bash
npm install
npm run dev
```

Open your browser at **`http://localhost:3000`** to access the live dashboard!

---

## 📄 Step 4: Statement Ingestion & Data Loading

You can ingest statements into your financial assistant in three flexible ways:

### Method A: UI Upload (Fastest)
1. Click **`[+ Upload Statement]`** on the top navigation bar.
2. Select your Bank Statement (PDF/Excel) or Demat Holding Statement.
3. Toggle **"Skip Staging (Direct Ingestion)"** to commit directly to live ledger, or keep unchecked to review parsed records in `/staged-transactions`.

### Method B: Google Drive Auto-Sync
If you keep a consolidated Excel ledger on Google Drive (e.g. `G:\My Drive\MonthlyLedger.xlsx`):
1. Configure `GOOGLE_DRIVE_LEDGER_PATH` in `.env`.
2. Enable `AUTO_DRIVE_SYNC_ENABLED=true`.
3. The background worker will automatically detect changes and ingest new entries.

### Method C: Batch Script Ingestion
To batch-load historical statements from `FinancialStatements/`:
```bash
cd backend
python -m src.ai.unified_ingestion_graph
```

---

## 🔧 Useful Commands & Routes

| Page / Route | Description |
|---|---|
| 🏠 **`/`** | Financial Dashboard (Burn Velocity, 50/30/20 Rings, Net Worth, AI Copilot) |
| 💳 **`/ledger`** | Live Ledger & Holding Manager (Manual CRUD & Statement Reconciliation) |
| 📈 **`/watchlist`** | Stock & Opportunity Radar (6-Pillar Fundamental/Technical Analysis) |
| 📊 **`/analytics`** | Deep Portfolio Allocation, Historical Burn Rates & Net Worth Projection |
| 📥 **`/staged-transactions`** | Human-in-the-Loop Statement Review & Batch Approval |
| ⚙️ **`/settings`** | User Profile, Multi-Bank & Demat Manager, Daily Excel Paths, AI Engine |
| 🪄 **`/setup`** | Dedicated First-Time Setup Wizard (Profile, Salary, Multi-Accounts, Storage Paths) |

---

## 🐳 Docker Deployment (Recommended for Production)

Run the entire stack (FastAPI Backend, Next.js Frontend, SQLite Storage & Ollama AI) in isolated containers:

### 1-Click Startup:
- **Windows**: Double-click `run_docker.bat`
- **macOS / Linux**:
  ```bash
  chmod +x run_docker.sh
  ./run_docker.sh
  ```

### Manual Docker Compose Command:
```bash
docker compose up --build -d
```

### Access URLs:
- **🌐 Web Dashboard**: `http://localhost:3000`
- **🔌 Backend API & Swagger Docs**: `http://localhost:8000/docs`
- **🤖 Ollama AI Engine**: `http://localhost:11434`

### Stop Containers:
```bash
docker compose down
```

---

## 💻 Local Development Commands

| Action | Command |
|---|---|
| 🐳 **Run Full Stack in Docker** | `docker compose up --build -d` (or `run_docker.bat`) |
| 🚀 **Run Production Mode (Local Python)** | `python run_production.py` (or `run_production.bat`) |
| 🛠️ **Start Backend (Dev Mode)** | `python run_backend.py` |
| 🌐 **Start Frontend (Dev Mode)** | `cd frontend && npm run dev` |
| 🗄️ **Reset / Re-create Tables** | `cd backend && python reset_tables.py` |
| 📈 **Trigger Market Quote Sync** | `curl -X POST http://localhost:8000/api/v1/market/sync` |

---

## ❓ Troubleshooting & FAQs

### 1. Ollama Model Not Found (`model 'llama3.2' not found`)
- Ensure Ollama is running (`ollama serve`).
- Download the model: `ollama run llama3.2:3b`.
- Update `OLLAMA_COPILOT_MODEL="llama3.2:3b"` in `.env`.

### 2. Windows PowerShell Script Execution Error
If running `.venv\Scripts\Activate.ps1` gives an execution policy error:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3. SQLite Database Locked / Busy
- Ensure only one backend server process is running.
- If needed, stop `run_backend.py` and restart.

### 4. WebSocket Connection Failed
- Check that the backend is active on `http://localhost:8000`.
- Verify `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` in `frontend/.env.local`.
