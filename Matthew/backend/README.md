# SGX Stock Tool — Notification System (UC-008)

Delivers stock alerts via Discord, Telegram and Email, with per-type channel
routing, retry/fallback, cooldown and batching.

## What maps to the spec (UC-008)

| UC-008 requirement | Where it lives |
| --- | --- |
| Six trigger types | `src/config/index.js` → `TriggerType` |
| Three channels (Discord, Telegram, Email) | `src/channels/*.js` |
| Notification content | `src/core/composer.js` |
| Per-type delivery channels | `settings.channelByTrigger` in `dispatcher._channelsFor` |
| Per-stock overrides | `settings.perStockOverrides` in `dispatcher._channelsFor` |
| Retry 3× then fall back (A2/E1) | `dispatcher._sendWithRetries` + fallback loop in `dispatch` |
| Broadcast to all selected channels | `deliveryMode: 'broadcast'` in `dispatch` |
| Batch simultaneous events (A1) | `dispatcher.enqueue` / `_flush` / `_buildDigest` |
| 24h cooldown per trigger per stock (E3) | `src/core/cooldown.js` |
| No channel linked (E4) | `dispatch` → `no_channel_for_trigger` |
| Logging | `dispatcher._record` |

## Structure

```
migrations/
  001_notification_log.sql   history table
  002_telegram_links.sql     link tokens + chat-id mapping
  003_discord_webhook.sql    users.discord_webhook_url column
src/
  config/index.js      env loading, TriggerType, Channel, rules
  db/pool.js           pg pool from DATABASE_URL
  core/
    composer.js         message content per channel
    cooldown.js          24h cooldown store
    dispatcher.js        routing, retry, fallback, batching, logging
    pgLogger.js          logger that writes to notification_log
  channels/
    telegram.js
    email.js
    discord.js
  telegram/
    linking.js           deep-link tokens, /start handling
    poller.js            dev-mode getUpdates loop (no public URL needed)
  discord/
    linking.js           webhook URL validation, verification, storage
  monitor/
    priceMonitor.js      polls Yahoo Finance, auto-fires PRICE_ALERT events
  api/
    notifications.js     GET /notifications history endpoint
    telegram.js          POST /telegram/link, POST /telegram/webhook
    discord.js           POST/DELETE /discord/link, GET /discord/status
  index.js
server.example.js       full Express wiring example
demo.js                 one manual alert through your channels
auto.js                 automatic pipeline: live prices -> events -> alerts
test.js
.env.example
```

## Setup

```bash
npm install
cp .env.example .env
```

## Files to change

- **`.env`** — credentials. See `.env.example` for the keys.
  - `TELEGRAM_BOT_TOKEN` — from @BotFather.
  - `GMAIL_USER` / `GMAIL_APP_PASSWORD` — dedicated Gmail account, 2FA on,
    App Password from myaccount.google.com/apppasswords.
  - Discord needs **no system credential** — each user pastes their own
    webhook URL. `DISCORD_BOT_NAME` / `DISCORD_AVATAR_URL` are cosmetic.

- **`demo.js` → `RECIPIENT`** — who to send to. Hard-coded for the demo only;
  in production this comes from `user_alert_settings` per user.
  ```js
  const RECIPIENT = {
    telegramChatId: '',      // message your bot first, then check getUpdates
    email: '',
    discordWebhookUrl: '',   // Channel Settings -> Integrations -> Webhooks
  };
  ```

## Quirks

- Telegram chat ID doesn't exist until you message the bot first (bots can't
  initiate). Then GET `https://api.telegram.org/bot<TOKEN>/getUpdates` and
  read `"chat":{"id":...}`.
- `deliveryMode: 'broadcast'` sends to every selected channel;
  `'failover'` stops at the first success. Demo is set to `'broadcast'`.
- Discord: the webhook URL *is* the credential — treat it as a secret; anyone with it can
  post to that channel. Alerts render as colour-coded embeds (green on a
  positive move, red on negative).
- Gmail lands in Spam at first — mark "Not spam" once per recipient.
- Cooldown is 24h per trigger per stock; a "silent" repeat during testing is
  usually this, not a bug.

## Run

```bash
npm test      # offline logic tests (44), no credentials or network needed
npm run demo  # sends ONE manual alert via your configured channels
npm run auto  # AUTOMATIC pipeline: polls live SGX prices every 60s and
              # alerts when a stock moves past the threshold
```

`auto.js` ships with `THRESHOLD_PCT = 0.1` so you see alerts quickly while
testing; the UC-008 production default is 5. The 24h cooldown means each stock
alerts once — repeats are suppressed, which is correct behaviour, not a bug.

## Notification history

Run `migrations/001_notification_log.sql`, then swap the dispatcher logger:

```js
const dispatcher = new Dispatcher({ userSettingsProvider, logger: createPgLogger(pool) });
```

Every delivery record (delivered / failed / suppressed / skipped, with per-channel
attempts) is inserted into `notification_log`. History endpoint:

```
GET /api/notifications?limit=50&before=<ISO>   (uses req.user.id from JWT)
```

## Telegram deep-link (auto chat-ID capture)

Run `migrations/002_telegram_links.sql`. Flow:

1. App calls `POST /api/telegram/link` → returns `https://t.me/<bot>?start=<token>`
   (single-use, expires in 15 min).
2. User taps it → Telegram opens the bot → user taps Start.
3. Bot receives `/start <token>` → chat ID stored in `user_telegram_links`
   against the user → bot replies "✅ Telegram linked".

No manual getUpdates dance. Receiving the `/start` message:

- **Local dev:** set `TELEGRAM_POLLING=1` — `startPolling()` long-polls
  getUpdates. No public URL needed. Don't run while a webhook is set.
- **Production:** point Telegram's webhook at `POST /api/telegram/webhook`
  (public HTTPS required; optional `TELEGRAM_WEBHOOK_SECRET` verified via
  the `x-telegram-bot-api-secret-token` header).

See `server.example.js` for the full wiring.

## Discord linking (paste-based)

Run `migrations/003_discord_webhook.sql`. The user creates a webhook themselves
and pastes the URL — no API keys, no OAuth, nothing for you to configure.

1. In Discord: Channel Settings → Integrations → Webhooks → New Webhook →
   Copy Webhook URL.
2. In your app: paste into the Discord field, which POSTs to
   `/api/discord/link` with `{ webhookUrl }`.
3. Server validates the URL format, GETs it to confirm Discord still has it
   (a deleted webhook 404s), then stores it in `users.discord_webhook_url`.

```
POST   /api/discord/link     { webhookUrl }  -> { linked: true }
DELETE /api/discord/link                     -> { linked: false }
GET    /api/discord/status                   -> { linked, webhookId }
```

Rejections come back with a user-facing `message`: bad format, webhook deleted,
or Discord unreachable.

## Backend wiring

1. **Events in** — the AI model / market feed calls `dispatcher.dispatch(event)`
   or `enqueue(event)`. Event shape is documented atop `src/core/composer.js`.
The end-to-end automatic flow this produces:

```
watchlist (DB) -> priceMonitor polls Yahoo Finance -> move past threshold
  -> event -> dispatcher (cooldown, batching, routing) -> user's linked
  channels (Discord embed / Telegram message / email) -> notification_log
```

The monitor is a stand-in for Aryan's AI/market feed. His events plug into
the same `dispatcher.enqueue(event)` with the same event shape, so swapping
or running both later changes nothing downstream.

2. **Settings out** — replace the demo's `userSettingsProvider` with one
   reading `user_alert_settings`: `channelByTrigger`, `deliveryMode`,
   `perStockOverrides`, `recipient` (telegram chat ID comes from
   `user_telegram_links`, discord webhook from `users.discord_webhook_url`). Swap the in-memory cooldown store for a Postgres
   table keyed on `(user_id, ticker, trigger_type) → last_sent_at`.
