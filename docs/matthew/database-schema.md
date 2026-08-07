# Database Schema — Matthew (Notification System)

Tables owned by the notification module, plus one column added to the shared
`users` table. Migrations live in `backend/migrations/` and are numbered in
apply order.

---

## notification_log

Every dispatch outcome — delivered, failed, suppressed, or skipped — is
recorded here. Backs the in-app notification history.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | |
| `user_id` | INTEGER | NOT NULL, FK → `users(id)` | Recipient |
| `ticker` | VARCHAR(20) | NOT NULL | e.g. `D05.SI`; `DIGEST` for batched sends |
| `trigger_type` | VARCHAR(30) | NOT NULL | One of the six trigger types |
| `status` | VARCHAR(20) | NOT NULL | `delivered` / `failed` / `suppressed` / `skipped` |
| `delivery_mode` | VARCHAR(10) | | `broadcast` / `failover` |
| `delivered_via` | JSONB | | Array of `{channel, providerMessageId}` |
| `attempts` | JSONB | | Per-channel attempt detail incl. retries and errors |
| `reason` | VARCHAR(50) | | e.g. `cooldown`, `all_channels_failed` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Index:** `(user_id, created_at DESC)` — serves the history query
("this user's notifications, newest first").

JSONB is used for `delivered_via` and `attempts` because their shape varies
per delivery (one channel or three, each with different retry counts) and they
are read whole rather than queried into.

---

## telegram_link_tokens

Single-use tokens behind the Telegram deep-link flow.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `token` | VARCHAR(64) | PRIMARY KEY | Random 32-hex-char value |
| `user_id` | INTEGER | NOT NULL, FK → `users(id)` | Who requested the link |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `expires_at` | TIMESTAMPTZ | NOT NULL | created_at + 15 minutes |
| `used_at` | TIMESTAMPTZ | | Set on redemption; enforces single use |

A token is valid when `used_at IS NULL AND expires_at > now()`. Redemption is
a single conditional UPDATE, so concurrent use of the same token cannot link
two chats.

---

## user_telegram_links

Maps each user to their Telegram chat.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `user_id` | INTEGER | PRIMARY KEY, FK → `users(id)` | One link per user |
| `chat_id` | VARCHAR(32) | NOT NULL | Telegram chat ID (stable per user↔bot) |
| `linked_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

Upserted on `/start` redemption (`ON CONFLICT (user_id) DO UPDATE`), so
re-linking replaces the previous chat ID.

---

## users (shared table — column added by this module)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `discord_webhook_url` | TEXT | NULLABLE | The user's pasted webhook URL; treated as a credential — never returned by any API |

---

## Relationships

```
users 1 ──── * notification_log        (user_id)
users 1 ──── * telegram_link_tokens    (user_id)
users 1 ──── 1 user_telegram_links     (user_id)
users 1 ──── 0..1 discord_webhook_url  (column on users)
```

The cooldown rule (24h per user × ticker × trigger type) is currently held in
memory by the dispatcher; the planned production form is a table keyed on
`(user_id, ticker, trigger_type) → last_sent_at`, which slots in without code
changes elsewhere.
