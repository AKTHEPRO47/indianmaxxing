'use strict';

require('dotenv').config();

const TriggerType = Object.freeze({
  PRICE_ALERT: 'PRICE_ALERT',
  VOLUME_ALERT: 'VOLUME_ALERT',
  EARNINGS_ALERT: 'EARNINGS_ALERT',
  TREND_BREAK_ALERT: 'TREND_BREAK_ALERT',
  REVERSAL_SIGNAL: 'REVERSAL_SIGNAL',
  AI_STOCK_SUGGESTION: 'AI_STOCK_SUGGESTION',
});

const Channel = Object.freeze({
  DISCORD: 'DISCORD',
  TELEGRAM: 'TELEGRAM',
  EMAIL: 'EMAIL',
});

const FALLBACK_ORDER = [Channel.DISCORD, Channel.TELEGRAM, Channel.EMAIL];

const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },
  email: {
    user: process.env.GMAIL_USER || '',
    appPassword: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''),
  },
  discord: {
    // No system credential: each user supplies their own webhook URL.
    username: process.env.DISCORD_BOT_NAME || 'SGX Stock Alerts',
    avatarUrl: process.env.DISCORD_AVATAR_URL || '',
  },
  rules: {
    maxRetriesPerChannel: 3,
    cooldownHours: 24,
    retryBackoffMs: 500,
  },
};

function availableChannels() {
  // Discord needs no system credential; per-recipient webhook URL is checked at send.
  const available = [Channel.DISCORD];
  if (config.telegram.botToken) available.push(Channel.TELEGRAM);
  if (config.email.user && config.email.appPassword) available.push(Channel.EMAIL);
  return available;
}

module.exports = { config, TriggerType, Channel, FALLBACK_ORDER, availableChannels };
