'use strict';

// Drop-in logger for the Dispatcher: writes every delivery record to
// notification_log instead of console.
function createPgLogger(pool) {
  return (rec) => {
    if (rec.userId == null) return;
    pool
      .query(
        `INSERT INTO notification_log
           (user_id, ticker, trigger_type, status, delivery_mode, delivered_via, attempts, reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          rec.userId,
          rec.ticker || '',
          rec.triggerType || '',
          rec.status || 'unknown',
          rec.mode || null,
          rec.deliveredVia ? JSON.stringify(rec.deliveredVia) : null,
          rec.attempts ? JSON.stringify(rec.attempts) : null,
          rec.reason || null,
        ]
      )
      .catch((err) => console.error('[notify] log insert failed:', err.message));
  };
}

module.exports = { createPgLogger };
