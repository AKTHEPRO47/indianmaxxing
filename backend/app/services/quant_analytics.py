from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models import Evidence, ScoreSnapshot, Signal


def _safe_div(numerator: float, denominator: float) -> float:
    if abs(denominator) < 1e-9:
        return 0.0
    return numerator / denominator


def _parse_dt(value: Optional[str | datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        cleaned = value.replace("Z", "+00:00")
        return datetime.fromisoformat(cleaned)
    except Exception:
        return None


def compute_company_quant_analytics(company_id: int, db: Session, lookback_points: int = 12) -> dict:
    snapshots = (
        db.query(ScoreSnapshot)
        .filter(ScoreSnapshot.company_id == company_id)
        .order_by(desc(ScoreSnapshot.created_at), desc(ScoreSnapshot.id))
        .limit(lookback_points)
        .all()
    )

    if not snapshots:
        return {
            "company_id": company_id,
            "lookback_points": 0,
            "esg_trend_slope": 0.0,
            "momentum_acceleration": 0.0,
            "max_esg_drawdown_pct": 0.0,
            "downside_risk": 0.0,
            "risk_adjusted_momentum": 0.0,
            "signal_quality_score": 0.0,
            "positive_signal_ratio": 0.0,
            "evidence_coverage_ratio": 0.0,
            "data_freshness_days": None,
            "regime": "Insufficient Data",
        }

    # Oldest -> newest for time-series metrics.
    ordered = list(reversed(snapshots))
    esg_values = [float(point.current_esg_score) for point in ordered]
    momentum_values = [float(point.momentum_score) for point in ordered]
    risk_values = [float(point.controversy_risk) for point in ordered]

    n = len(esg_values)
    x_mean = (n - 1) / 2 if n > 0 else 0
    y_mean = sum(esg_values) / n if n > 0 else 0
    cov = sum((idx - x_mean) * (value - y_mean) for idx, value in enumerate(esg_values))
    var_x = sum((idx - x_mean) ** 2 for idx in range(n))
    esg_trend_slope = _safe_div(cov, var_x)

    momentum_changes = [
        momentum_values[idx] - momentum_values[idx - 1]
        for idx in range(1, len(momentum_values))
    ]
    momentum_acceleration = 0.0
    if len(momentum_changes) >= 2:
        momentum_acceleration = momentum_changes[-1] - momentum_changes[-2]
    elif len(momentum_changes) == 1:
        momentum_acceleration = momentum_changes[0]

    running_peak = esg_values[0]
    max_drawdown_pct = 0.0
    for value in esg_values:
        running_peak = max(running_peak, value)
        drawdown = _safe_div(running_peak - value, running_peak) * 100
        max_drawdown_pct = max(max_drawdown_pct, drawdown)

    downside_moves = [
        esg_values[idx] - esg_values[idx - 1]
        for idx in range(1, len(esg_values))
        if (esg_values[idx] - esg_values[idx - 1]) < 0
    ]
    downside_risk = _safe_div(sum(abs(change) for change in downside_moves), len(downside_moves)) if downside_moves else 0.0

    latest_momentum = momentum_values[-1]
    avg_risk = _safe_div(sum(risk_values), len(risk_values))
    risk_adjusted_momentum = latest_momentum * (1.0 - min(1.0, max(0.0, avg_risk / 100.0)))

    signals = (
        db.query(Signal)
        .filter(Signal.company_id == company_id)
        .order_by(desc(Signal.id))
        .limit(200)
        .all()
    )

    if signals:
        weighted_score = 0.0
        total_weight = 0.0
        positives = 0
        for signal in signals:
            confidence = float(signal.confidence_score or 0.0)
            severity = float(signal.severity or 0.0)
            weight = max(0.1, confidence + severity * 0.05)
            sentiment = (signal.sentiment or "neutral").lower()
            direction = 1.0 if sentiment == "positive" else -1.0 if sentiment == "negative" else 0.0
            weighted_score += direction * confidence * weight
            total_weight += weight
            if sentiment == "positive":
                positives += 1
        signal_quality_score = (_safe_div(weighted_score, total_weight) + 1.0) * 50.0
        positive_signal_ratio = _safe_div(positives, len(signals)) * 100.0
    else:
        signal_quality_score = 50.0
        positive_signal_ratio = 0.0

    evidence_count = db.query(Evidence).filter(Evidence.company_id == company_id).count()
    evidence_coverage_ratio = min(100.0, _safe_div(evidence_count, 60.0) * 100.0)

    latest_point = snapshots[0]
    latest_created = _parse_dt(latest_point.created_at)
    data_freshness_days = None
    if latest_created is not None:
        now = datetime.now(timezone.utc)
        if latest_created.tzinfo is None:
            latest_created = latest_created.replace(tzinfo=timezone.utc)
        data_freshness_days = max(0, (now - latest_created).days)

    if latest_momentum >= 20 and avg_risk <= 45 and signal_quality_score >= 55:
        regime = "Compounding Upside"
    elif latest_momentum <= -20 and avg_risk >= 60:
        regime = "De-Rating Risk"
    elif abs(latest_momentum) < 10 and avg_risk < 55:
        regime = "Range-Bound"
    else:
        regime = "Transition"

    return {
        "company_id": company_id,
        "lookback_points": len(snapshots),
        "esg_trend_slope": round(esg_trend_slope, 3),
        "momentum_acceleration": round(momentum_acceleration, 3),
        "max_esg_drawdown_pct": round(max_drawdown_pct, 2),
        "downside_risk": round(downside_risk, 3),
        "risk_adjusted_momentum": round(risk_adjusted_momentum, 3),
        "signal_quality_score": round(max(0.0, min(100.0, signal_quality_score)), 2),
        "positive_signal_ratio": round(max(0.0, min(100.0, positive_signal_ratio)), 2),
        "evidence_coverage_ratio": round(evidence_coverage_ratio, 2),
        "data_freshness_days": data_freshness_days,
        "regime": regime,
    }
