"""
Core ESG scoring service. Orchestrates all agents and calculates final scores.
Classification rules are transparent and editable here.
"""
from typing import List, Any, Dict, Tuple
from sqlalchemy.orm import Session
from app.models import Company, ESGMetric, Signal, Evidence, ScoreSnapshot
from app.agents import (
    momentum_scoring_agent,
    controversy_risk_agent,
    ai_adoption_agent,
    greenwashing_detector_agent,
)


# ──────────────────────────────────────────────
# Pillar weight configuration — edit here
# ──────────────────────────────────────────────
PILLAR_WEIGHTS = {
    "environmental": 0.40,
    "social": 0.30,
    "governance": 0.30,
}

PILLAR_METRIC_MAP = {
    "environmental": ["Scope 1 Emissions", "Scope 2 Emissions", "Scope 3 Emissions", "Renewable Energy Share"],
    "social": ["Women in Leadership", "Employee Turnover", "Lost Time Injury Rate"],
    "governance": ["Board Independence"],
}

# ──────────────────────────────────────────────
# Classification thresholds — edit here
# ──────────────────────────────────────────────
CLASSIFICATION_RULES = {
    "Hidden Winner":      {"esg_max": 59.9, "momentum_min": 20.0},
    "Future Leader":      {"esg_min": 60.0, "momentum_min": 20.0},
    "Value Trap":         {"esg_max": 59.9, "momentum_max": -20.0},
    "Overrated Leader":   {"esg_min": 60.0, "momentum_max": -20.0},
    "Watchlist":          {},  # catch-all
}

CONTROVERSY_RISK_ALERT_THRESHOLD = 75.0


def _score_pillar_from_metrics(metrics: List[Any], pillar: str) -> float:
    """Simple scoring from metric values — returns 0-100."""
    relevant = [m for m in metrics if m.pillar == pillar]
    if not relevant:
        return 50.0  # no data defaults to neutral

    scores = []
    for m in relevant:
        if m.value is None:
            continue
        # Emissions: lower is better, invert
        if "emission" in m.metric_name.lower() or "co2" in m.metric_name.lower():
            # Rough benchmark: <10,000 tCO2e good, >1M bad
            inv = max(0.0, 100.0 - (m.value / 10000.0))
            scores.append(min(100.0, inv) * m.confidence_score)
        elif m.unit == "%":
            scores.append(min(100.0, m.value) * m.confidence_score)
        else:
            scores.append(50.0 * m.confidence_score)

    if not scores:
        # Use signal sentiment as proxy
        positive_signals = sum(1 for m in relevant if m.confidence_score > 0.6)
        return 40.0 + min(40.0, positive_signals * 8.0)

    return round(sum(scores) / len(scores), 1)


def _score_pillar_from_signals(signals: List[Any], pillar: str) -> float:
    mapping = {"environmental": "environmental", "social": "social", "governance": "governance"}
    cat = mapping.get(pillar, pillar)
    relevant = [s for s in signals if s.category == cat]
    if not relevant:
        return 50.0
    pos = sum(1 for s in relevant if s.sentiment == "positive")
    neg = sum(1 for s in relevant if s.sentiment == "negative")
    total = len(relevant)
    base = 50.0 + ((pos - neg) / total) * 30.0
    return round(max(0.0, min(100.0, base)), 1)


def classify(esg_score: float, momentum: float, controversy_risk: float) -> Tuple[str, str]:
    classification = "Watchlist"
    if esg_score < 60 and momentum > 20:
        classification = "Hidden Winner"
    elif esg_score >= 60 and momentum > 20:
        classification = "Future Leader"
    elif esg_score < 60 and momentum < -20:
        classification = "Value Trap"
    elif esg_score >= 60 and momentum < -20:
        classification = "Overrated Leader"

    # Investor signal
    if controversy_risk >= CONTROVERSY_RISK_ALERT_THRESHOLD:
        investor_signal = "Risk Alert"
    elif classification in ("Hidden Winner", "Future Leader"):
        investor_signal = "Buy / Watchlist"
    elif classification == "Watchlist":
        investor_signal = "Hold"
    elif classification == "Value Trap":
        investor_signal = "Avoid"
    else:  # Overrated Leader
        investor_signal = "Hold"

    return classification, investor_signal


def _confidence_from_evidence(evidences: List[Any]) -> float:
    if not evidences:
        return 0.20
    avg_conf = sum(e.confidence_score for e in evidences) / len(evidences)
    volume_bonus = min(0.20, len(evidences) * 0.01)
    return round(min(0.95, avg_conf + volume_bonus), 2)


def calculate_scores(company_id: int, db: Session) -> ScoreSnapshot:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise ValueError(f"Company {company_id} not found")

    metrics = db.query(ESGMetric).filter(ESGMetric.company_id == company_id).all()
    signals = db.query(Signal).filter(Signal.company_id == company_id).all()
    evidences = db.query(Evidence).filter(Evidence.company_id == company_id).all()

    # Pillar scores
    env_from_metrics = _score_pillar_from_metrics(metrics, "environmental")
    soc_from_metrics = _score_pillar_from_metrics(metrics, "social")
    gov_from_metrics = _score_pillar_from_metrics(metrics, "governance")

    env_from_signals = _score_pillar_from_signals(signals, "environmental")
    soc_from_signals = _score_pillar_from_signals(signals, "social")
    gov_from_signals = _score_pillar_from_signals(signals, "governance")

    # Blend metric-based and signal-based (60/40 if metrics exist, else 100% signals)
    has_metrics = len(metrics) > 0
    blend = (0.6, 0.4) if has_metrics else (0.0, 1.0)

    env_score = round(env_from_metrics * blend[0] + env_from_signals * blend[1], 1)
    soc_score = round(soc_from_metrics * blend[0] + soc_from_signals * blend[1], 1)
    gov_score = round(gov_from_metrics * blend[0] + gov_from_signals * blend[1], 1)

    current_esg_score = round(
        env_score * PILLAR_WEIGHTS["environmental"]
        + soc_score * PILLAR_WEIGHTS["social"]
        + gov_score * PILLAR_WEIGHTS["governance"],
        1,
    )

    # Momentum
    momentum_result = momentum_scoring_agent.calculate(signals, metrics)
    momentum_score = momentum_result["momentum_score"]

    # AI adoption
    ai_result = ai_adoption_agent.score(signals, evidences)
    ai_adoption_score = ai_result["ai_adoption_score"]

    # Controversy risk
    controversy_result = controversy_risk_agent.score(signals)
    controversy_risk = controversy_result["controversy_risk"]

    # Confidence
    confidence_score = _confidence_from_evidence(evidences)

    # Classification
    classification, investor_signal = classify(current_esg_score, momentum_score, controversy_risk)

    snapshot = ScoreSnapshot(
        company_id=company_id,
        current_esg_score=current_esg_score,
        momentum_score=momentum_score,
        ai_adoption_score=ai_adoption_score,
        controversy_risk=controversy_risk,
        confidence_score=confidence_score,
        environmental_score=env_score,
        social_score=soc_score,
        governance_score=gov_score,
        classification=classification,
        investor_signal=investor_signal,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot
