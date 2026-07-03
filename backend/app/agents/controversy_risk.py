"""
ControversyRiskAgent
Scores lawsuits, labour concerns, safety incidents, regulatory probes, governance
issues and pollution events. Returns score 0-100.
"""
from typing import List, Any, Dict
from datetime import datetime


CATEGORY_BASE_SCORES = {
    "controversy": 15.0,
    "environmental": 8.0,
    "social": 10.0,
    "governance": 12.0,
    "ai_adoption": 0.0,
    "neutral": 2.0,
}

SEVERITY_MULTIPLIER = 1.5  # multiplies signal.severity (0-10)
RECENCY_DECAY_DAYS = 730  # 2 years


def _days_ago(date_str: str | None) -> int:
    if not date_str:
        return 365
    try:
        d = datetime.strptime(date_str[:10], "%Y-%m-%d")
        return max(0, (datetime.utcnow() - d).days)
    except ValueError:
        return 365


class ControversyRiskAgent:
    def score(self, signals: List[Any]) -> Dict[str, Any]:
        controversy_signals = [
            s for s in signals
            if s.sentiment == "negative" or s.category == "controversy"
        ]

        if not controversy_signals:
            return {
                "controversy_risk": 5.0,
                "controversy_count": 0,
                "top_controversies": [],
                "explanation": "No active controversies detected in available signals.",
            }

        total_risk = 0.0
        top_items = []

        for sig in controversy_signals:
            base = CATEGORY_BASE_SCORES.get(sig.category, 5.0)
            severity_contrib = sig.severity * SEVERITY_MULTIPLIER
            days = _days_ago(sig.date)
            recency_factor = max(0.1, 1.0 - (days / RECENCY_DECAY_DAYS))
            contribution = (base + severity_contrib) * recency_factor
            total_risk += contribution
            top_items.append({
                "title": sig.title,
                "category": sig.category,
                "severity": sig.severity,
                "date": sig.date,
                "contribution": round(contribution, 2),
            })

        # Normalize to 0-100
        risk_score = min(100.0, total_risk)
        top_items.sort(key=lambda x: x["contribution"], reverse=True)

        return {
            "controversy_risk": round(risk_score, 1),
            "controversy_count": len(controversy_signals),
            "top_controversies": top_items[:5],
            "explanation": self._explain(risk_score, len(controversy_signals)),
        }

    def _explain(self, score: float, count: int) -> str:
        if score >= 75:
            return f"Critical controversy risk ({score:.0f}/100). {count} negative signal(s) detected. Investor signal overridden to Risk Alert."
        elif score >= 50:
            return f"Elevated controversy risk ({score:.0f}/100). {count} negative signal(s) require monitoring."
        elif score >= 25:
            return f"Moderate controversy risk ({score:.0f}/100). {count} minor signal(s) detected."
        else:
            return f"Low controversy risk ({score:.0f}/100). {count} signal(s) with limited severity."


controversy_risk_agent = ControversyRiskAgent()
