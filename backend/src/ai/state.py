from typing import Dict, Any
from typing import TypedDict, List, Annotated, Literal, Optional

from langgraph.graph.message import add_messages


class FinancialAgentState(TypedDict):
    messages: Annotated[list, add_messages]
    user_id: str
    next_step: Literal[
        "spend_agent",
        "portfolio_agent",
        "market_agent",
        "FINISH"
    ]
    evidence_records: List[str]


class UnifiedIngestionState(TypedDict, total=False):
    file_path: str
    statement_type: Literal["bank_statement", "demat_statement"]
    account_id: str
    user_id: str
    batch_id: str
    raw_text_chunk: List[str]
    extracted_transactions: List[Dict[str, Any]]
    extracted_holdings: List[Dict[str, Any]]
    staged_transactions: List[Dict[str, Any]]
    staged_holdings: List[Dict[str, Any]]
    staged_count: int
    duplicates_count: int
    errors: List[str]
    skip_staging: bool
    committed_count: int


class ReviewedItem(TypedDict):
    staged_id: str
    user_action: Literal["accept", "skip"]
    final_category: str
    custom_notes: str


class PromotionState(TypedDict):
    user_id: str
    reviewed_items: List[ReviewedItem]
    promoted_transactions_count: int
    discarded_transactions_count: int
    created_custom_categories: List[str]


class MarketScannerState(TypedDict):
    user_id: str
    watchlist_symbols: List[str]
    available_surplus_cash: float
    underweight_sectors: List[str]
    discovered_opportunities: List[Dict[str, Any]]
