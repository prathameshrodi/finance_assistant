# ==============================================================================
# 🐳 Production Dockerfile for AI Finance Assistant Backend (FastAPI + LangGraph)
# ==============================================================================

FROM python:3.11-slim as base

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    FINANCE_DATA_DIR=/data

# Install essential system runtime libraries for OCR, PDF parsing, and cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create working directory and storage volume mount point
WORKDIR /app
RUN mkdir -p /data /models /app/FinancialStatements /app/backend/temp

# Copy requirements first to leverage Docker layer caching
COPY requirements.txt .

# Install python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source code
COPY . .

# Expose FastAPI server port
EXPOSE 8000

# Health check to ensure API is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start FastAPI backend with Uvicorn
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
