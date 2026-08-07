'use strict';

const crypto = require('crypto');

function createLinking(pool, { botUsername, botToken, tokenTtlMinutes = 15 }) {
  async function createLinkToken(userId) {
    const token = crypto.randomBytes(16).toString('hex');
    await pool.query(
      `INSERT INTO telegram_link_tokens (token, user_id, expires_at)
       VALUES ($1, $2, now() + make_interval(mins => $3))`,
      [token, userId, tokenTtlMinutes]
    );
    return { token, url: `https://t.me/${botUsername}?start=${token}` };
  }

  // Handles one Telegram update. Links the chat if it's "/start <token>".
  async function handleUpdate(update) {
    const msg = update?.message;
    const chatId = msg?.chat?.id;
    const text = msg?.text || '';
    if (!chatId) return { handled: false };

    const m = text.match(/^\/start(?:\s+(\S+))?/);
    if (!m) return { handled: false };

    const token = m[1];
    if (!token) {
      await reply(chatId, 'Open the app and tap "Link Telegram" to connect your account.');
      return { handled: true, linked: false, reason: 'no_token' };
    }

    const res = await pool.query(
      `UPDATE telegram_link_tokens
          SET used_at = now()
        WHERE token = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING user_id`,
      [token]
    );
    if (res.rowCount === 0) {
      await reply(chatId, 'This link is invalid or expired. Generate a new one from the app.');
      return { handled: true, linked: false, reason: 'bad_token' };
    }

    const userId = res.rows[0].user_id;
    await pool.query(
      `INSERT INTO user_telegram_links (user_id, chat_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET chat_id = EXCLUDED.chat_id, linked_at = now()`,
      [userId, String(chatId)]
    );
    await reply(chatId, '✅ Telegram linked. You will now receive alerts here.');
    return { handled: true, linked: true, userId, chatId: String(chatId) };
  }

  async function reply(chatId, text) {
    if (!botToken) return;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    }).catch(() => {});
  }

  return { createLinkToken, handleUpdate };
}

module.exports = { createLinking };
