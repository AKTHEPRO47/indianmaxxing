'use strict';

const express = require('express');
const prisma = require('../database');
const marketData = require('../services/marketData');

const router = express.Router();

/**
 * GET /market/batch-quotes?tickers=AAPL,MSFT,TSLA
 * Returns current quote (price + change) for up to 20 tickers.
 * Used by the live price ticker in the Navbar.
 */
router.get('/batch-quotes', async (req, res, next) => {
  try {
    const tickerList = (req.query.tickers || '')
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 20);

    if (tickerList.length === 0) return res.json({});

    const results = await Promise.allSettled(
      tickerList.map(ticker => marketData.fetchStockData(ticker, '1d'))
    );

    const quotes = {};
    results.forEach((r, i) => {
      const ticker = tickerList[i];
      if (r.status === 'fulfilled' && r.value) {
        const d = r.value;
        const lastPrice = d.currentPrice ?? d.prices?.slice(-1)[0]?.close ?? null;
        const prevClose = d.previousClose ?? null;
        const change = lastPrice != null && prevClose != null ? lastPrice - prevClose : null;
        const changePct = change != null && prevClose ? (change / prevClose) * 100 : null;
        quotes[ticker] = {
          ticker,
          lastPrice: lastPrice != null ? parseFloat(lastPrice.toFixed(2)) : null,
          change: change != null ? parseFloat(change.toFixed(2)) : null,
          changePct: changePct != null ? parseFloat(changePct.toFixed(2)) : null,
          currency: d.currency || 'USD',
        };
      } else {
        quotes[ticker] = { ticker, lastPrice: null, change: null, changePct: null, currency: 'USD' };
      }
    });

    res.json(quotes);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /market/movers
 * Returns top 5 gainers and losers from the 71 seeded companies.
 */
router.get('/movers', async (req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      where: { ticker: { not: null } },
      select: { id: true, name: true, ticker: true, logoUrl: true },
      take: 20,
    });

    const results = await Promise.allSettled(
      companies.map(c => marketData.fetchStockData(c.ticker, '1d'))
    );

    const movers = companies
      .map((c, i) => {
        const r = results[i];
        if (r.status !== 'fulfilled') return null;
        const d = r.value;
        const lastPrice = d.currentPrice ?? d.prices?.slice(-1)[0]?.close ?? null;
        const prevClose = d.previousClose ?? null;
        const changePct = lastPrice != null && prevClose ? ((lastPrice - prevClose) / prevClose) * 100 : null;
        return { ...c, lastPrice, changePct };
      })
      .filter(m => m != null && m.changePct != null);

    movers.sort((a, b) => b.changePct - a.changePct);

    res.json({
      gainers: movers.slice(0, 5),
      losers: movers.slice(-5).reverse(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
