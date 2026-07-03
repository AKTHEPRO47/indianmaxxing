"""
DocumentExtractorAgent
Reads PDF text and extracts structured ESG KPIs with evidence and page numbers.
Swap mock_llm_extract() for a real LLM call when API key is available.
"""
from typing import List, Dict, Any
import re

from app.services.openai_client import complete_json, llm_enabled


ESG_KEYWORDS = {
    "environmental": [
        "emissions", "carbon", "co2", "greenhouse gas", "scope 1", "scope 2", "scope 3",
        "net zero", "renewable energy", "energy consumption", "water usage", "waste",
        "biodiversity", "climate target", "carbon neutral", "clean energy",
    ],
    "social": [
        "employee", "safety", "diversity", "inclusion", "gender", "human rights",
        "labour", "labor", "training", "community", "health", "wellbeing", "turnover",
        "injury rate", "supply chain", "modern slavery",
    ],
    "governance": [
        "board independence", "audit committee", "executive compensation", "shareholder",
        "anti-corruption", "bribery", "transparency", "whistleblower", "data privacy",
        "cybersecurity", "ethics", "compliance", "board diversity",
    ],
    "ai_adoption": [
        "artificial intelligence", "machine learning", "automation", "AI", "deep learning",
        "neural network", "robotics", "digital transformation", "algorithm", "predictive",
        "generative AI", "large language model", "AI infrastructure",
    ],
}

METRIC_PATTERNS = [
    (r"scope\s*1\s*emissions?\s*:?\s*([\d,\.]+)\s*(mt|tco2|tonne|ton)", "Scope 1 Emissions", "environmental", "tCO2e"),
    (r"scope\s*2\s*emissions?\s*:?\s*([\d,\.]+)\s*(mt|tco2|tonne|ton)", "Scope 2 Emissions", "environmental", "tCO2e"),
    (r"scope\s*3\s*emissions?\s*:?\s*([\d,\.]+)\s*(mt|tco2|tonne|ton)", "Scope 3 Emissions", "environmental", "tCO2e"),
    (r"renewable\s*energy\s*:?\s*([\d,\.]+)\s*%", "Renewable Energy Share", "environmental", "%"),
    (r"women\s*in\s*(?:leadership|management|board)\s*:?\s*([\d,\.]+)\s*%", "Women in Leadership", "social", "%"),
    (r"employee\s*(?:turnover|attrition)\s*:?\s*([\d,\.]+)\s*%", "Employee Turnover", "social", "%"),
    (r"lost\s*time\s*injury\s*rate\s*:?\s*([\d,\.]+)", "Lost Time Injury Rate", "social", "per 200k hrs"),
    (r"independent\s*directors?\s*:?\s*([\d,\.]+)\s*%", "Board Independence", "governance", "%"),
]


def mock_llm_extract(text: str, page_num: int) -> List[Dict[str, Any]]:
    """Mock LLM extraction — replaces with real LLM call when key available."""
    results = []
    text_lower = text.lower()

    # Pattern-based metric extraction
    for pattern, metric_name, pillar, unit in METRIC_PATTERNS:
        for match in re.finditer(pattern, text_lower):
            try:
                value_str = match.group(1).replace(",", "")
                value = float(value_str)
                # Find surrounding context (evidence)
                start = max(0, match.start() - 120)
                end = min(len(text), match.end() + 120)
                snippet = text[start:end].strip()
                results.append({
                    "metric_name": metric_name,
                    "pillar": pillar,
                    "value": value,
                    "unit": unit,
                    "page_number": page_num,
                    "evidence_text": snippet,
                    "confidence_score": 0.78,
                })
            except (ValueError, IndexError):
                continue

    # Keyword-based evidence extraction
    for pillar, keywords in ESG_KEYWORDS.items():
        for keyword in keywords:
            idx = text_lower.find(keyword.lower())
            if idx != -1:
                start = max(0, idx - 80)
                end = min(len(text), idx + 200)
                snippet = text[start:end].strip()
                if len(snippet) > 50:
                    results.append({
                        "metric_name": keyword.title(),
                        "pillar": pillar,
                        "value": None,
                        "unit": None,
                        "page_number": page_num,
                        "evidence_text": snippet,
                        "confidence_score": 0.55,
                    })
                    break  # one per pillar per page to avoid flooding

    return results


def openai_extract(text: str, page_num: int) -> List[Dict[str, Any]]:
    system_prompt = (
        "You extract ESG evidence from sustainability report pages. "
        "Return JSON only with this shape: {\"items\": [{...}]}. "
        "Each item may include metric_name, pillar, value, unit, evidence_text, confidence_score. "
        "pillar must be one of environmental, social, governance, ai_adoption. "
        "Use value=null if there is no numeric KPI. Keep evidence_text verbatim or nearly verbatim from the page. "
        "Only return items supported by the supplied text."
    )
    user_prompt = (
        f"Page number: {page_num}\n"
        "Extract the most relevant ESG KPIs and supporting evidence from this page. "
        "Prefer concrete numbers such as emissions, renewable energy, workforce diversity, injury rate, and board independence.\n\n"
        f"Page text:\n{text[:7000]}"
    )
    payload = complete_json(system_prompt, user_prompt, max_tokens=900)
    raw_items = payload.get("items", []) if isinstance(payload, dict) else []

    results: List[Dict[str, Any]] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        pillar = item.get("pillar")
        if pillar not in ESG_KEYWORDS:
            continue
        evidence_text = (item.get("evidence_text") or "").strip()
        if len(evidence_text) < 30:
            continue
        value = item.get("value")
        if isinstance(value, str):
            try:
                value = float(value.replace(",", "").strip())
            except ValueError:
                value = None
        confidence_score = item.get("confidence_score", 0.72)
        try:
            confidence_score = max(0.0, min(1.0, float(confidence_score)))
        except (TypeError, ValueError):
            confidence_score = 0.72

        results.append({
            "metric_name": (item.get("metric_name") or pillar.replace("_", " ").title()).strip(),
            "pillar": pillar,
            "value": value,
            "unit": item.get("unit"),
            "page_number": page_num,
            "evidence_text": evidence_text[:1200],
            "confidence_score": confidence_score,
        })
    return results


def dedupe_results(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    deduped: List[Dict[str, Any]] = []
    for item in items:
        key = (
            item.get("metric_name"),
            item.get("pillar"),
            item.get("page_number"),
            (item.get("evidence_text") or "")[:140],
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


class DocumentExtractorAgent:
    def extract(self, pages: List[Dict[str, Any]], company_name: str) -> List[Dict[str, Any]]:
        """
        pages: list of {"page_num": int, "text": str}
        Returns list of extracted ESG evidence items.
        """
        all_results = []
        for page in pages:
            items = mock_llm_extract(page["text"], page["page_num"])
            if llm_enabled() and page.get("text"):
                try:
                    items.extend(openai_extract(page["text"], page["page_num"]))
                except Exception:
                    pass
            for item in items:
                item["source_type"] = "pdf"
                item["source_name"] = company_name
            all_results.extend(items)
        return dedupe_results(all_results)


document_extractor_agent = DocumentExtractorAgent()
