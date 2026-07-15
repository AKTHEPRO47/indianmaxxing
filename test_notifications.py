import json
from app.database import SessionLocal
from app.models import User, Notification
from app.services.notifications import maybe_notify_market_open_for_all_users, maybe_notify_live_price_for_watchlists

db = SessionLocal()

# Check users
users = db.query(User).filter(User.is_active.is_(True)).all()
print(f"Active users: {len(users)}")
for u in users[:2]:
    prefs = json.loads(u.notification_preferences_json or '{}')
    print(f"  - {u.email}: notifications_enabled={prefs.get('enabled', False)}, email_enabled={prefs.get('recipient', {}).get('email_enabled', False)}")

# Trigger background tasks
print("\nTriggering background tasks...")
market_notifs = maybe_notify_market_open_for_all_users(db)
price_notifs = maybe_notify_live_price_for_watchlists(db)

print(f"Market open notifications: {len(market_notifs)}")
print(f"Price notifications: {len(price_notifs)}")

# Check recent notifications
recent = db.query(Notification).order_by(Notification.created_at.desc()).limit(5).all()
print("\nRecent notifications:")
for n in recent:
    print(f"  - {n.channel} {n.status}: {n.title} (trigger: {n.trigger_type})")

db.close()
