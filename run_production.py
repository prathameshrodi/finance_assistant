"""
🚀 Production Launcher for Personal Finance & Investment AI Assistant
Runs both the FastAPI Backend and Next.js Frontend in optimized production mode with graceful shutdown.
"""

import os
import sys
import subprocess
import signal
import time
import shutil

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

# Detect preferred Python executable
PYTHON_CANDIDATES = [
    r"D:\Work\langgraph_venv\Scripts\python.exe",
    os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe"),
    os.path.join(ROOT_DIR, ".venv", "Scripts", "python.exe"),
    sys.executable,
]

python_exe = next((p for p in PYTHON_CANDIDATES if os.path.exists(p)), sys.executable)


def find_npm():
    """Locate npm executable across platforms."""
    npm_cmd = shutil.which("npm.cmd") or shutil.which("npm")
    if not npm_cmd:
        # Check standard Windows paths
        common_paths = [
            r"D:\Apps\nodejs\npm.cmd",
            r"C:\Program Files\nodejs\npm.cmd",
            r"C:\Program Files (x86)\nodejs\npm.cmd",
        ]
        npm_cmd = next((p for p in common_paths if os.path.exists(p)), "npm")
    return npm_cmd


def print_banner():
    print("=" * 70)
    print(" 🚀 Starting AI Finance Assistant in PRODUCTION Mode")
    print("=" * 70)
    print(f" 🐍 Python Executable : {python_exe}")
    print(f" 🌐 Frontend (Next.js): http://praths-pc.tail2bb261.ts.net:3000")
    print(f" 🔌 Backend (FastAPI) : http://praths-pc.tail2bb261.ts.net:8000")
    print(f" ⚡ WebSocket Stream  : ws://praths-pc.tail2bb261.ts.net:8000/ws")
    print("=" * 70)
    print(" Press Ctrl+C at any time to stop all services.\n")


def main():
    print_banner()

    # Step 1: Ensure Frontend Production Build Exists
    npm_cmd = find_npm()
    print("📦 [1/3] Building Next.js production bundle...")
    build_process = subprocess.run(
        [npm_cmd, "run", "build"],
        cwd=FRONTEND_DIR,
        shell=True,
    )

    if build_process.returncode != 0:
        print("❌ Frontend build failed. Please check errors above.")
        sys.exit(1)

    print("✅ Frontend production build ready.\n")

    # Step 2: Start Backend Production Process
    print("🚀 [2/3] Starting FastAPI Backend (uvicorn)...")
    env = os.environ.copy()
    env["ENVIRONMENT"] = "production"
    env["DEBUG"] = "False"
    env["HOST"] = "0.0.0.0"
    env["PORT"] = "8000"

    backend_cmd = [
        python_exe,
        "-m",
        "uvicorn",
        "src.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
        "--app-dir",
        BACKEND_DIR,
        "--no-access-log",
    ]

    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=ROOT_DIR,
        env=env,
    )

    # Step 3: Start Next.js Production Server
    print("🌐 [3/3] Starting Next.js Production Server (next start -H 0.0.0.0 -p 3000)...")
    frontend_cmd = [
        npm_cmd,
        "run",
        "start",
        "--",
        "-H",
        "0.0.0.0",
        "-p",
        "3000",
    ]

    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=FRONTEND_DIR,
        shell=True,
    )

    print("\n" + "=" * 70)
    print(" ✨ All production services are LIVE and running smoothly!")
    print("=" * 70 + "\n")

    def handle_shutdown(signum, frame):
        print("\n🛑 Shutting down AI Finance Assistant production services...")
        try:
            frontend_proc.terminate()
            backend_proc.terminate()
            frontend_proc.wait(timeout=5)
            backend_proc.wait(timeout=5)
        except Exception:
            frontend_proc.kill()
            backend_proc.kill()
        print("✅ All services stopped successfully.")
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    # Monitor processes
    while True:
        time.sleep(1)
        if backend_proc.poll() is not None:
            print("⚠️ Backend server exited unexpectedly.")
            handle_shutdown(None, None)
            break
        if frontend_proc.poll() is not None:
            print("⚠️ Frontend server exited unexpectedly.")
            handle_shutdown(None, None)
            break


if __name__ == "__main__":
    main()
