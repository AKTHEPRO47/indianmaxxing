'use strict';

const { config, Channel } = require('../config');
const { composeDiscordEmbed } = require('../core/composer');

// recipient.discordWebhookUrl: a channel webhook URL the user creates in
// Discord (Server Settings -> Integrations -> Webhooks -> Copy URL).
async function send(event, recipient) {
  const url = recipient.discordWebhookUrl;
  if (!url) {
    throw new Error('Recipient has no linked Discord webhook URL');
  }
  if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(url)) {
    throw new Error('Invalid Discord webhook URL');
  }

  const body = {
    username: config.discord.username,
    embeds: [composeDiscordEmbed(event)],
  };
  if (config.discord.avatarUrl) body.avatar_url = config.discord.avatarUrl;

  // wait=true makes Discord return the created message instead of 204.
  const res = await fetch(`${url}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const retry = (await res.json().catch(() => ({}))).retry_after;
    throw new Error(`Discord rate limited (retry after ${retry ?? '?'}s)`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord send failed: ${res.status} ${text.slice(0, 120)}`.trim());
  }

  const json = await res.json().catch(() => ({}));
  return { channel: Channel.DISCORD, providerMessageId: String(json.id || '') };
}

module.exports = { send };
