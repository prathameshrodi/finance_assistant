import json
import logging
from typing import Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, START, END

from src.config import settings
from src.services.behavioral_analytics_service import compute_spending_and_behavioral_analytics

logger = logging.getLogger(__name__)

ai_coach_llm = ChatOllama(
    model=settings.OLLAMA_COPILOT_MODEL,
    temperature=0.2,
)

BEHAVIORAL_COACH_PROMPT = """
You are an expert Behavioral Finance Psychologist and Wealth Architect.
Analyze the user's spending psychology, habit patterns, and wealth accumulation trajectory.

USER FINANCIAL PROFILE & QUANTITATIVE DATA:
- Monthly Salary: ₹{monthly_salary:,.0f}
- Financial Health Score: {financial_health_score}/100
- Behavioral Archetype: {archetype} ({archetype_desc})
- Emergency Runway: {emergency_runway_months} months of expenses
- 50/30/20 Breakdown: Needs: {rule_503020[needs_pct]}%, Wants: {rule_503020[wants_pct]}%, Investments: {rule_503020[invest_pct]}%
- Weekend Spending Share: {weekend_spend_pct}% of total debits
- Top Expense Categories: {top_cats_summary}
- Annual Subscription Drain: ₹{annual_subscription_drain:,.0f}/year across recurring charges
- Total Portfolio Value: ₹{total_portfolio_value:,.0f} (Unrealized P&L: ₹{portfolio_unrealized_pnl:,.0f})

INSTRUCTIONS:
Provide a structured, deep behavioral analysis with:
1. **Behavioral Psychology Verdict**: Why the user spends the way they do and psychological friction points.
2. **Micro-Leakage Diagnosis**: Hidden drains (weekend dining, recurring subscriptions).
3. **90-Day Wealth Optimization Blueprint**: 3 concrete milestones to elevate their savings rate and emergency runway.

Format in clean markdown with bullet points and bold financial metrics.
"""


def generate_ai_behavioral_prognosis(user_id: str = "") -> dict:
    """Runs the AI flow to synthesize behavioral spending insights."""
    analytics = compute_spending_and_behavioral_analytics(user_id)
    if not analytics:
        return {"error": "User financial data not found"}

    top_cats = [f"{c['category']}: ₹{c['total_spent']:,.0f} ({c['share_pct']}%)" for c in analytics.get("category_analytics", [])[:4]]
    analytics["top_cats_summary"] = ", ".join(top_cats) if top_cats else "None recorded"

    formatted_prompt = BEHAVIORAL_COACH_PROMPT.format(**analytics)

    try:
        response = ai_coach_llm.invoke([
            SystemMessage(content="You are a seasoned behavioral economist. Ground all insights directly in the numbers provided."),
            HumanMessage(content=formatted_prompt),
        ])
        prognosis_text = response.content
    except Exception as e:
        logger.error(f"Error generating AI behavioral prognosis: {e}")
        prognosis_text = (
            f"**Behavioral Spending Assessment for {analytics.get('user_name', 'Investor')}:**\n\n"
            f"• **Archetype:** **{analytics.get('archetype', 'Balanced Investor')}** — Your 50/30/20 compliance is at **{analytics.get('rule_503020', {}).get('invest_pct', 0)}%**.\n"
            f"• **Weekend Concentration:** **{analytics.get('weekend_spend_pct', 0)}%** of your spending is clustered between Friday and Sunday.\n"
            f"• **Emergency Buffer:** You have **{analytics.get('emergency_runway_months', 0)} months** of living expenses secured in liquid cash."
        )

    return {
        "analytics": analytics,
        "ai_prognosis": prognosis_text,
    }
