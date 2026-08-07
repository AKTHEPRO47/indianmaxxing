'use strict';

const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const { TriggerType } = require('../config');

// Watches watchlist tickers and auto-fires PRICE_ALERT events when a stock
// moves past the threshold. Stand-in for the AI model / market feed upstream;
// the dispatcher's cooldown prevents repeat alerts for 24h.
function createPriceMonitor(dispatcher, {
  watchlistProvider,          // async () => [{ userId, ticker, thresholdPct? }]
  thresholdPct = 5,           // UC-008 default: significant move >= 5%
  intervalMs = 5 * 60 * 1000,
  deepLinkBase = '',
  onCheck = () => {},
} = {}) {
  if (!watchlistProvider) throw new Error('watchlistProvider is required');
  let timer = null;

  async function checkOnce() {
    const entries = await watchlistProvider();
    const results = [];
    for (const w of entries) {
      try {
        const q = await yahooFinance.quote(w.ticker);
        const pct = q.regularMarketChangePercent;
        const limit = w.thresholdPct ?? thresholdPct;
        const fired = typeof pct === 'number' && Math.abs(pct) >= limit;
        results.push({ ticker: w.ticker, userId: w.userId, pct, fired });
        if (fired) {
          dispatcher.enqueue({
            userId: w.userId,
            ticker: w.ticker,
            stockName: q.shortName || q.longName || w.ticker,
            triggerType: TriggerType.PRICE_ALERT,
            data: {
              currentPrice: q.regularMarketPrice,
              changePct: Number(pct.toFixed(2)),
            },
            aiContext: `Moved ${pct >= 0 ? 'up' : 'down'} ${Math.abs(pct).toFixed(1)}% today`,
            deepLink: deepLinkBase ? `${deepLinkBase}/${w.ticker}` : undefined,
          });
        }
      } catch (err) {
        results.push({ ticker: w.ticker, userId: w.userId, error: err.message });
      }
    }
    onCheck(results);
    return results;
  }

  function start() {
    if (timer) return;
    checkOnce().catch(() => {});
    timer = setInterval(() => checkOnce().catch(() => {}), intervalMs);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { start, stop, checkOnce };
}

module.exports = { createPriceMonitor };
