#!/usr/bin/env bash
# ==============================================================================
# 🚀 Universal Setup Script for macOS & Linux
# Personal Finance & Investment AI Assistant
# ==============================================================================

set -e

echo "========================================================================"
echo " 🛠️  Personal Finance & Investment AI Assistant - Mac & Linux Setup"
echo "========================================================================"
echo ""

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+."
    exit 1
fi

PYTHON_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "✅ Found Python $PYTHON_VER"

# 2. Check Node & npm
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi
echo "✅ Found Node.js $(node -v) and npm $(npm -v)"

# 3. Environment Files
echo ""
echo "🔹 [1/4] Configuring Environment Files..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created root .env from .env.example"
fi

if [ ! -f frontend/.env.local ]; then
    cp frontend/.env.example frontend/.env.local
    echo "✅ Created frontend/.env.local"
fi

# 4. Backend Virtual Environment & Dependencies
echo ""
echo "🔹 [2/4] Setting up Python Virtual Environment..."
cd backend
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Backend dependencies installed."

echo ""
echo "🔹 [3/4] Initializing Database..."
python init_db.py
echo "✅ SQLite database initialized."
cd ..

# 5. Frontend Dependencies & Build
echo ""
echo "🔹 [4/4] Setting up Next.js Frontend..."
cd frontend
npm install
npm run build
cd ..

echo ""
echo "========================================================================"
echo " 🎉 Setup Complete! You're ready to run."
echo "========================================================================"
echo ""
echo " 🚀 Start in Production Mode:  python3 run_production.py"
echo " 🛠️  Start in Dev Mode:         python3 run_backend.py (and in another tab: cd frontend && npm run dev)"
echo ""
