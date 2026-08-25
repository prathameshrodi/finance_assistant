import asyncio
import logging
import os
from datetime import datetime

from src.config import settings
from src.database import SessionLocal
from src.models import Account, User

logger = logging.getLogger(__name__)

_last_modified_timestamp = 0.0


def check_and_ingest_drive_ledger_once():
    """Checks if Google Drive Excel ledger file was modified, and triggers ingestion."""
    global _last_modified_timestamp

    drive_path = settings.GOOGLE_DRIVE_LEDGER_PATH
    if not os.path.exists(drive_path):
        return

    try:
        current_mtime = os.path.getmtime(drive_path)
        if current_mtime <= _last_modified_timestamp:
            return  # File unchanged

        logger.info(f"Detected updated Google Drive Ledger at: {drive_path} (mtime: {current_mtime})")
        _last_modified_timestamp = current_mtime

        # Run Unified Ingestion Graph
        from src.ai.unified_ingestion_graph import create_unified_ingestion_graph

        db = SessionLocal()
        user = db.query(User).first()
        account = db.query(Account).filter_by(account_type="savings").first()
        user_id = user.id if user else "default-user"
        acc_id = account.id if account else "default-account"
        db.close()

        pipeline = create_unified_ingestion_graph()
        batch_id = f"drive_sync_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        result = pipeline.invoke(
            {
                "file_path": drive_path,
                "statement_type": "bank_statement",
                "account_id": acc_id,
                "user_id": user_id,
                "batch_id": batch_id,
                "raw_text_chunk": [],
                "extracted_transactions": [],
                "extracted_holdings": [],
                "staged_count": 0,
                "duplicates_count": 0,
                "errors": [],
                "skip_staging": True,
            }
        )

        committed_count = result.get("committed_count", 0)
        logger.info(
            f"Auto-synced Google Drive Ledger: {committed_count} transactions directly committed to live ledger (Skipped Staging)."
        )

    except Exception as e:
        logger.error(f"Error in Drive sync worker: {e}")


async def start_drive_sync_background_task():
    """Periodic background task that monitors the Google Drive spreadsheet."""
    if not settings.AUTO_DRIVE_SYNC_ENABLED:
        logger.info("Auto Drive Sync background worker is disabled in settings.")
        return

    logger.info(
        f"Starting Google Drive Ledger Watcher on '{settings.GOOGLE_DRIVE_LEDGER_PATH}' (Interval: {settings.AUTO_DRIVE_SYNC_INTERVAL_SECONDS}s)..."
    )
    while True:
        try:
            check_and_ingest_drive_ledger_once()
        except Exception as e:
            logger.error(f"Drive watcher iteration error: {e}")
        await asyncio.sleep(settings.AUTO_DRIVE_SYNC_INTERVAL_SECONDS)
