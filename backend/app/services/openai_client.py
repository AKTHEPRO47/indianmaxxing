import json
from typing import Any

from openai import OpenAI

from app.config import settings


def llm_enabled() -> bool:
    return (not settings.USE_MOCK_LLM) and bool(settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "sk-placeholder")


def get_client() -> OpenAI:
    return OpenAI(
        api_key=settings.OPENAI_API_KEY,
        timeout=10.0,
        max_retries=0,
    )


def complete_text(system_prompt: str, user_prompt: str, max_tokens: int = 500) -> str:
    response = get_client().chat.completions.create(
        model=settings.OPENAI_MODEL,
        temperature=0.2,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    return (response.choices[0].message.content or "").strip()


def complete_json(system_prompt: str, user_prompt: str, max_tokens: int = 700) -> Any:
    response = get_client().chat.completions.create(
        model=settings.OPENAI_MODEL,
        temperature=0.0,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    content = (response.choices[0].message.content or "{}").strip()
    return json.loads(content)