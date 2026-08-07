'use strict';

const config = require('../config');

let updateOffset = 0;
let pollTimer = null;
let polling = false;

async function telegramRequest(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    throw new Error(result.description || `Telegram returned ${response.status}`);
  }
  return result.result;
}

async function handleMessage(message) {
  const command = message.text?.trim().split(/\s+/)[0]?.toLowerCase().replace(/@[^\s]+$/, '');
  if (!['/start', '/id'].includes(command)) return;

  const text = command === '/id'
    ? `Your Tricard Telegram chat ID is: ${message.chat.id}`
    : `Tricard Alerts is connected.\n\nYour Telegram chat ID is: ${message.chat.id}\n\nCopy this ID into Account > Notification settings, then save your preferences. Alerts will arrive here once you create or test an alert.`;

  await telegramRequest('sendMessage', { chat_id: message.chat.id, text });
}

async function pollUpdates() {
  if (polling || !config.telegram.botToken) return;
  polling = true;
  try {
    const updates = await telegramRequest('getUpdates', {
      offset: updateOffset,
      timeout: 0,
      allowed_updates: ['message'],
    });
    for (const update of updates) {
      updateOffset = update.update_id + 1;
      if (update.message) await handleMessage(update.message);
    }
  } finally {
    polling = false;
  }
}

function startTelegramBot() {
  if (!config.telegram.botToken) {
    console.log('[Telegram] Bot polling disabled: TELEGRAM_BOT_TOKEN is not configured.');
    return;
  }

  pollUpdates().catch(error => console.error('[Telegram] Initial update poll failed:', error.message));
  pollTimer = setInterval(() => {
    pollUpdates().catch(error => console.error('[Telegram] Update poll failed:', error.message));
  }, 5000);
  console.log(`[Telegram] Bot polling enabled for @${config.telegram.botUsername || 'configured bot'}.`);
}

function stopTelegramBot() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

module.exports = { startTelegramBot, stopTelegramBot };