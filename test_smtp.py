import smtplib
import sys
sys.path.insert(0, 'backend')

from app.config import settings

try:
    print("Attempting SMTP connection...")
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        smtp.ehlo()
        print("✓ EHLO succeeded")
        smtp.starttls()
        print("✓ STARTTLS succeeded")
        smtp.ehlo()
        print("✓ Second EHLO succeeded")
        print(f"Attempting login as: {settings.SMTP_USERNAME}")
        print(f"Password length: {len(settings.SMTP_PASSWORD)}")
        smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        print("✓ LOGIN succeeded")
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")
