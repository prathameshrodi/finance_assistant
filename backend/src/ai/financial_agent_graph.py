import logging
from datetime import date

from langchain_core.messages import AIMessage
from langchain_ollama import ChatOllama
from langgraph.graph import END, START, StateGraph

from src.ai.state import FinancialAgentState
from src.config import settings
from src.database import SessionLocal
from src.models import User
from src.repositories import LedgerRepository, MarketRepository, PortfolioRepository

logger = logging.getLogger(__name__)

# Initialize local Copilot LLM
copilot_llm = ChatOllama(
    model=settings.OLLAMA_COPILOT_MODEL,
    temperature=0.1,
)


def fetch_user_financial_context(user_id: str) -> dict:
    """Aggregates real-time financial context from SQLite to ground the Copilot."""
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            user = db.query(User).first()
        uid = user.id if user else "default"

        ledger_repo = LedgerRepository(db, uid)
        portfolio_repo = PortfolioRepository(db, uid)
        market_repo = MarketRepository(db, uid)

        today = date.today()
        burn = ledger_repo.get_monthly_burn_rate(today.year, today.month)
        cats = ledger_repo.get_spending_by_category(date(today.year, today.month, 1), today)
        holdings = portfolio_repo.get_holdings_with_market_prices()
        opps = market_repo.get_active_opportunities()

        total_spent = burn.get("total_spent", 0.0)
        daily_burn = burn.get("daily_burn_rate", 0.0)
        monthly_salary = float(user.monthly_salary) if user else 100000.00
        cash_surplus = max(monthly_salary - total_spent, 0.0)
        portfolio_val = sum(h.get("current_value", 0.0) for h in holdings)

        top_categories = [f"{c['category']}: ₹{c['total_spent']:,.0f}" for c in cats[:4]]
        holdings_summary = [
            f"{h['symbol']} ({h['asset_class']}): {h['quantity']} units @ ₹{h['avg_buy_price']}" for h in holdings[:5]
        ]
        top_opps = [
            f"{o.symbol} (RSI: {o.technical_indicators.get('rsi_14', 32):.1f}) - {o.thesis[:60]}..." for o in opps[:3]
        ]

        return {
            "user_name": user.full_name if user else "Investor",
            "monthly_salary": monthly_salary,
            "total_spent_this_month": total_spent,
            "daily_burn_rate": daily_burn,
            "cash_surplus": cash_surplus,
            "total_portfolio_value": portfolio_val,
            "top_categories": ", ".join(top_categories) if top_categories else "None recorded yet",
            "holdings_summary": "; ".join(holdings_summary) if holdings_summary else "No holdings recorded",
            "market_radar": "; ".join(top_opps) if top_opps else "No active dips",
        }
    finally:
        db.close()


COPILOT_SYSTEM_PROMPT = """
You are an expert AI Financial Advisor and Copilot for {user_name}.
You provide sharp, concise, actionable financial advice based on the user's real SQLite financial ledger.

LIVE FINANCIAL PROFILE:
- Monthly Salary: ₹{monthly_salary:,.2f}
- Spent This Month: ₹{total_spent_this_month:,.2f} (Daily Burn: ₹{daily_burn_rate:,.2f}/day)
- Available Cash Surplus: ₹{cash_surplus:,.2f}
- Top Spending Categories: {top_categories}
- Total Portfolio Value: ₹{total_portfolio_value:,.2f}
- Current Holdings: {holdings_summary}
- Active Market Opportunities: {market_radar}

INSTRUCTIONS:
1. Always ground your calculations in the numbers provided above.
2. If the user asks about spends, calculate their remaining runway against their monthly salary.
3. If the user asks about investments or stocks, suggest prudent capital allocation from their available cash surplus (₹{cash_surplus:,.2f}).
4. Keep answers structured with bullet points, bold key metrics, and actionable recommendations.
"""


from src.ai.llm_engine import generate_llm_response


def financial_copilot_node(state: FinancialAgentState) -> dict:
    """Processes user queries with full database context."""
    user_id = state.get("user_id", "")
    context = fetch_user_financial_context(user_id)

    formatted_system = COPILOT_SYSTEM_PROMPT.format(**context)
    user_msgs = state.get("messages", [])
    user_prompt = user_msgs[-1].content if user_msgs else "What is my financial status?"

    response_text = generate_llm_response(prompt=user_prompt, system_prompt=formatted_system)
    response = AIMessage(content=response_text)
    return {"messages": [response]}


def create_financial_copilot_graph():
    """Builds and compiles the Financial Copilot LangGraph."""
    workflow = StateGraph(FinancialAgentState)
    workflow.add_node("financial_copilot", financial_copilot_node)
    workflow.add_edge(START, "financial_copilot")
    workflow.add_edge("financial_copilot", END)
    return workflow.compile()
