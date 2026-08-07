'use strict';

const emailService = require('./email');

const CHANNEL_ORDER = ['discord', 'telegram', 'email'];
const MAX_ATTEMPTS = 3;

function preferencesFor(user) {
  try {
    return JSON.parse(user?.notificationPreferencesJson || '{}');
  } catch {
    return {};
  }
}

function channelsFor(preferences, triggerType) {
  const configured = preferences.channelsByTrigger?.[triggerType]
    ?? preferences.channels_by_trigger?.[triggerType];
  if (Array.isArray(configured) && configured.length) {
    return CHANNEL_ORDER.filter(channel => configured.includes(channel));
  }
  return CHANNEL_ORDER.filter(channel => (
    channel === 'email'
    || (channel === 'discord' && (preferences.discordWebhookUrl ?? preferences.discord_webhook_url))
    || (channel === 'telegram' && (preferences.telegramChatId ?? preferences.telegram_chat_id))
  ));
}

function alertText(alert, companyName, title, body) {
  return [title, body, `Company: ${companyName || 'Tracked company'}`, `Trigger: ${alert.triggerType}`]
    .filter(Boolean)
    .join('\n');
}

async function withRetries(send) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return { status: 'sent', attempts: attempt, ...(await send()) };
    } catch (error) {
      lastError = error;
    }
  }
  return { status: 'failed', attempts: MAX_ATTEMPTS, error: lastError?.message || 'Delivery failed' };
}

async function sendDiscord(webhookUrl, text) {
  if (!webhookUrl) return { status: 'disabled', reason: 'not_linked' };
  if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/(v\d+\/)?webhooks\//.test(webhookUrl)) {
    return { status: 'disabled', reason: 'invalid_webhook' };
  }
  return withRetries(async () => {
    const response = await fetch(`${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.slice(0, 1900), username: 'Tricard Alerts' }),
    });
    if (!response.ok) throw new Error(`Discord returned ${response.status}`);
    const payload = await response.json().catch(() => ({}));
    return { messageId: payload.id || null };
  });
}

async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!chatId) return { status: 'disabled', reason: 'not_linked' };
  if (!token) return { status: 'not_configured' };
  return withRetries(async () => {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.description || `Telegram returned ${response.status}`);
    return { messageId: String(payload.result?.message_id || '') };
  });
}

function notificationText(title, body, triggerType, companyName) {
  return [title, body, companyName ? `Company: ${companyName}` : null, `Trigger: ${triggerType}`]
    .filter(Boolean)
    .join('\n');
}

async function dispatchInAppNotification({ user, title, body, triggerType, companyName }) {
  const preferences = preferencesFor(user);
  if (preferences.enabled === false) {
    return {
      telegram: { status: 'disabled', reason: 'notifications_disabled' },
      email: { status: 'disabled', reason: 'notifications_disabled' },
    };
  }

  const message = notificationText(title, body, triggerType, companyName);
  const chatId = preferences.telegramChatId ?? preferences.telegram_chat_id;
  const telegram = await sendTelegram(chatId, message);
  const email = emailService.shouldSendAlertEmail(user)
    ? await emailService.sendEmail({ to: user.email, subject: `Tricard: ${title}`, text: message })
    : { status: 'disabled', reason: 'opted_out' };

  return { telegram, email };
}

async function dispatchAlert({ user, alert, companyName, title, body, forceBroadcast = false }) {
  const preferences = preferencesFor(user);
  if (preferences.enabled === false) return { email: { status: 'disabled', reason: 'notifications_disabled' } };
  const channels = channelsFor(preferences, alert.triggerType);
  const message = alertText(alert, companyName, title, body);
  const results = {};

  for (const channel of channels) {
    if (channel === 'discord') results.discord = await sendDiscord(preferences.discordWebhookUrl ?? preferences.discord_webhook_url, message);
    if (channel === 'telegram') results.telegram = await sendTelegram(preferences.telegramChatId ?? preferences.telegram_chat_id, message);
    if (channel === 'email' && emailService.shouldSendAlertEmail(user)) {
      results.email = await emailService.sendAlertNotificationEmail(user.email, alert, companyName);
    }
    if (!forceBroadcast && preferences.deliveryMode !== 'broadcast' && preferences.delivery_mode !== 'broadcast' && Object.values(results).some(result => result.status === 'sent')) break;
  }

  if (!results.email && channels.includes('email') && !emailService.shouldSendAlertEmail(user)) {
    results.email = { status: 'disabled', reason: 'opted_out' };
  }
  return results;
}

module.exports = { dispatchAlert, dispatchInAppNotification };