'use strict';

const cron = require('node-cron');
const prisma = require('./database');
const ws = require('./websocket');

/**
 * Scheduled jobs — runs market open notifications and live price checks.
 */

function startScheduler() {
  // Every minute: check for notification triggers
  cron.schedule('* * * * *', async () => {
    try {
      await checkMarketOpen();
    } catch {}
  });

  // Every 5 minutes: push market summary to connected WebSocket clients
  cron.schedule('*/5 * * * *', async () => {
    try {
      const [total, improving, riskAlerts] = await Promise.all([
        prisma.scoreSnapshot.count(),
        prisma.scoreSnapshot.count({ where: { momentumScore: { gt: 20 } } }),
        prisma.scoreSnapshot.count({ where: { controversyRisk: { gt: 75 } } }),
      ]);

      ws.broadcastMarketUpdate({ total, improving, riskAlerts, connections: ws.getConnectionCount() });
    } catch {}
  });

  // Daily at 08:00 UTC: auto-score companies that haven't been scored in 24h
  cron.schedule('0 8 * * *', async () => {
    try {
      await autoScoreStale();
    } catch {}
  });

  console.log('[Scheduler] Background jobs started.');
}

async function checkMarketOpen() {
  const now = new Date();
  const hour = now.getUTCHours();
  const day = now.getUTCDay();

  // US market open: 14:30 UTC weekdays
  if (day >= 1 && day <= 5 && hour === 14 && now.getUTCMinutes() < 2) {
    const users = await prisma.user.findMany({ where: { isActive: true } });
    for (const user of users) {
      const prefs = safeJson(user.notificationPreferencesJson);
      if (prefs.marketOpen === false) continue;

      await prisma.notification.create({
        data: {
          userId: user.id,
          triggerType: 'market_open',
          channel: 'IN_APP',
          title: 'Market Open',
          body: 'US equity markets are now open. Check your ESG watchlist for updates.',
          deliveredAt: now,
        },
      });

      ws.pushToUser(user.id, { title: 'Market Open', body: 'US markets are now open.' });
    }
  }
}

async function autoScoreStale() {
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const scoring = require('./services/scoring');

  const companies = await prisma.company.findMany({ select: { id: true } });
  for (const company of companies) {
    const latest = await prisma.scoreSnapshot.findFirst({
      where: { companyId: company.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest || latest.createdAt < threshold) {
      await scoring.calculateScores(company.id).catch(() => {});
    }
  }
}

function safeJson(str) {
  try { return JSON.parse(str || '{}'); } catch { return {}; }
}

module.exports = { startScheduler };
