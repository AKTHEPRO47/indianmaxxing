'use strict';

const { config, Channel } = require('../config');
const { composePlainText } = require('../core/composer');

async function send(event, recipient) {
  if (!config.telegram.botToken) {
    throw new Error('Telegram bot token not configured');
  }
  if (!recipient.telegramChatId) {
    throw new Error('Recipient has no linked Telegram chat ID');
  }

  const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: recipient.telegramChatId,
      text: composePlainText(event),
      disable_web_page_preview: true,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(`Telegram send failed: ${res.status} ${json.description || ''}`.trim());
  }
  return { channel: Channel.TELEGRAM, providerMessageId: String(json.result?.message_id ?? '') };
}

module.exports = { send };
