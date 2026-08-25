import calendar
import logging
from datetime import date, timedelta

from src.database import SessionLocal
from src.models import Account, Category, Transaction, User
from src.repositories import PortfolioRepository

logger = logging.getLogger(__name__)


def compute_spending_and_behavioral_analytics(user_id: str = "") -> dict:
    """
    Computes comprehensive quantitative metrics on spending trends, habits,
    recurring leakages, and investment velocity from SQLite.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=user_id).first() if user_id else db.query(User).first()
        if not user:
            return {}

        uid = user.id
        today = date.today()
        salary = float(user.monthly_salary or 100000.0)

        # 1. Fetch all live transactions
        txns = (
            db.query(Transaction).filter(Transaction.user_id == uid).order_by(Transaction.transaction_date.desc()).all()
        )

        categories_map = {c.id: (c.name, c.category_type) for c in db.query(Category).all()}

        # 2. Month-over-Month Historical Spending (Last 6 Months)
        monthly_trend = []
        for i in range(5, -1, -1):
            m_date = today - timedelta(days=i * 30)
            m_year = m_date.year
            m_month = m_date.month
            m_name = calendar.month_abbr[m_month]

            m_txns = [t for t in txns if t.transaction_date.year == m_year and t.transaction_date.month == m_month]

            debits = sum(t.amount for t in m_txns if (t.txn_type or "debit").lower() == "debit")
            credits = sum(t.amount for t in m_txns if (t.txn_type or "debit").lower() == "credit")
            income = credits if credits > 0 else salary
            invested = max(income - debits, 0.0)
            savings_rate = round((invested / income) * 100, 1) if income > 0 else 0.0

            monthly_trend.append(
                {
                    "month": f"{m_name} {m_year}",
                    "spent": round(debits, 2),
                    "income": round(income, 2),
                    "savings_surplus": round(invested, 2),
                    "savings_rate_pct": savings_rate,
                }
            )

        # 3. Day of Week Distribution (Mon to Sun)
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        dow_spent = {d: 0.0 for d in day_names}
        dow_counts = {d: 0 for d in day_names}

        for t in txns:
            if (t.txn_type or "debit").lower() == "debit":
                d_name = day_names[t.transaction_date.weekday()]
                dow_spent[d_name] += t.amount
                dow_counts[d_name] += 1

        day_of_week_analysis = [
            {
                "day": d,
                "total_spent": round(dow_spent[d], 2),
                "txn_count": dow_counts[d],
                "avg_ticket_size": round(dow_spent[d] / dow_counts[d], 2) if dow_counts[d] > 0 else 0.0,
                "is_weekend": d in ["Friday", "Saturday", "Sunday"],
            }
            for d in day_names
        ]

        weekend_spend = dow_spent["Friday"] + dow_spent["Saturday"] + dow_spent["Sunday"]
        weekday_spend = sum(dow_spent[d] for d in ["Monday", "Tuesday", "Wednesday", "Thursday"])
        total_debit_all = weekend_spend + weekday_spend
        weekend_spend_pct = round((weekend_spend / total_debit_all) * 100, 1) if total_debit_all > 0 else 0.0

        # 4. Category Breakdown & Velocity
        cat_sums: dict[str, float] = {}
        for t in txns:
            if (t.txn_type or "debit").lower() == "debit":
                cat_info = categories_map.get(t.category_id, ("Other Expenses", "expense"))
                c_name = cat_info[0]
                cat_sums[c_name] = cat_sums.get(c_name, 0.0) + t.amount

        total_spent_lifetime = sum(cat_sums.values())
        category_analytics = [
            {
                "category": c,
                "total_spent": round(amt, 2),
                "share_pct": round((amt / total_spent_lifetime) * 100, 1) if total_spent_lifetime > 0 else 0.0,
                "is_discretionary": c.lower() in ["shopping", "food & dining", "entertainment", "travel"],
            }
            for c, amt in sorted(cat_sums.items(), key=lambda x: x[1], reverse=True)
        ]

        # 5. Recurring Leakage & Subscriptions Detection
        desc_counts: dict[str, list[Transaction]] = {}
        for t in txns:
            if (t.txn_type or "debit").lower() == "debit":
                key = t.description.strip().lower()
                desc_counts.setdefault(key, []).append(t)

        recurring_subscriptions = []
        for desc, t_list in desc_counts.items():
            if len(t_list) >= 2:
                avg_amt = sum(t.amount for t in t_list) / len(t_list)
                recurring_subscriptions.append(
                    {
                        "name": t_list[0].description,
                        "occurrences": len(t_list),
                        "avg_amount": round(avg_amt, 2),
                        "total_spent": round(sum(t.amount for t in t_list), 2),
                        "frequency": "Monthly" if len(t_list) <= 6 else "Frequent",
                        "annual_drain": round(avg_amt * 12, 2),
                    }
                )

        recurring_subscriptions = sorted(recurring_subscriptions, key=lambda x: x["total_spent"], reverse=True)[:5]
        annual_subscription_drain = sum(r["annual_drain"] for r in recurring_subscriptions)

        # 6. Current Month 50/30/20 Compliance
        curr_month_txns = [
            t for t in txns if t.transaction_date.year == today.year and t.transaction_date.month == today.month
        ]
        curr_spent = sum(t.amount for t in curr_month_txns if (t.txn_type or "debit").lower() == "debit")

        needs_cats = ["housing & rent", "bills & utilities", "healthcare", "groceries"]
        wants_cats = ["food & dining", "shopping", "entertainment", "travel", "other expenses"]

        needs_spent = sum(
            t.amount
            for t in curr_month_txns
            if (t.txn_type or "debit").lower() == "debit"
            and categories_map.get(t.category_id, ("", ""))[0].lower() in needs_cats
        )
        wants_spent = sum(
            t.amount
            for t in curr_month_txns
            if (t.txn_type or "debit").lower() == "debit"
            and categories_map.get(t.category_id, ("", ""))[0].lower() in wants_cats
        )
        invested_spent = max(salary - curr_spent, 0.0)

        needs_pct = round((needs_spent / salary) * 100, 1) if salary > 0 else 0.0
        wants_pct = round((wants_spent / salary) * 100, 1) if salary > 0 else 0.0
        invest_pct = round((invested_spent / salary) * 100, 1) if salary > 0 else 0.0

        # 7. Overall Financial Wellness & Behavioral Score (0 - 100)
        score = 65
        if invest_pct >= 20.0:
            score += 15
        elif invest_pct >= 10.0:
            score += 8

        if needs_pct <= 50.0:
            score += 10
        elif needs_pct > 65.0:
            score -= 10

        if wants_pct <= 30.0:
            score += 10
        else:
            score -= 8

        if weekend_spend_pct > 55.0:
            score -= 5  # Impulse penalty

        score = max(min(score, 98), 35)

        # Behavioral Archetype
        if invest_pct >= 30:
            archetype = "Disciplined Wealth Accumulator"
            archetype_desc = "High savings rate with systematic capital compounding."
        elif weekend_spend_pct > 50:
            archetype = "Weekend Lifestyle Spender"
            archetype_desc = "Spends heavily on dining and leisure during weekends."
        elif needs_pct > 60:
            archetype = "Fixed-Cost Constrained"
            archetype_desc = "High proportion of income tied to fixed obligations and bills."
        else:
            archetype = "Balanced Value Seeker"
            archetype_desc = "Maintains a healthy balance between lifestyle and savings."

        # 8. Portfolio Wealth Velocity
        portfolio_repo = PortfolioRepository(db, uid)
        holdings = portfolio_repo.get_holdings_with_market_prices()
        total_port_value = sum(h["current_value"] for h in holdings)
        total_cost_basis = sum(h["cost_basis"] for h in holdings)
        portfolio_unrealized_pnl = round(total_port_value - total_cost_basis, 2)
        portfolio_return_pct = (
            round((portfolio_unrealized_pnl / total_cost_basis) * 100, 1) if total_cost_basis > 0 else 0.0
        )

        # Emergency Runway (Months)
        monthly_burn_avg = total_spent_lifetime / max(len(monthly_trend), 1) if monthly_trend else salary * 0.5
        accounts = db.query(Account).filter_by(user_id=uid).all()
        liquid_cash = sum(
            float(a.balance_snapshot or 0.0) for a in accounts if a.account_type in ["savings", "current", "cash"]
        )
        runway_months = round(liquid_cash / monthly_burn_avg, 1) if monthly_burn_avg > 0 else 6.0

        # AI Actionable Prescriptions
        prescriptions = []
        if wants_pct > 30.0:
            prescriptions.append(
                {
                    "type": "spend_cap",
                    "priority": "High",
                    "title": f"Cap Discretionary Wants by ₹{round(wants_spent - salary * 0.3, 0):,.0f}",
                    "description": f"Your Wants spending is currently {wants_pct}% of income (ideal is 30%). Trimming Swiggy/Zomato orders could save ₹{round(wants_spent * 0.2, 0):,.0f} monthly.",
                }
            )
        if weekend_spend_pct > 45.0:
            prescriptions.append(
                {
                    "type": "weekend_alert",
                    "priority": "Medium",
                    "title": "Weekend Spending Surge Detected",
                    "description": f"{weekend_spend_pct}% of all your debits occur between Friday and Sunday. Setting a weekend spending envelope of ₹{round(salary * 0.08, 0):,.0f} protects your month-end runway.",
                }
            )
        if recurring_subscriptions:
            prescriptions.append(
                {
                    "type": "subscription_audit",
                    "priority": "Low",
                    "title": f"Audit {len(recurring_subscriptions)} Recurring Charges (₹{annual_subscription_drain:,.0f}/yr)",
                    "description": f"You have {len(recurring_subscriptions)} recurring payments draining ₹{annual_subscription_drain:,.0f} annually. Cancel unused digital subscriptions.",
                }
            )
        if invest_pct < 20.0:
            prescriptions.append(
                {
                    "type": "invest_boost",
                    "priority": "High",
                    "title": f"Boost Monthly SIP by ₹{round(salary * 0.20 - invested_spent, 0):,.0f}",
                    "description": f"Automate a ₹{round(salary * 0.20, 0):,.0f} transfer into Nifty 50 Index ETF on salary credit day to reach the 20% savings gold standard.",
                }
            )

        return {
            "user_name": user.full_name,
            "monthly_salary": salary,
            "financial_health_score": score,
            "archetype": archetype,
            "archetype_desc": archetype_desc,
            "emergency_runway_months": runway_months,
            "liquid_cash": liquid_cash,
            "total_portfolio_value": total_port_value,
            "portfolio_unrealized_pnl": portfolio_unrealized_pnl,
            "portfolio_return_pct": portfolio_return_pct,
            "rule_503020": {
                "needs_spent": needs_spent,
                "needs_pct": needs_pct,
                "wants_spent": wants_spent,
                "wants_pct": wants_pct,
                "invest_spent": invested_spent,
                "invest_pct": invest_pct,
            },
            "monthly_trends": monthly_trend,
            "day_of_week_analysis": day_of_week_analysis,
            "weekend_spend_pct": weekend_spend_pct,
            "category_analytics": category_analytics[:6],
            "recurring_subscriptions": recurring_subscriptions,
            "annual_subscription_drain": annual_subscription_drain,
            "ai_prescriptions": prescriptions,
        }
    finally:
        db.close()
