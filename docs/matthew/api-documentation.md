# API Documentation — Matthew (Notification System)

All endpoints are mounted under `/api` and require an authenticated session
(JWT middleware sets `req.user.id`). Unauthenticated requests receive `401`.

---

## GET /api/notifications

Returns the user's notification history, newest first.

**Query parameters**

| Param | Type | Default | Notes |
|---|---|---|---|
| `limit` | number | 50 | Max 200 |
| `before` | ISO timestamp | — | Pagination cursor: entries older than this |

**Example request**
```
GET /api/notifications?limit=2
```

**Example response — 200**
```json
{
  "notifications": [
    {
      "id": 42,
      "ticker": "D05.SI",
      "trigger_type": "PRICE_ALERT",
      "status": "delivered",
      "delivery_mode": "broadcast",
      "delivered_via": [{ "channel": "DISCORD", "providerMessageId": "1533..." }],
      "reason": null,
      "created_at": "2026-08-03T09:15:00.000Z"
    }
  ]
}
```

**Errors**

| Code | Body | Cause |
|---|---|---|
| 401 | `{ "error": "unauthenticated" }` | No user session |
| 500 | `{ "error": "failed to load history" }` | Database error |

---

## POST /api/telegram/link

Creates a single-use deep link that connects the user's Telegram account.

**Request body** — none required.

**Example response — 200**
```json
{ "url": "https://t.me/MatthewIco_bot?start=a3f9c2d41b7e..." }
```

Token expires after 15 minutes and can be used once.

**Errors**

| Code | Body | Cause |
|---|---|---|
| 401 | `{ "error": "unauthenticated" }` | No user session |
| 500 | `{ "error": "failed to create link" }` | Database error |

---

## POST /api/telegram/webhook

Receives updates from Telegram (production mode). When the update is
`/start <token>`, the user's chat ID is stored and a confirmation is sent
in-chat. In local development the long-polling worker is used instead and this
endpoint is not needed.

**Headers** — if `TELEGRAM_WEBHOOK_SECRET` is configured, Telegram must send
`x-telegram-bot-api-secret-token` matching it.

**Request body** — Telegram update object (set by Telegram, not by clients).

**Responses**

| Code | Cause |
|---|---|
| 200 | Update processed (always returned to Telegram) |
| 403 | Secret header missing or wrong |

---

## POST /api/discord/link

Validates and stores the user's Discord webhook URL.

**Example request**
```json
{ "webhookUrl": "https://discord.com/api/webhooks/123456789/AbCdEf..." }
```

**Example response — 200**
```json
{ "linked": true }
```

**Errors**

| Code | Body (`error`) | Cause |
|---|---|---|
| 400 | `not_a_discord_webhook_url` | URL fails format validation |
| 400 | `webhook_not_found` | Discord reports the webhook no longer exists |
| 400 | `unreachable` | Discord could not be reached for verification |
| 401 | `unauthenticated` | No user session |

Each 400 also includes a human-readable `message` for display in the UI.

---

## DELETE /api/discord/link

Removes the stored webhook URL.

**Example response — 200**
```json
{ "linked": false }
```

**Errors:** 401 as above.

---

## GET /api/discord/status

Reports whether Discord is linked. The webhook URL itself is never returned
(it is a credential).

**Example response — 200**
```json
{ "linked": true, "webhookId": "123456789" }
```

**Errors:** 401 as above.

---

## Internal interface (not HTTP): dispatcher event contract

Upstream producers (price monitor now; the AI/market feed later) deliver
events by calling `dispatcher.enqueue(event)` with:

```json
{
  "userId": 1,
  "ticker": "D05.SI",
  "stockName": "DBS Group Holdings",
  "triggerType": "PRICE_ALERT",
  "data": { "currentPrice": 39.8, "changePct": 6.4 },
  "aiContext": "Up 6.4% today — near 52-week high",
  "deepLink": "https://app.example.com/stock/D05.SI"
}
```

`triggerType` is one of: `PRICE_ALERT`, `VOLUME_ALERT`, `EARNINGS_ALERT`,
`TREND_BREAK_ALERT`, `REVERSAL_SIGNAL`, `AI_STOCK_SUGGESTION`.
