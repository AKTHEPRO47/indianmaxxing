'use strict';

const WEBHOOK_RE =
  /^https:\/\/(?:ptb\.|canary\.)?(?:discord|discordapp)\.com\/api\/(?:v\d+\/)?webhooks\/(\d+)\/([\w-]+)$/;

function parseWebhookUrl(raw) {
  const url = String(raw || '').trim();
  const m = url.match(WEBHOOK_RE);
  if (!m) return { ok: false, error: 'not_a_discord_webhook_url' };
  return { ok: true, url, webhookId: m[1] };
}

// Confirms the webhook exists and is reachable before saving it.
async function verifyWebhook(url) {
  try {
    const res = await fetch(url, { method: 'GET' });
    if (res.status === 404) return { ok: false, error: 'webhook_not_found' };
    if (!res.ok) return { ok: false, error: `discord_returned_${res.status}` };
    const json = await res.json().catch(() => ({}));
    return { ok: true, channelId: json.channel_id, guildId: json.guild_id, name: json.name };
  } catch {
    return { ok: false, error: 'unreachable' };
  }
}

function createDiscordLinking(pool) {
  async function link(userId, rawUrl, { verify = true } = {}) {
    const parsed = parseWebhookUrl(rawUrl);
    if (!parsed.ok) return parsed;

    if (verify) {
      const check = await verifyWebhook(parsed.url);
      if (!check.ok) return check;
    }

    await pool.query('UPDATE users SET discord_webhook_url = $1 WHERE id = $2', [
      parsed.url,
      userId,
    ]);
    return { ok: true };
  }

  async function unlink(userId) {
    await pool.query('UPDATE users SET discord_webhook_url = NULL WHERE id = $1', [userId]);
    return { ok: true };
  }

  async function status(userId) {
    const { rows } = await pool.query(
      'SELECT discord_webhook_url FROM users WHERE id = $1',
      [userId]
    );
    const url = rows[0]?.discord_webhook_url || null;
    return { linked: !!url, webhookId: url ? parseWebhookUrl(url).webhookId : null };
  }

  return { link, unlink, status };
}

module.exports = { createDiscordLinking, parseWebhookUrl, verifyWebhook };
