import os
import sys

from pydantic_settings import BaseSettings, SettingsConfigDict


def get_app_storage_dir() -> str:
    """Returns persistent application data directory for standalone executable mode."""
    if os.getenv("FINANCE_DATA_DIR"):
        path = os.path.abspath(os.getenv("FINANCE_DATA_DIR"))
    else:
        path = os.path.join(os.path.expanduser("~"), ".finance_assistant")
    os.makedirs(path, exist_ok=True)
    return path


def get_default_db_url() -> str:
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")
    storage_dir = get_app_storage_dir()
    db_file = os.path.join(storage_dir, "finance.db")
    return f"sqlite:///{os.path.abspath(db_file).replace(os.sep, '/')}"


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Finance AI Assistant"
    ENVIRONMENT: str = "production" if getattr(sys, "frozen", False) else "development"
    DEBUG: bool = not getattr(sys, "frozen", False)
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # SQLite Database URL
    DATABASE_URL: str = get_default_db_url()

    # Local Ollama AI Settings
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "gemma2:2b")
    OLLAMA_COPILOT_MODEL: str = os.getenv("OLLAMA_COPILOT_MODEL", "llama3.2:3b")

    # File Ingestion & Temporary Paths
    FINANCIAL_STATEMENTS_DIR: str = os.getenv(
        "FINANCIAL_STATEMENTS_DIR",
        (
            os.path.join(get_app_storage_dir(), "FinancialStatements")
            if getattr(sys, "frozen", False)
            else os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "FinancialStatements"))
        ),
    )
    TEMP_DIR: str = os.getenv(
        "TEMP_DIR",
        (
            os.path.join(get_app_storage_dir(), "temp")
            if getattr(sys, "frozen", False)
            else os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "temp"))
        ),
    )
    GOOGLE_DRIVE_LEDGER_PATH: str = os.getenv("GOOGLE_DRIVE_LEDGER_PATH", r"G:\My Drive\MonthlyLedger.xlsx")

    # User Defaults
    DEFAULT_USER_EMAIL: str = "user@local.finance"
    DEFAULT_USER_NAME: str = "Primary Investor"
    DEFAULT_MONTHLY_SALARY: float = 100000.00
    DEFAULT_BASE_CURRENCY: str = "INR"

    # Background Workers
    MARKET_SYNC_ENABLED: bool = True
    MARKET_SYNC_INTERVAL_SECONDS: int = 900
    AUTO_DRIVE_SYNC_ENABLED: bool = True
    AUTO_DRIVE_SYNC_INTERVAL_SECONDS: int = 300

    # Security
    SECRET_KEY: str = "local-dev-secret-key-finance-assistant"
    SESSION_TTL_HOURS: int = 24

    # Optional External Integrations
    GMAIL_CLIENT_SECRETS_FILE: str = "credentials.json"
    ZERODHA_API_KEY: str | None = None
    ZERODHA_API_SECRET: str | None = None

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
            os.path.join(os.path.dirname(__file__), "..", ".env"),
            ".env",
        ),
        extra="allow",
        env_file_encoding="utf-8",
    )


settings = Settings()
