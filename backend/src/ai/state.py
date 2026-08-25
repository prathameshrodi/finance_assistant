from typing import Annotated, Any, Literal, TypedDict

from langgraph.graph.message import add_messages


class FinancialAgentState(TypedDict):
    messages: Annotated[list, add_messages]
    user_id: str
    next_step: Literal["spend_agent", "portfolio_agent", "market_agent", "FINISH"]
    evidence_records: list[str]


class UnifiedIngestionState(TypedDict, total=False):
    file_path: str
    statement_type: Literal["bank_statement", "demat_statement"]
    account_id: str
    user_id: str
    batch_id: str
    raw_text_chunk: list[str]
    extracted_transactions: list[dict[str, Any]]
    extracted_holdings: list[dict[str, Any]]
    staged_transactions: list[dict[str, Any]]
    staged_holdings: list[dict[str, Any]]
    staged_count: int
    duplicates_count: int
    errors: list[str]
    skip_staging: bool
    committed_count: int


class ReviewedItem(TypedDict):
    staged_id: str
    user_action: Literal["accept", "skip"]
    final_category: str
    custom_notes: str


class PromotionState(TypedDict):
    user_id: str
    reviewed_items: list[ReviewedItem]
    promoted_transactions_count: int
    discarded_transactions_count: int
    created_custom_categories: list[str]


class MarketScannerState(TypedDict):
    user_id: str
    watchlist_symbols: list[str]
    available_surplus_cash: float
    underweight_sectors: list[str]
    discovered_opportunities: list[dict[str, Any]]
