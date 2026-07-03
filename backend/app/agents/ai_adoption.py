"""
AIAdoptionAgent
Measures AI transformation using job postings, patents, automation projects,
AI partnerships, product launches and AI infrastructure signals.
Score: 0-100
"""
from typing import List, Any, Dict


AI_SIGNAL_KEYWORDS = {
    "ai_hiring": ["AI engineer", "machine learning engineer", "data scientist", "AI researcher", "MLOps"],
    "ai_patents": ["AI patent", "machine learning patent", "autonomous", "algorithm patent"],
    "ai_partnerships": ["AI partnership", "OpenAI", "Google AI", "Microsoft Azure AI", "NVIDIA", "Anthropic"],
    "ai_product": ["AI product launch", "AI feature", "AI-powered", "generative AI", "chatbot launch"],
    "ai_infrastructure": ["AI infrastructure", "GPU cluster", "AI data center", "AI compute", "TPU"],
    "automation": ["robotic process automation", "RPA", "factory automation", "warehouse robot"],
}

SIGNAL_WEIGHTS = {
    "ai_hiring": 0.20,
    "ai_patents": 0.20,
    "ai_partnerships": 0.15,
    "ai_product": 0.20,
    "ai_infrastructure": 0.15,
    "automation": 0.10,
}


class AIAdoptionAgent:
    def score(self, signals: List[Any], evidences: List[Any]) -> Dict[str, Any]:
        bucket_scores: Dict[str, float] = {k: 0.0 for k in AI_SIGNAL_KEYWORDS}

        all_ai_signals = [s for s in signals if s.category == "ai_adoption"]
        combined_text = " ".join(
            [(s.title or "") + " " + (s.explanation or "") for s in all_ai_signals]
        ).lower()

        for bucket, keywords in AI_SIGNAL_KEYWORDS.items():
            hits = sum(1 for kw in keywords if kw.lower() in combined_text)
            bucket_scores[bucket] = min(100.0, hits * 25.0)

        weighted = sum(bucket_scores[b] * SIGNAL_WEIGHTS[b] for b in SIGNAL_WEIGHTS)
        ai_score = min(100.0, round(weighted, 1))

        active_buckets = [b for b, s in bucket_scores.items() if s > 0]

        return {
            "ai_adoption_score": ai_score,
            "signal_breakdown": bucket_scores,
            "active_signal_types": active_buckets,
            "ai_signal_count": len(all_ai_signals),
            "explanation": self._explain(ai_score, active_buckets),
        }

    def _explain(self, score: float, active: List[str]) -> str:
        readable = {
            "ai_hiring": "AI hiring",
            "ai_patents": "AI patents",
            "ai_partnerships": "AI partnerships",
            "ai_product": "AI product launches",
            "ai_infrastructure": "AI infrastructure",
            "automation": "automation projects",
        }
        labels = [readable.get(b, b) for b in active]
        if score >= 70:
            return f"Strong AI adoption ({score:.0f}/100). Active signals in: {', '.join(labels) if labels else 'multiple areas'}."
        elif score >= 40:
            return f"Moderate AI adoption ({score:.0f}/100). Evidence of: {', '.join(labels) if labels else 'some AI activity'}."
        elif score > 0:
            return f"Early-stage AI adoption ({score:.0f}/100). Limited signals detected."
        else:
            return "No AI adoption signals detected in available data."


ai_adoption_agent = AIAdoptionAgent()
