'use strict';

const express = require('express');

// GET /notifications?limit=50&before=<ISO timestamp>
// Expects req.user.id from your JWT middleware (falls back to ?userId for dev).
function notificationRoutes(pool) {
  const router = express.Router();

  router.get('/notifications', async (req, res) => {
    const userId = req.user?.id ?? Number(req.query.userId);
    if (!userId) return res.status(401).json({ error: 'unauthenticated' });

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const before = req.query.before ? new Date(req.query.before) : null;

    try {
      const params = [userId, limit];
      let where = 'user_id = $1';
      if (before && !isNaN(before)) {
        params.push(before.toISOString());
        where += ` AND created_at < $${params.length}`;
      }
      const { rows } = await pool.query(
        `SELECT id, ticker, trigger_type, status, delivery_mode,
                delivered_via, reason, created_at
           FROM notification_log
          WHERE ${where}
          ORDER BY created_at DESC
          LIMIT $2`,
        params
      );
      res.json({ notifications: rows });
    } catch (err) {
      res.status(500).json({ error: 'failed to load history' });
    }
  });

  return router;
}

module.exports = { notificationRoutes };
