#!/usr/bin/env python3
"""
🛠️ Universal Setup Script for Personal Finance & Investment AI Assistant
Compatible with Windows, macOS, and Linux.

Automates:
1. System Prerequisites (Python 3.11+, Node.js, npm, Ollama)
2. Environment Configuration (.env, frontend/.env.local)
3. Python Virtual Environment & Dependency Installation
4. SQLite Database Initialization & Seed Data
5. Frontend npm Installation & Production Build
"""

import os
import sys
import subprocess
import shutil
import platform
import urllib.request
import json

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
IS_WINDOWS = platform.system() == "Windows"


def print_step(step_num: int, title: str):
    print("\n" + "=" * 70)
    print(f" 🔹 [{step_num}/6] {title}")
    print("=" * 70)


def print_success(msg: str):
    print(f" ✅ {msg}")


def print_warn(msg: str):
    print(f" ⚠️  {msg}")


def print_error(msg: str):
    print(f" ❌ {msg}")


def run_cmd(cmd, cwd=ROOT_DIR, check=True):
    """Executes a shell command cleanly across OS platforms."""
    print(f" 💻 Running: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    res = subprocess.run(cmd, cwd=cwd, shell=True)
    if check and res.returncode != 0:
        print_error(f"Command failed with exit code {res.returncode}")
        sys.exit(res.returncode)
    return res


def check_prerequisites():
    print_step(1, "Checking System Prerequisites")

    # 1. Check Python Version
    py_version = sys.version_info
    print(f" 🐍 Python Version: {py_version.major}.{py_version.minor}.{py_version.micro}")
    if py_version.major < 3 or (py_version.major == 3 and py_version.minor < 10):
        print_error("Python 3.10 or higher is required. Please update Python.")
        sys.exit(1)
    print_success("Python version is compatible.")

    # 2. Check Node & npm
    node_cmd = shutil.which("node")
    npm_cmd = shutil.which("npm.cmd" if IS_WINDOWS else "npm")
    if not node_cmd:
        print_error("Node.js is not found in PATH. Please install Node.js 18+ from https://nodejs.org")
        sys.exit(1)
    print_success(f"Node.js found: {node_cmd}")

    if not npm_cmd:
        print_error("npm is not found in PATH. Please install Node.js / npm.")
        sys.exit(1)
    print_success(f"npm found: {npm_cmd}")

    # 3. Check Ollama Service
    try:
        req = urllib.request.urlopen("http://localhost:11434/api/tags", timeout=3)
        if req.status == 200:
            models_data = json.loads(req.read().decode())
            model_names = [m.get("name", "") for m in models_data.get("models", [])]
            print_success(f"Ollama is running locally. Available models: {', '.join(model_names) if model_names else 'None'}")
    except Exception:
        print_warn("Ollama service was not detected on http://localhost:11434.")
        print("    Please ensure Ollama is installed (https://ollama.com) and running (`ollama serve`).")


def setup_environments():
    print_step(2, "Setting up Environment Files (.env)")

    # 1. Root .env
    root_env = os.path.join(ROOT_DIR, ".env")
    root_env_example = os.path.join(ROOT_DIR, ".env.example")
    if not os.path.exists(root_env) and os.path.exists(root_env_example):
        shutil.copyfile(root_env_example, root_env)
        print_success("Created root .env from .env.example")
    else:
        print_success("Root .env already exists.")

    # 2. Frontend .env.local
    frontend_env = os.path.join(FRONTEND_DIR, ".env.local")
    frontend_env_example = os.path.join(FRONTEND_DIR, ".env.example")
    if not os.path.exists(frontend_env) and os.path.exists(frontend_env_example):
        shutil.copyfile(frontend_env_example, frontend_env)
        print_success("Created frontend/.env.local from .env.example")
    else:
        print_success("frontend/.env.local already exists.")


def setup_python_venv():
    print_step(3, "Setting up Python Virtual Environment & Dependencies")

    venv_dir = os.path.join(BACKEND_DIR, ".venv")
    if not os.path.exists(venv_dir):
        print(" 📦 Creating virtual environment in backend/.venv...")
        run_cmd([sys.executable, "-m", "venv", venv_dir], cwd=ROOT_DIR)
        print_success("Virtual environment created.")
    else:
        print_success("Virtual environment already exists.")

    # Locate venv python & pip
    if IS_WINDOWS:
        venv_python = os.path.join(venv_dir, "Scripts", "python.exe")
        venv_pip = os.path.join(venv_dir, "Scripts", "pip.exe")
    else:
        venv_python = os.path.join(venv_dir, "bin", "python")
        venv_pip = os.path.join(venv_dir, "bin", "pip")

    print(" 📦 Upgrading pip and installing requirements.txt...")
    run_cmd([venv_pip, "install", "--upgrade", "pip"], cwd=BACKEND_DIR)
    run_cmd([venv_pip, "install", "-r", "requirements.txt"], cwd=BACKEND_DIR)
    print_success("Python backend dependencies installed successfully.")
    return venv_python


def initialize_database(venv_python):
    print_step(4, "Initializing SQLite Database & Seeding Baseline Tables")
    run_cmd([venv_python, "init_db.py"], cwd=BACKEND_DIR)
    print_success("Database initialized successfully (finance.db).")


def setup_frontend():
    print_step(5, "Installing Frontend Dependencies & Testing Build")
    npm_cmd = "npm.cmd" if IS_WINDOWS else "npm"

    print(" 📦 Running npm install in frontend/...")
    run_cmd([npm_cmd, "install"], cwd=FRONTEND_DIR)
    print_success("Frontend node packages installed.")

    print(" 📦 Testing Next.js production build...")
    run_cmd([npm_cmd, "run", "build"], cwd=FRONTEND_DIR)
    print_success("Next.js build compiled successfully.")


def print_completion_banner():
    print_step(6, "Setup Complete & Ready to Run!")
    print("""
 🎉 All systems are configured and verified!

 To start the application in 1-Click Production Mode:
   👉 python run_production.py
      (or on Windows: run_production.bat)

 To start in Development Mode:
   👉 Backend : python run_backend.py
   👉 Frontend: cd frontend && npm run dev

 Access URLs:
   🌐 Dashboard  : http://praths-pc.tail2bb261.ts.net:3000
   🔌 Backend API: http://praths-pc.tail2bb261.ts.net:8000
   ⚡ WebSocket  : ws://praths-pc.tail2bb261.ts.net:8000/ws
""")


def main():
    print("=" * 70)
    print(" 🛠️  Personal Finance & Investment AI Assistant - Universal Installer")
    print(f" 🖥️  Operating System: {platform.system()} ({platform.machine()})")
    print("=" * 70)

    check_prerequisites()
    setup_environments()
    venv_python = setup_python_venv()
    initialize_database(venv_python)
    setup_frontend()
    print_completion_banner()


if __name__ == "__main__":
    main()
