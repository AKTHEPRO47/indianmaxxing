"""
SignalClassifierAgent
Classifies news, filings, and other text into ESG or AI adoption signal categories.
"""
from typing import Dict, Any
import re


CATEGORY_RULES = {
    "environmental": [
        "emissions", "carbon", "climate", "pollution", "environmental", "renewable",
        "net zero", "biodiversity", "water", "waste", "spill", "deforestation",
    ],
    "social": [
        "employee", "worker", "safety", "diversity", "inclusion", "labor", "labour",
        "human rights", "community", "health", "discrimination", "harassment",
        "modern slavery", "supply chain",
    ],
    "governance": [
        "board", "executive", "corruption", "bribery", "audit", "shareholder",
        "whistleblower", "ethics", "compliance", "data privacy", "cybersecurity",
        "regulatory", "fine", "penalty", "lawsuit", "investigation",
    ],
    "ai_adoption": [
        "artificial intelligence", "machine learning", "automation", "AI strategy",
        "AI patent", "AI partnership", "digital transformation", "algorithm",
        "generative AI", "AI infrastructure", "robotics", "AI hiring",
    ],
    "controversy": [
        "scandal", "lawsuit", "fine", "violation", "greenwashing", "fraud",
        "accident", "disaster", "spill", "explosion", "death", "injury",
        "protest", "boycott", "recall",
    ],
}

SENTIMENT_RULES = {
    "positive": [
        "achieve", "reduce", "commit", "launch", "invest", "partner", "improve",
        "certif", "award", "recognize", "progress", "reach", "target met", "success",
        "breakthrough", "first", "lead",
    ],
    "negative": [
        "fail", "violat", "fine", "penalt", "lawsuit", "scandal", "miss", "decline",
        "increase emission", "accident", "death", "injury", "recall", "probe",
        "investigate", "allege", "charge",
    ],
}


def classify_text(title: str, body: str = "") -> Dict[str, Any]:
    text = (title + " " + body).lower()
    category_scores: Dict[str, int] = {k: 0 for k in CATEGORY_RULES}

    for cat, keywords in CATEGORY_RULES.items():
        for kw in keywords:
            if kw.lower() in text:
                category_scores[cat] += 1

    # Pick highest scoring category
    category = max(category_scores, key=lambda k: category_scores[k])
    if category_scores[category] == 0:
        category = "neutral"

    # Sentiment
    sentiment = "neutral"
    pos_score = sum(1 for w in SENTIMENT_RULES["positive"] if w in text)
    neg_score = sum(1 for w in SENTIMENT_RULES["negative"] if w in text)
    if pos_score > neg_score:
        sentiment = "positive"
    elif neg_score > pos_score:
        sentiment = "negative"

    # Severity for controversies
    severity = 0.0
    if category == "controversy" or sentiment == "negative":
        severity_keywords = ["death", "explosion", "disaster", "fraud", "billion", "criminal"]
        severity = min(10.0, 3.0 + sum(2.0 for w in severity_keywords if w in text))

    confidence = min(0.95, 0.5 + (category_scores.get(category, 0) * 0.08))

    return {
        "category": category,
        "sentiment": sentiment,
        "severity": severity,
        "confidence_score": round(confidence, 2),
    }


class SignalClassifierAgent:
    def classify(self, title: str, body: str = "", source: str = "", date: str = "") -> Dict[str, Any]:
        result = classify_text(title, body)
        explanation = self._generate_explanation(title, result)
        return {**result, "title": title, "source": source, "date": date, "explanation": explanation}

    def _generate_explanation(self, title: str, result: Dict[str, Any]) -> str:
        cat = result["category"]
        sent = result["sentiment"]
        sev = result["severity"]
        mapping = {
            "environmental": "This signal relates to environmental impact or climate action.",
            "social": "This signal relates to social factors including workforce and community.",
            "governance": "This signal relates to corporate governance, ethics or regulatory compliance.",
            "ai_adoption": "This signal indicates AI or digital transformation activity.",
            "controversy": "This signal flags a potential ESG controversy or risk event.",
            "neutral": "This signal has limited ESG relevance based on current analysis.",
        }
        base = mapping.get(cat, "Signal classified by keyword analysis.")
        if sent == "positive":
            base += " Sentiment is positive — potential improvement signal."
        elif sent == "negative":
            base += f" Sentiment is negative — severity rated {sev:.1f}/10."
        return base


signal_classifier_agent = SignalClassifierAgent()
