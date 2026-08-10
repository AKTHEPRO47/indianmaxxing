'use strict';

const prisma = require('../database');
const ws = require('../websocket');
const notificationDispatcher = require('./notificationDispatcher');

function signalBody(company, signal) {
  const ticker = company.ticker ? ` (${company.ticker})` : '';
  const source = signal.source ? ` Source: ${signal.source}.` : '';
  const summary = signal.explanation || signal.title;
  return `${company.name}${ticker} has a new ${signal.category} signal: ${summary}${source}`;
}

async function notifyWatchersOfSignal({ company, signal }) {
  const watchlistItems = await prisma.userWatchlistItem.findMany({
    where: { companyId: company.id },
    include: { user: true },
  });

  await Promise.allSettled(watchlistItems.map(async ({ user }) => {
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        companyId: company.id,
        triggerType: 'watchlist_signal',
        channel: 'IN_APP',
        title: `New signal: ${company.ticker || company.name}`,
        body: signalBody(company, signal),
        deepLink: `/#/companies/${company.id}`,
        metadataJson: JSON.stringify({ signalId: signal.id }),
        deliveredAt: new Date(),
      },
    });

    const delivery = await notificationDispatcher.dispatchInAppNotification({
      user,
      title: notification.title,
      body: notification.body,
      triggerType: notification.triggerType,
      companyName: company.name,
    }).catch(error => ({ delivery: { status: 'failed', error: error.message } }));

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { metadataJson: JSON.stringify({ signalId: signal.id, delivery }) },
    });
    ws.pushToUser(user.id, { notification: updated });
  }));

  return watchlistItems.length;
}

module.exports = { notifyWatchersOfSignal };