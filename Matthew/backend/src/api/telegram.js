'use strict';

const express = require('express');

// POST /telegram/link     -> { url } deep link for the logged-in user
// POST /telegram/webhook  -> receives Telegram updates (production; use the
//                            poller in local dev instead)
function telegramRoutes(linking, { webhookSecret } = {}) {
  const router = express.Router();

  router.post('/telegram/link', async (req, res) => {
    const userId = req.user?.id ?? Number(req.body?.userId);
    if (!userId) return res.status(401).json({ error: 'unauthenticated' });
    try {
      const { url } = await linking.createLinkToken(userId);
      res.json({ url });
    } catch (err) {
      res.status(500).json({ error: 'failed to create link' });
    }
  });

  router.post('/telegram/webhook', express.json(), async (req, res) => {
    if (webhookSecret &&
        req.get('x-telegram-bot-api-secret-token') !== webhookSecret) {
      return res.sendStatus(403);
    }
    await linking.handleUpdate(req.body).catch(() => {});
    res.sendStatus(200);
  });

  return router;
}

module.exports = { telegramRoutes };
