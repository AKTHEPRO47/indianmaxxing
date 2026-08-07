'use strict';

const express = require('express');

const ERROR_MESSAGES = {
  not_a_discord_webhook_url: 'That doesn\'t look like a Discord webhook URL. Copy it from Channel Settings → Integrations → Webhooks.',
  webhook_not_found: 'Discord says that webhook no longer exists. Create a new one and paste it again.',
  unreachable: 'Could not reach Discord to verify the webhook. Try again in a moment.',
};

// POST   /discord/link    { webhookUrl }  -> validate, verify, store
// DELETE /discord/link                    -> unlink
// GET    /discord/status                  -> { linked }
function discordRoutes(discordLinking) {
  const router = express.Router();

  router.post('/discord/link', async (req, res) => {
    const userId = req.user?.id ?? Number(req.body?.userId);
    if (!userId) return res.status(401).json({ error: 'unauthenticated' });

    const result = await discordLinking.link(userId, req.body?.webhookUrl);
    if (!result.ok) {
      return res.status(400).json({
        error: result.error,
        message: ERROR_MESSAGES[result.error] || 'Could not link that webhook.',
      });
    }
    res.json({ linked: true });
  });

  router.delete('/discord/link', async (req, res) => {
    const userId = req.user?.id ?? Number(req.body?.userId);
    if (!userId) return res.status(401).json({ error: 'unauthenticated' });
    await discordLinking.unlink(userId);
    res.json({ linked: false });
  });

  router.get('/discord/status', async (req, res) => {
    const userId = req.user?.id ?? Number(req.query.userId);
    if (!userId) return res.status(401).json({ error: 'unauthenticated' });
    res.json(await discordLinking.status(userId));
  });

  return router;
}

module.exports = { discordRoutes };
