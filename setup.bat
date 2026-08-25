@echo off
TITLE AI Finance Assistant - Windows Setup

echo ======================================================================
echo  🛠️  Personal Finance & Investment AI Assistant - Windows Setup
echo ======================================================================
echo.

cd /d "%~dp0"

REM Check Python
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Python is not installed or not in PATH. Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

python setup.py

pause
