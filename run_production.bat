@echo off
TITLE AI Finance Assistant (Production Server)

echo ======================================================================
echo  🚀 Starting Personal Finance AI Assistant in PRODUCTION Mode
echo ======================================================================
echo.

cd /d "%~dp0"

REM Detect Python executable
IF EXIST "D:\Work\langgraph_venv\Scripts\python.exe" (
    SET "PYTHON_EXE=D:\Work\langgraph_venv\Scripts\python.exe"
) ELSE IF EXIST "backend\.venv\Scripts\python.exe" (
    SET "PYTHON_EXE=backend\.venv\Scripts\python.exe"
) ELSE (
    SET "PYTHON_EXE=python"
)

"%PYTHON_EXE%" run_production.py

pause
