'use strict';

// Example wiring into your Express backend. Adapt table/column names to
// your schema, and replace the settings query with your user_alert_settings.

const express = require('express');
const {
  Dispatcher, TriggerType, Channel,
  createPgLogger, createLinking, createDiscordLinking, startPolling,
  notificationRoutes, telegramRoutes, discordRoutes,
} = require('./src');
const { getPool } = require('./src/db/pool');
const { createPriceMonitor } = require('./src/monitor/priceMonitor');

const pool = getPool();

const discordLinking = createDiscordLinking(pool);

const linking = createLinking(pool, {
  botUsername: process.env.TELEGRAM_BOT_USERNAME,
  botToken: process.env.TELEGRAM_BOT_TOKEN,
});

const userSettingsProvider = {
  async getSettings(userId) {
    const { rows } = await pool.query(
      `SELECT u.email, u.discord_webhook_url, t.chat_id
         FROM users u
         LEFT JOIN user_telegram_links t ON t.user_id = u.id
        WHERE u.id = $1`,
      [userId]
    );
    if (!rows[0]) return null;
    return {
      deliveryMode: 'broadcast',
      channelByTrigger: {
        [TriggerType.PRICE_ALERT]: [Channel.DISCORD, Channel.TELEGRAM, Channel.EMAIL],
      },
      recipient: {
        email: rows[0].email,
        telegramChatId: rows[0].chat_id || '',
        discordWebhookUrl: rows[0].discord_webhook_url || '',
      },
    };
  },
};

const dispatcher = new Dispatcher({
  userSettingsProvider,
  logger: createPgLogger(pool),
});

const app = express();
app.use(express.json());
// app.use(yourJwtMiddleware);   // sets req.user.id
app.use('/api', notificationRoutes(pool));
app.use('/api', telegramRoutes(linking, {
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
}));
app.use('/api', discordRoutes(discordLinking));

// Local dev: poll instead of webhook.
if (process.env.TELEGRAM_POLLING === '1') {
  startPolling({
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    onUpdate: (u) => linking.handleUpdate(u),
  });
}

// Automatic pipeline: monitor polls prices for all watchlist stocks and
// fires events into the dispatcher. Replace/augment with Aryan's feed later —
// his events call dispatcher.enqueue(event) with the same shape.
const monitor = createPriceMonitor(dispatcher, {
  watchlistProvider: async () => {
    const { rows } = await pool.query(
      'SELECT user_id AS "userId", ticker FROM watchlist_stocks'
    );
    return rows;
  },
  thresholdPct: 5,
  intervalMs: 5 * 60 * 1000,
  deepLinkBase: 'https://app.example.com/stock',
});
monitor.start();

app.listen(3001, () => console.log('server on :3001'));
