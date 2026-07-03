"""
MomentumScoringAgent
Compares signals over time to determine ESG momentum direction and speed.
Score range: -100 to +100
"""
from typing import List, Dict, Any
from datetime import datetime, timedelta


PILLAR_WEIGHTS = {
    "environmental": 0.40,
    "social": 0.30,
    "governance": 0.30,
}

SENTIMENT_SCORE = {"positive": 1.0, "neutral": 0.0, "negative": -1.0}
CATEGORY_PILLAR_MAP = {
    "environmental": "environmental",
    "social": "social",
    "governance": "governance",
    "ai_adoption": "governance",  # treat AI adoption as governance uplift
    "controversy": "social",
    "neutral": "social",
}


def _recency_weight(date_str: str | None, decay_days: int = 365) -> float:
    """Signals from recent months count more."""
    if not date_str:
        return 0.5
    try:
        signal_date = datetime.strptime(date_str[:10], "%Y-%m-%d")
        days_ago = (datetime.utcnow() - signal_date).days
        return max(0.1, 1.0 - (days_ago / decay_days))
    except ValueError:
        return 0.5


class MomentumScoringAgent:
    def calculate(self, signals: List[Any], metrics: List[Any]) -> Dict[str, float]:
        """
        signals: list of Signal ORM objects
        metrics: list of ESGMetric ORM objects
        Returns dict with momentum_score and pillar breakdown.
        """
        pillar_scores: Dict[str, List[float]] = {p: [] for p in PILLAR_WEIGHTS}

        for sig in signals:
            pillar = CATEGORY_PILLAR_MAP.get(sig.category, "social")
            sentiment_val = SENTIMENT_SCORE.get(sig.sentiment or "neutral", 0.0)
            recency = _recency_weight(sig.date)
            controversy_penalty = -sig.severity * 0.5 if sig.category == "controversy" else 0.0
            raw = (sentiment_val * 50 * recency) + controversy_penalty
            pillar_scores[pillar].append(raw)

        # Metric year-over-year comparison (basic)
        metric_by_name: Dict[str, List[Any]] = {}
        for m in metrics:
            metric_by_name.setdefault(m.metric_name, []).append(m)

        for name, entries in metric_by_name.items():
            if len(entries) < 2:
                continue
            entries_sorted = sorted(entries, key=lambda x: x.year or 0)
            oldest, newest = entries_sorted[0], entries_sorted[-1]
            if oldest.value and newest.value and oldest.value != 0:
                change_pct = (newest.value - oldest.value) / abs(oldest.value) * 100
                pillar = entries[0].pillar
                # For emissions, improvement = reduction
                if "emission" in name.lower() or "co2" in name.lower():
                    change_pct = -change_pct
                pillar_scores.get(pillar, pillar_scores["environmental"]).append(
                    max(-100, min(100, change_pct * 0.3))
                )

        pillar_averages: Dict[str, float] = {}
        for pillar, scores in pillar_scores.items():
            pillar_averages[pillar] = round(sum(scores) / len(scores), 2) if scores else 0.0

        momentum = round(
            sum(pillar_averages[p] * w for p, w in PILLAR_WEIGHTS.items()), 2
        )
        momentum = max(-100.0, min(100.0, momentum))

        return {
            "momentum_score": momentum,
            "environmental_momentum": pillar_averages.get("environmental", 0.0),
            "social_momentum": pillar_averages.get("social", 0.0),
            "governance_momentum": pillar_averages.get("governance", 0.0),
        }


momentum_scoring_agent = MomentumScoringAgent()
