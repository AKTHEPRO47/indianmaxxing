from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Tuple

from app.config import settings


def can_send_email() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM_EMAIL)


def send_notification_email(to_email: str, subject: str, body_text: str) -> Tuple[bool, str | None]:
    if not can_send_email():
        return False, "smtp_not_configured"

    message = EmailMessage()
    from_header = settings.SMTP_FROM_EMAIL
    if settings.SMTP_FROM_NAME:
        from_header = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"

    message["From"] = from_header
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body_text)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT_SECONDS) as smtp:
            smtp.ehlo()
            if settings.SMTP_USE_TLS:
                smtp.starttls()
                smtp.ehlo()
            if settings.SMTP_USERNAME:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)
        return True, None
    except Exception as exc:
        return False, str(exc)
