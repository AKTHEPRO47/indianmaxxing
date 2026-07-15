from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models import Notification, Report, User, UserFavoriteItem, UserWatchlistItem
from app.services.email_sender import can_send_email, send_notification_email


DEFAULT_NOTIFICATION_PREFERENCES = {
	"enabled": True,
	"delivery_mode": "failover",
	"cooldown_hours": 24,
	"live_price_alerts": True,
	"price_move_threshold_pct": 2.5,
	"market_open_countries": ["Singapore", "United States", "Hong Kong"],
	"channel_by_trigger": {},
	"per_stock_overrides": {},
	"recipient": {
		"email_enabled": False,
		"email_address": None,
		"email_triggers": [],
	},
}


def _utcnow() -> datetime:
	return datetime.now(timezone.utc)


def _merge_preferences(raw: Optional[dict[str, Any]]) -> dict[str, Any]:
	prefs = dict(DEFAULT_NOTIFICATION_PREFERENCES)
	if isinstance(raw, dict):
		prefs.update(raw)
	for key, value in DEFAULT_NOTIFICATION_PREFERENCES.items():
		prefs.setdefault(key, value)
	return prefs


def load_notification_preferences(user: User) -> dict[str, Any]:
	try:
		raw = json.loads(user.notification_preferences_json or "{}")
	except Exception:
		raw = {}
	return _merge_preferences(raw if isinstance(raw, dict) else {})


def save_notification_preferences(user: User, preferences: dict[str, Any]) -> None:
	merged = _merge_preferences(preferences)
	user.notification_preferences_json = json.dumps(merged)


def _cooldown_window(preferences: dict[str, Any]) -> timedelta:
	hours = preferences.get("cooldown_hours", 24)
	try:
		return timedelta(hours=max(0, int(hours)))
	except Exception:
		return timedelta(hours=24)


def _is_email_enabled_for_trigger(preferences: dict[str, Any], trigger_type: str) -> bool:
	recipient = preferences.get("recipient")
	if not isinstance(recipient, dict):
		return False
	if not recipient.get("email_enabled", False):
		return False
	triggers = recipient.get("email_triggers")
	if not isinstance(triggers, list) or len(triggers) == 0:
		return True
	normalized = {str(item).strip().upper() for item in triggers if str(item).strip()}
	if "ALL" in normalized:
		return True
	return trigger_type.strip().upper() in normalized


def is_cooling_down(db: Session, user_id: int, company_id: Optional[int], trigger_type: str, preferences: dict[str, Any], now: Optional[datetime] = None) -> bool:
	now = now or _utcnow()
	cutoff = now - _cooldown_window(preferences)
	query = (
		db.query(Notification)
		.filter(Notification.user_id == user_id, Notification.trigger_type == trigger_type, Notification.created_at >= cutoff)
	)
	if company_id is None:
		query = query.filter(Notification.company_id.is_(None))
	else:
		query = query.filter(Notification.company_id == company_id)
	return query.first() is not None


def get_company_notification_recipients(db: Session, company_id: int) -> list[int]:
	watchlist_ids = {
		row[0]
		for row in db.query(UserWatchlistItem.user_id).filter(UserWatchlistItem.company_id == company_id).all()
	}
	favorite_ids = {
		row[0]
		for row in db.query(UserFavoriteItem.user_id).filter(UserFavoriteItem.company_id == company_id).all()
	}
	return sorted(watchlist_ids | favorite_ids)


def create_notification(
	db: Session,
	user: User,
	trigger_type: str,
	title: str,
	body: str,
	company_id: Optional[int] = None,
	deep_link: Optional[str] = None,
	metadata: Optional[dict[str, Any]] = None,
	channel: str = "IN_APP",
	status: str = "delivered",
	now: Optional[datetime] = None,
) -> Notification:
	preferences = load_notification_preferences(user)
	if not preferences.get("enabled", True):
		raise ValueError("Notifications are disabled for this user")
	if is_cooling_down(db, user.id, company_id, trigger_type, preferences, now):
		raise ValueError("cooldown")
	created_at = now or _utcnow()
	notification = Notification(
		user_id=user.id,
		company_id=company_id,
		trigger_type=trigger_type,
		channel=channel,
		title=title,
		body=body,
		deep_link=deep_link,
		metadata_json=json.dumps(metadata or {}),
		status=status,
		delivered_at=created_at if status == "delivered" else None,
	)
	db.add(notification)
	db.commit()
	db.refresh(notification)

	if channel == "IN_APP" and _is_email_enabled_for_trigger(preferences, trigger_type) and can_send_email():
		recipient = preferences.get("recipient") if isinstance(preferences.get("recipient"), dict) else {}
		target_email = recipient.get("email_address") or user.email
		if target_email:
			sent, error = send_notification_email(
				to_email=str(target_email),
				subject=title,
				body_text=body,
			)
			email_metadata = dict(metadata or {})
			email_metadata.update({
				"email_to": target_email,
				"delivery_mode": preferences.get("delivery_mode", "failover"),
				"error": error,
			})
			email_notification = Notification(
				user_id=user.id,
				company_id=company_id,
				trigger_type=trigger_type,
				channel="EMAIL",
				title=title,
				body=body,
				deep_link=deep_link,
				metadata_json=json.dumps(email_metadata),
				status="delivered" if sent else "failed",
				delivered_at=created_at if sent else None,
			)
			db.add(email_notification)
			db.commit()
	return notification


def notify_company_watchers(
	db: Session,
	company_id: int,
	trigger_type: str,
	title: str,
	body: str,
	deep_link: Optional[str] = None,
	metadata: Optional[dict[str, Any]] = None,
	channel: str = "IN_APP",
) -> list[Notification]:
	created: list[Notification] = []
	for user_id in get_company_notification_recipients(db, company_id):
		user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
		if not user:
			continue
		try:
			notification = create_notification(
				db,
				user=user,
				trigger_type=trigger_type,
				title=title,
				body=body,
				company_id=company_id,
				deep_link=deep_link,
				metadata=metadata,
				channel=channel,
			)
			created.append(notification)
		except ValueError:
			continue
	return created


def notify_report_processed(report: Report, db: Session) -> Optional[Notification]:
	owner = db.query(User).filter(User.id == report.user_id, User.is_active.is_(True)).first()
	if not owner:
		return None
	company_link = f"/#/companies/{report.company_id}"
	try:
		return create_notification(
			db,
			user=owner,
			trigger_type="EARNINGS_ALERT",
			title=f"Report processed: {report.file_name}",
			body=f"Your report for company #{report.company_id} has finished processing and is ready to review.",
			company_id=report.company_id,
			deep_link=company_link,
			metadata={"report_id": report.id, "status": report.status},
		)
	except ValueError:
		return None


def notify_score_change(db: Session, company_id: int, company_name: str, previous_classification: Optional[str], previous_signal: Optional[str], new_classification: str, new_signal: str) -> list[Notification]:
	if previous_classification == new_classification and previous_signal == new_signal:
		return []
	if new_signal != "Risk Alert" and new_classification not in {"Hidden Winner", "Future Leader", "Value Trap", "Overrated Leader"}:
		return []
	trigger = "AI_STOCK_SUGGESTION" if new_signal != "Risk Alert" else "REVERSAL_SIGNAL"
	title = f"{company_name} signal updated"
	body = f"{company_name} is now {new_classification} with investor signal {new_signal}."
	return notify_company_watchers(
		db,
		company_id=company_id,
		trigger_type=trigger,
		title=title,
		body=body,
		deep_link=f"/#/companies/{company_id}",
		metadata={
			"previous_classification": previous_classification,
			"previous_signal": previous_signal,
			"classification": new_classification,
			"investor_signal": new_signal,
		},
	)


def _market_open_window(country: str) -> tuple[ZoneInfo, int, int]:
	if country == "Singapore":
		return ZoneInfo("Asia/Singapore"), 9, 0
	if country == "Hong Kong":
		return ZoneInfo("Asia/Hong_Kong"), 9, 30
	return ZoneInfo("America/New_York"), 9, 30


def maybe_notify_market_open_for_user(db: Session, user: User, now: Optional[datetime] = None) -> list[Notification]:
	preferences = load_notification_preferences(user)
	selected = preferences.get("market_open_countries") or []
	if not preferences.get("enabled", True) or not isinstance(selected, list) or not selected:
		return []
	now = now or _utcnow()
	created: list[Notification] = []
	for country in selected:
		if country not in {"Singapore", "United States", "Hong Kong"}:
			continue
		tz, open_hour, open_minute = _market_open_window(country)
		local_now = now.astimezone(tz)
		if local_now.weekday() >= 5:
			continue
		market_open = local_now.replace(hour=open_hour, minute=open_minute, second=0, microsecond=0)
		if not (market_open <= local_now <= market_open + timedelta(minutes=45)):
			continue
		trigger_type = f"MARKET_OPEN_{country.upper().replace(' ', '_')}"
		if is_cooling_down(db, user.id, None, trigger_type, preferences, now):
			continue
		try:
			notification = create_notification(
				db,
				user=user,
				trigger_type=trigger_type,
				title=f"{country} market open",
				body=f"The {country} market has opened. Check your watchlist and live signals.",
				deep_link="/#/",
				metadata={"country": country, "market_open": True},
			)
			created.append(notification)
		except ValueError:
			continue
	return created


def maybe_notify_market_open_for_all_users(db: Session, now: Optional[datetime] = None) -> list[Notification]:
	created: list[Notification] = []
	users = db.query(User).filter(User.is_active.is_(True)).all()
	for user in users:
		created.extend(maybe_notify_market_open_for_user(db, user, now))
	return created


def maybe_notify_live_price_for_user(db: Session, user: User, company_id: int, company_name: str, ticker: str, current_price: Optional[float], change_percent: Optional[float], deep_link: Optional[str] = None, now: Optional[datetime] = None) -> Optional[Notification]:
	preferences = load_notification_preferences(user)
	if not preferences.get("enabled", True) or not preferences.get("live_price_alerts", True):
		return None
	threshold = preferences.get("price_move_threshold_pct", 2.5)
	try:
		threshold_value = abs(float(threshold))
	except Exception:
		threshold_value = 2.5
	if current_price is None or change_percent is None or abs(change_percent) < threshold_value:
		return None
	title = f"{ticker} moved {change_percent:+.2f}%"
	body = f"{company_name} is now at {current_price:.2f}. Move of {change_percent:+.2f}% crossed your {threshold_value:.2f}% alert threshold."
	try:
		return create_notification(
			db,
			user=user,
			trigger_type="PRICE_ALERT",
			title=title,
			body=body,
			company_id=company_id,
			deep_link=deep_link,
			metadata={"ticker": ticker, "current_price": current_price, "change_percent": change_percent},
		)
	except ValueError:
		return None


def maybe_notify_live_price_for_watchlists(db: Session, now: Optional[datetime] = None) -> list[Notification]:
	from app.models import Company
	from app.services.market_data import fetch_stock_data

	created: list[Notification] = []
	users = db.query(User).filter(User.is_active.is_(True)).all()
	for user in users:
		watchlist_ids = [
			row[0]
			for row in db.query(UserWatchlistItem.company_id).filter(UserWatchlistItem.user_id == user.id).all()
		]
		if not watchlist_ids:
			continue
		for company_id in watchlist_ids:
			company = db.query(Company).filter(Company.id == company_id).first()
			if not company or not company.ticker:
				continue
			try:
				payload = fetch_stock_data(company.ticker, "1d")
			except Exception:
				continue
			notification = maybe_notify_live_price_for_user(
				db,
				user,
				company.id,
				company.name,
				company.ticker,
				payload["quote"].get("last_price"),
				payload["quote"].get("change_percent"),
				deep_link=f"/#/companies/{company.id}",
				now=now,
			)
			if notification is not None:
				created.append(notification)
	return created