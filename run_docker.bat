@echo off
title AI Finance Assistant - Docker Launcher
echo ======================================================================
echo  🐳 Launching AI Personal Finance Assistant in Docker...
echo ======================================================================
echo.

docker compose up --build -d

echo.
echo ======================================================================
echo  ✅ Application is running in Docker containers!
echo.
echo  🌐 Web Dashboard : http://localhost:3000
echo  🔌 Backend API   : http://localhost:8000
echo  🤖 Ollama AI     : http://localhost:11434
echo ======================================================================
echo.
echo View logs with: docker compose logs -f
pause
