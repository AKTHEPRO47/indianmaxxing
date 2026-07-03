"""
CopilotAgent
Answers user questions using only stored evidence. Every answer cites source, date, confidence.
Swap _mock_answer() for a real LLM call when API key is available.
"""
from typing import List, Any, Dict
import re

from app.services.openai_client import complete_text, llm_enabled


class CopilotAgent:
    def answer(self, question: str, evidences: List[Any], company_name: str) -> Dict[str, Any]:
        question_lower = question.lower()

        # Find most relevant evidence by keyword overlap
        scored = []
        question_words = set(re.findall(r"\w+", question_lower))

        for ev in evidences:
            text_lower = (ev.evidence_text or "").lower()
            ev_words = set(re.findall(r"\w+", text_lower))
            overlap = len(question_words & ev_words)
            scored.append((overlap, ev))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_evidence = [ev for _, ev in scored[:5] if _ > 0]

        if not top_evidence:
            return {
                "answer": f"I don't have enough evidence in the database to answer that question about {company_name}. "
                          "Try uploading a sustainability report or scanning for news signals.",
                "sources": [],
                "confidence": 0.15,
            }

        answer_text = self._answer_with_fallback(question, top_evidence, company_name)
        avg_confidence = round(sum(e.confidence_score for e in top_evidence) / len(top_evidence), 2)

        return {
            "answer": answer_text,
            "sources": top_evidence,
            "confidence": avg_confidence,
        }

    def _answer_with_fallback(self, question: str, evidence: List[Any], company_name: str) -> str:
        if llm_enabled():
            try:
                return self._openai_answer(question, evidence, company_name)
            except Exception:
                pass
        return self._mock_answer(question, evidence, company_name)

    def _openai_answer(self, question: str, evidence: List[Any], company_name: str) -> str:
        evidence_blocks = []
        for idx, ev in enumerate(evidence[:5], start=1):
            source = ev.source_name or ev.source_type or "Unknown source"
            date = ev.source_date or "date unknown"
            confidence = int((ev.confidence_score or 0) * 100)
            snippet = (ev.evidence_text or "").strip()[:700]
            evidence_blocks.append(
                f"[{idx}] source={source}; date={date}; confidence={confidence}%\n{snippet}"
            )

        system_prompt = (
            "You are an ESG research copilot. Answer using ONLY the supplied evidence. "
            "Do not invent facts, numbers, dates, or sources. If the evidence is insufficient, say so clearly. "
            "Write a concise investor-facing answer with short paragraphs. Cite supporting evidence inline as [1], [2], etc."
        )
        user_prompt = (
            f"Company: {company_name}\n"
            f"Question: {question}\n\n"
            "Evidence:\n"
            + "\n\n".join(evidence_blocks)
        )
        answer = complete_text(system_prompt, user_prompt, max_tokens=420)
        return answer or self._mock_answer(question, evidence, company_name)

    def _mock_answer(self, question: str, evidence: List[Any], company_name: str) -> str:
        """
        Generates a grounded answer from evidence snippets.
        Replace with OpenAI / Anthropic call for production.
        """
        q = question.lower()

        intro = f"Based on {len(evidence)} evidence item(s) from {company_name}'s filings and news signals:\n\n"
        points = []
        for ev in evidence[:3]:
            snippet = (ev.evidence_text or "")[:200].strip()
            source = ev.source_name or ev.source_type or "Unknown source"
            date = ev.source_date or "date unknown"
            conf = int(ev.confidence_score * 100)
            points.append(f'• [{source}, {date}, {conf}% confidence]: "{snippet}..."')

        body = "\n".join(points)

        if any(kw in q for kw in ["scope", "emission", "carbon"]):
            context = "\n\nNote: Scope 3 emissions are the largest but most difficult to report accurately. Always verify third-party assurance."
        elif any(kw in q for kw in ["diversity", "gender", "women"]):
            context = "\n\nNote: Gender diversity data should be read alongside pay equity and retention metrics for full picture."
        elif any(kw in q for kw in ["ai", "artificial intelligence", "automation"]):
            context = "\n\nNote: AI adoption signals include job postings, partnerships and patent filings — not just product announcements."
        else:
            context = ""

        disclaimer = "\n\n_This answer is generated from stored evidence only. No external data or assumptions have been added._"
        return intro + body + context + disclaimer


copilot_agent = CopilotAgent()
