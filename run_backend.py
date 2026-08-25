"""Convenience runner script for the Finance AI Assistant Backend."""
import os
import sys

# Add backend directory to python path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.insert(0, backend_dir)

import uvicorn
from src.config import settings

if __name__ == "__main__":
    print(f"Starting {settings.APP_NAME} on http://{settings.HOST}:{settings.PORT}")
    print(f"WebSocket Pipe active on ws://praths-pc.tail2bb261.ts.net:{settings.PORT}/ws")
    uvicorn.run("src.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG, app_dir=backend_dir)
