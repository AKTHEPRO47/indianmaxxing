'use strict';

const express = require('express');
const prisma = require('../database');
const marketData = require('../services/marketData');

const router = express.Router();

// ── GET /dashboard ────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const [
      hiddenWinnerIds,
      overratedIds,
      watchlistIds,
      recentControversies,
    ] = await Promise.all([
      prisma.scoreSnapshot.findMany({
        where: { classification: 'Hidden Winner' },
        orderBy: { momentumScore: 'desc' },
        distinct: ['companyId'],
        take: 5,
        select: { companyId: true },
      }),
      prisma.scoreSnapshot.findMany({
        where: { classification: 'Overrated Leader' },
        orderBy: { momentumScore: 'asc' },
        distinct: ['companyId'],
        take: 5,
        select: { companyId: true },
      }),
      prisma.scoreSnapshot.findMany({
        orderBy: { createdAt: 'desc' },
        distinct: ['companyId'],
        take: 10,
        select: { companyId: true },
      }),
      prisma.signal.findMany({
        where: { category: 'controversy' },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { company: true },
      }),
    ]);

    const enrichCompanies = async (ids) => {
      return Promise.all(ids.map(async ({ companyId }) => {
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) return null;
        const latestScore = await prisma.scoreSnapshot.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
        });
        return { ...company, latestScore: latestScore || null };
      })).then(results => results.filter(Boolean));
    };

    const [hiddenWinners, overratedLeaders, watchlist] = await Promise.all([
      enrichCompanies(hiddenWinnerIds),
      enrichCompanies(overratedIds),
      enrichCompanies(watchlistIds),
    ]);

    const marketSummary = await generateMarketSummary();

    res.json({
      hiddenWinners,
      overratedLeaders,
      recentControversies: recentControversies.map(s => ({
        ...s,
        companyName: s.company?.name,
        companyTicker: s.company?.ticker,
      })),
      watchlist,
      marketSummary,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /dashboard/stats ──────────────────────────────────

router.get('/stats', async (req, res, next) => {
  try {
    const [totalCompanies, totalSignals, totalReports, snapshotStats] = await Promise.all([
      prisma.company.count(),
      prisma.signal.count(),
      prisma.report.count(),
      prisma.scoreSnapshot.aggregate({
        _avg: { currentEsgScore: true, momentumScore: true, controversyRisk: true, aiAdoptionScore: true },
        _count: true,
      }),
    ]);

    const [improving, declining, riskAlerts] = await Promise.all([
      prisma.scoreSnapshot.count({ where: { momentumScore: { gt: 20 } } }),
      prisma.scoreSnapshot.count({ where: { momentumScore: { lt: -20 } } }),
      prisma.scoreSnapshot.count({ where: { controversyRisk: { gt: 75 } } }),
    ]);

    const byClassification = await prisma.scoreSnapshot.groupBy({
      by: ['classification'],
      _count: { id: true },
    });

    const bySignal = await prisma.scoreSnapshot.groupBy({
      by: ['investorSignal'],
      _count: { id: true },
    });

    res.json({
      totals: { companies: totalCompanies, signals: totalSignals, reports: totalReports, snapshots: snapshotStats._count },
      averages: snapshotStats._avg,
      momentum: { improving, declining, stable: (snapshotStats._count - improving - declining) },
      riskAlerts,
      byClassification: Object.fromEntries(byClassification.map(r => [r.classification, r._count.id])),
      byInvestorSignal: Object.fromEntries(bySignal.map(r => [r.investorSignal, r._count.id])),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /dashboard/trending ───────────────────────────────

router.get('/trending', async (req, res, next) => {
  try {
    // Companies with biggest ESG momentum change in last 7 days
    const recent = await prisma.scoreSnapshot.findMany({
      where: { createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { momentumScore: 'desc' },
      take: 10,
      include: { company: true },
    });

    res.json(recent.map(s => ({ ...s.company, snapshot: s })));
  } catch (err) {
    next(err);
  }
});

// ── GET /dashboard/dividends ───────────────────────────────────────────────────

router.get('/dividends', async (req, res, next) => {
  try {
    const includeZero = req.query.include_zero !== 'false';
    const limit = parseInt(req.query.limit, 10) || 300;
    const refresh = req.query.refresh === 'true';

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        ticker: true,
        exchange: true,
        country: true,
        annualDividend: true,
        dividendYield: true,
        lastDividendDate: true,
        payoutFrequency: true,
      },
      take: limit,
    });

    const hydrated = await mapWithConcurrency(companies, 6, async company => {
      if (!company.ticker || (!refresh && company.payoutFrequency !== null)) return { company, live: null };

      const live = await marketData.fetchDividendSummary(company.ticker);
      if (!live.error) {
        await prisma.company.update({
          where: { id: company.id },
          data: {
            annualDividend: live.annualDividend,
            dividendYield: live.dividendYield,
            lastDividendDate: live.lastDividendDate,
            payoutFrequency: live.payoutFrequency,
          },
        });
      }
      return { company, live };
    });

    const rows = hydrated.map(({ company, live }) => {
      const annualDividend = live && !live.error ? live.annualDividend : company.annualDividend;
      const dividendYield = live && !live.error ? live.dividendYield : company.dividendYield;
      const lastDividendDate = live && !live.error ? live.lastDividendDate : company.lastDividendDate;
      const payoutFrequency = live && !live.error ? live.payoutFrequency : company.payoutFrequency;
      const payoutCount = live && !live.error ? live.payoutCount : annualDividend
        ? payoutFrequency === 'Quarterly' ? 4
          : payoutFrequency === 'Semi-Annual' ? 2
            : payoutFrequency === 'Monthly' ? 12
              : 1
        : 0;

      return {
        companyId: company.id,
        companyName: company.name,
        ticker: company.ticker ?? '',
        exchange: company.exchange ?? null,
        country: company.country ?? null,
        annualDividend,
        dividendYield,
        lastDividendDate,
        payoutCount,
        status: live?.error ? 'error' : annualDividend ? 'live' : payoutFrequency === 'None' ? 'no_dividend' : 'no_data',
      };
    });

    const result = includeZero ? rows : rows.filter(r => r.annualDividend !== null);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function generateMarketSummary() {
  const total = await prisma.scoreSnapshot.count();
  if (total === 0) return 'ESG Momentum Engine initializing. Seed data loading...';

  const [improving, declining, riskAlerts] = await Promise.all([
    prisma.scoreSnapshot.count({ where: { momentumScore: { gt: 20 } } }),
    prisma.scoreSnapshot.count({ where: { momentumScore: { lt: -20 } } }),
    prisma.scoreSnapshot.count({ where: { controversyRisk: { gt: 75 } } }),
  ]);

  const pctImproving = Math.round((improving / total) * 100);
  return (
    `ESG Momentum Pulse: ${improving}/${total} tracked companies show improving ESG momentum (+${pctImproving}%). ` +
    `${declining} companies are in decline. ${riskAlerts} active Risk Alert(s) flagged. ` +
    `AI adoption signals are strongest in Technology and Industrials sectors. ` +
    `Greenwashing risk remains elevated in Energy and Materials. Market confidence: Moderate.`
  );
}

module.exports = router;
