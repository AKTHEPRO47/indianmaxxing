# Use Cases — Matthew (Notification System)

Module: Notifications (UC-008 in the team specification).
Channels implemented: Discord, Telegram, Email.

---

## UC-N1 — Link a delivery channel

| Field | Detail |
|---|---|
| Actor | Registered user |
| Trigger | User opens Notification Settings and chooses a channel to connect |

**Main flow — Telegram (deep link)**
1. User taps "Connect Telegram".
2. System generates a single-use link token (15-minute expiry) and returns a deep link `https://t.me/<bot>?start=<token>`.
3. User taps the link; Telegram opens the bot; user taps Start.
4. Bot receives `/start <token>`; system validates the token, stores the user's chat ID, and replies in-chat that linking succeeded.

**Main flow — Discord (webhook paste)**
1. User creates a webhook in their own Discord server (Channel Settings → Integrations → Webhooks) and copies the URL.
2. User pastes the URL into the app.
3. System validates the URL format, calls Discord to confirm the webhook exists, then stores it against the user.

**Main flow — Email**
1. No action needed; the account email from registration is used.

**Alternative flows**
- A1: User re-links Telegram → new chat ID replaces the old one.
- A2: User unlinks Discord → stored webhook URL cleared; Discord deliveries stop.

**Edge cases**
- E1: Expired or already-used Telegram token → bot replies that the link is invalid; user generates a new one.
- E2: Pasted URL is not a Discord webhook → rejected with a format hint; nothing stored.
- E3: Webhook was deleted in Discord since copying → verification returns 404; user told to create a new webhook.

**Postcondition:** channel identifiers stored per user; user can receive alerts on that channel.

---

## UC-N2 — Configure notification preferences

| Field | Detail |
|---|---|
| Actor | Registered user |
| Trigger | User edits notification settings |

**Main flow**
1. User enables or disables each trigger type independently (price, volume, earnings, trend break, reversal, AI suggestion).
2. User selects which channels receive each trigger type.
3. User selects a delivery mode:
   - **Broadcast** — every selected channel receives the alert.
   - **Failover** — channels are tried in priority order; delivery stops at the first success.
4. User optionally sets per-stock overrides (e.g. a tighter price threshold for one stock).
5. System saves the configuration.

**Edge cases**
- E1: User enables a trigger with no channel linked → alert is skipped at dispatch time and logged with reason `no_channel_for_trigger`.

**Postcondition:** per-user routing configuration stored; used by the dispatcher for every event.

---

## UC-N3 — Automatic alert delivery

| Field | Detail |
|---|---|
| Actor | System (price monitor / upstream AI feed); user is the recipient |
| Trigger | A watchlist stock crosses the alert threshold (default: ±5% daily move) |

**Main flow**
1. The price monitor polls market data for all watchlist stocks on an interval.
2. A qualifying move produces a notification event (stock, trigger type, price data, context sentence, deep link).
3. The dispatcher checks the 24-hour cooldown for (user, stock, trigger type); suppressed if within cooldown.
4. The dispatcher resolves the user's channels for that trigger type and delivery mode.
5. Each channel send is retried up to 3 times with backoff; in failover mode a failed channel falls through to the next.
6. The outcome (delivered / failed / suppressed / skipped, with per-channel attempts) is written to the notification log.

**Alternative flows**
- A1: Multiple events for the same user within a short window → collapsed into a single digest message; each constituent stock still enters cooldown.
- A2: Broadcast mode with one channel failing → remaining channels still deliver; the record lists which succeeded.

**Edge cases**
- E1: All channels fail after retries → logged as `all_channels_failed`.
- E2: Oscillating stock re-crossing the threshold → suppressed by the per-stock cooldown for 24 hours.
- E3: Market data unavailable for a ticker → error captured per ticker; other tickers unaffected.

**Postcondition:** user notified on their configured channels; delivery outcome logged and viewable in-app.

---

## UC-N4 — View notification history

| Field | Detail |
|---|---|
| Actor | Registered user |
| Trigger | User opens the notification history page |

**Main flow**
1. User opens history.
2. System returns the user's notifications, newest first, paginated.
3. Each entry shows the stock, trigger type, delivery status, channels used, and timestamp.

**Edge cases**
- E1: No notifications yet → empty state shown.

**Postcondition:** user can audit what was sent, where, and whether it succeeded.
