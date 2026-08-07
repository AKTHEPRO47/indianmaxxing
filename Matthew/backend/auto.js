'use strict';

// End-to-end automatic pipeline: monitor polls real SGX prices, fires events
// when a stock moves past the threshold, dispatcher delivers to your linked
// channels. Fill in RECIPIENT, then: node auto.js
// THRESHOLD_PCT is set low so you see alerts quickly while testing; the
// production default is 5.

const { Dispatcher, TriggerType, Channel, availableChannels } = require('./src');
const { createPriceMonitor } = require('./src/monitor/priceMonitor');

const RECIPIENT = {
  telegramChatId: '',
  email: '',
  discordWebhookUrl: '',   // paste your (regenerated) webhook URL here locally
};

const WATCHLIST = [
  { userId: 1, ticker: 'D05.SI' },   // DBS
  { userId: 1, ticker: 'O39.SI' },   // OCBC
  { userId: 1, ticker: 'U11.SI' },   // UOB
  { userId: 1, ticker: 'Z74.SI' },   // Singtel
];

const THRESHOLD_PCT = 0.1;
const INTERVAL_MS = 60 * 1000;

const settings = {
  getSettings: async () => ({
    deliveryMode: 'broadcast',
    channelByTrigger: {
      [TriggerType.PRICE_ALERT]: [Channel.DISCORD, Channel.TELEGRAM, Channel.EMAIL],
    },
    recipient: RECIPIENT,
  }),
};

const dispatcher = new Dispatcher({ userSettingsProvider: settings });

const monitor = createPriceMonitor(dispatcher, {
  watchlistProvider: async () => WATCHLIST,
  thresholdPct: THRESHOLD_PCT,
  intervalMs: INTERVAL_MS,
  deepLinkBase: 'https://app.example.com/stock',
  onCheck: (results) => {
    const line = results
      .map((r) => r.error ? `${r.ticker}: error (${r.error})` :
        `${r.ticker}: ${r.pct?.toFixed(2)}%${r.fired ? ' → ALERT' : ''}`)
      .join(' | ');
    console.log(`[check ${new Date().toLocaleTimeString()}] ${line}`);
  },
});

console.log('Configured channels:', availableChannels().join(', '));
console.log(`Watching ${WATCHLIST.length} SGX stocks, threshold ±${THRESHOLD_PCT}%, every ${INTERVAL_MS / 1000}s`);
console.log('Alerts repeat-suppressed for 24h per stock by cooldown. Ctrl+C to stop.\n');
monitor.start();
