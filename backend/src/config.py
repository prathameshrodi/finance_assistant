from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Finance AI Assistant"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # SQLite Database URL (Defaults dynamically to project root finance.db)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'finance.db')).replace(os.sep, '/')}"
    )

    # Local Ollama AI Settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma2:2b"
    OLLAMA_COPILOT_MODEL: str = "llama3.2:3b"

    # File Ingestion & Temporary Paths (Configurable in .env)
    FINANCIAL_STATEMENTS_DIR: str = os.getenv(
        "FINANCIAL_STATEMENTS_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "FinancialStatements"))
    )
    TEMP_DIR: str = os.getenv(
        "TEMP_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "temp"))
    )
    GOOGLE_DRIVE_LEDGER_PATH: str = os.getenv(
        "GOOGLE_DRIVE_LEDGER_PATH",
        r"G:\My Drive\MonthlyLedger.xlsx"
    )

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
    ZERODHA_API_KEY: Optional[str] = None
    ZERODHA_API_SECRET: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
            os.path.join(os.path.dirname(__file__), "..", ".env"),
            ".env"
        ),
        extra="allow",
        env_file_encoding="utf-8"
    )


settings = Settings()
