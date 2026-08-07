from typing import List
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_FILE, override=False)


def _normalize_database_url(database_url: str) -> str:
    # Keep SQLite file location stable even when server is started from different CWDs.
    if database_url.startswith("sqlite:///./"):
        rel_path = database_url.removeprefix("sqlite:///./")
        absolute_path = (ENV_FILE.parent / rel_path).resolve()
        return f"sqlite:///{absolute_path.as_posix()}"
    return database_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_FILE), env_file_encoding="utf-8")

    DATABASE_URL: str = "sqlite:///./esg_momentum.db"
    OPENAI_API_KEY: str = "sk-placeholder"
    OPENAI_MODEL: str = "gpt-4.1-mini"
    USE_MOCK_LLM: bool = True
    SECRET_KEY: str = "dev-secret-key"
    ALGORITHM: str = "HS256"
    GOOGLE_CLIENT_ID: str = ""
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = "kaxu kyit ecyw qcym"
    SMTP_USE_TLS: bool = True
    SMTP_FROM_EMAIL: str = "noreply@tricard.local"
    SMTP_FROM_NAME: str = "Tricard Alerts"
    SMTP_TIMEOUT_SECONDS: int = 15


settings = Settings()
settings.DATABASE_URL = _normalize_database_url(settings.DATABASE_URL)
