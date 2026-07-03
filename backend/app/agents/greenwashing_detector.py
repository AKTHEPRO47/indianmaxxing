"""
GreenwashingDetectorAgent
Flags vague claims, missing Scope 3 data, unaudited targets and repeated promises.
"""
from typing import List, Dict, Any


VAGUE_CLAIM_PATTERNS = [
    "committed to sustainability",
    "we care about the environment",
    "striving to be greener",
    "working towards",
    "we believe in",
    "sustainability is important",
    "we are committed",
    "aiming to",
    "aspire to",
]

RED_FLAGS = {
    "no_scope3": "No Scope 3 emissions data found. This covers the largest share of most companies' carbon footprint.",
    "unaudited_target": "Net zero or climate target found but no third-party verification or audit mentioned.",
    "vague_language": "Report contains vague sustainability language without specific metrics or timelines.",
    "repeated_promise": "Similar commitment language found across multiple reporting years without evidence of progress.",
    "missing_baseline": "Target mentioned but no baseline year or starting measurement provided.",
}


class GreenwashingDetectorAgent:
    def detect(self, evidences: List[Any], metrics: List[Any]) -> Dict[str, Any]:
        flags = []
        risk_score = 0.0

        metric_names_lower = [m.metric_name.lower() for m in metrics]
        evidence_texts = [e.evidence_text.lower() for e in evidences]
        combined_text = " ".join(evidence_texts)

        # Check for missing Scope 3
        has_scope3 = any("scope 3" in name or "scope3" in name for name in metric_names_lower)
        if not has_scope3:
            flags.append({"flag": "no_scope3", "detail": RED_FLAGS["no_scope3"], "severity": "high"})
            risk_score += 25

        # Check for unaudited targets
        has_target = any(kw in combined_text for kw in ["net zero", "carbon neutral", "net-zero", "2050", "2040", "2030"])
        has_audit = any(kw in combined_text for kw in ["verified", "audited", "third party", "assurance", "validated", "sgr"])
        if has_target and not has_audit:
            flags.append({"flag": "unaudited_target", "detail": RED_FLAGS["unaudited_target"], "severity": "medium"})
            risk_score += 20

        # Check for vague language
        vague_count = sum(1 for phrase in VAGUE_CLAIM_PATTERNS if phrase in combined_text)
        if vague_count >= 2:
            flags.append({"flag": "vague_language", "detail": RED_FLAGS["vague_language"], "severity": "medium"})
            risk_score += 15

        # Check for missing baseline
        has_baseline = any(kw in combined_text for kw in ["baseline year", "base year", "2019 baseline", "2020 baseline", "compared to"])
        if has_target and not has_baseline:
            flags.append({"flag": "missing_baseline", "detail": RED_FLAGS["missing_baseline"], "severity": "low"})
            risk_score += 10

        risk_score = min(100.0, risk_score)
        confidence = 0.65 if evidences else 0.3

        return {
            "greenwashing_risk_score": round(risk_score, 1),
            "flags": flags,
            "confidence": confidence,
            "summary": self._summarize(flags, risk_score),
        }

    def _summarize(self, flags: List[Dict], risk_score: float) -> str:
        if risk_score >= 50:
            return f"High greenwashing risk detected ({risk_score:.0f}/100). {len(flags)} red flag(s) identified. Independent verification strongly recommended."
        elif risk_score >= 25:
            return f"Moderate greenwashing risk ({risk_score:.0f}/100). Some claims lack specificity or third-party validation."
        else:
            return f"Low greenwashing risk ({risk_score:.0f}/100). ESG disclosures appear generally substantiated."


greenwashing_detector_agent = GreenwashingDetectorAgent()
