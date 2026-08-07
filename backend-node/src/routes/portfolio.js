'use strict';

const express = require('express');
const prisma = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /portfolios ───────────────────────────────────────

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId: req.user.id },
      include: {
        items: {
          include: { company: { include: { scoreSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const enriched = portfolios.map(p => enrichPortfolio(p));
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// ── POST /portfolios ──────────────────────────────────────

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ detail: 'Portfolio name is required.' });

    const portfolio = await prisma.portfolio.create({
      data: { userId: req.user.id, name, description: description || null },
    });
    res.status(201).json(portfolio);
  } catch (err) {
    next(err);
  }
});

// ── GET /portfolios/:id ───────────────────────────────────

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
      include: {
        items: {
          include: { company: { include: { scoreSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
        },
      },
    });
    if (!portfolio) return res.status(404).json({ detail: 'Portfolio not found.' });
    res.json(enrichPortfolio(portfolio));
  } catch (err) {
    next(err);
  }
});

// ── PUT /portfolios/:id ───────────────────────────────────

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
    });
    if (!portfolio) return res.status(404).json({ detail: 'Portfolio not found.' });

    const { name, description } = req.body;
    const updated = await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: { name: name || portfolio.name, description: description ?? portfolio.description },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /portfolios/:id ────────────────────────────────

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
    });
    if (!portfolio) return res.status(404).json({ detail: 'Portfolio not found.' });
    await prisma.portfolio.delete({ where: { id: portfolio.id } });
    res.json({ message: 'Portfolio deleted.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /portfolios/:id/items ────────────────────────────

router.post('/:id/items', requireAuth, async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
    });
    if (!portfolio) return res.status(404).json({ detail: 'Portfolio not found.' });

    const { companyId, shares, avgCost, notes } = req.body;
    if (!companyId) return res.status(400).json({ detail: 'companyId is required.' });

    const company = await prisma.company.findUnique({ where: { id: parseInt(companyId) } });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });

    const item = await prisma.portfolioItem.upsert({
      where: { portfolioId_companyId: { portfolioId: portfolio.id, companyId: parseInt(companyId) } },
      update: { shares: parseFloat(shares) || 0, avgCost: avgCost ? parseFloat(avgCost) : null, notes: notes || null },
      create: {
        portfolioId: portfolio.id, companyId: parseInt(companyId),
        shares: parseFloat(shares) || 0, avgCost: avgCost ? parseFloat(avgCost) : null, notes: notes || null,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /portfolios/:id/items/:companyId ────────────────

router.delete('/:id/items/:companyId', requireAuth, async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
    });
    if (!portfolio) return res.status(404).json({ detail: 'Portfolio not found.' });

    await prisma.portfolioItem.deleteMany({
      where: { portfolioId: portfolio.id, companyId: parseInt(req.params.companyId) },
    });
    res.json({ message: 'Item removed from portfolio.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /portfolios/:id/esg-score ─────────────────────────

router.get('/:id/esg-score', requireAuth, async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
      include: {
        items: {
          include: { company: { include: { scoreSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
        },
      },
    });
    if (!portfolio) return res.status(404).json({ detail: 'Portfolio not found.' });

    const totalShares = portfolio.items.reduce((s, i) => s + i.shares, 0);
    if (totalShares === 0) return res.json({ weightedEsgScore: null, message: 'No shares in portfolio.' });

    let weightedEsg = 0;
    let weightedMomentum = 0;
    let weightedRisk = 0;

    for (const item of portfolio.items) {
      const score = item.company.scoreSnapshots[0];
      if (!score || !item.shares) continue;
      const w = item.shares / totalShares;
      weightedEsg += score.currentEsgScore * w;
      weightedMomentum += score.momentumScore * w;
      weightedRisk += score.controversyRisk * w;
    }

    res.json({
      portfolioId: portfolio.id,
      portfolioName: portfolio.name,
      weightedEsgScore: Math.round(weightedEsg * 10) / 10,
      weightedMomentum: Math.round(weightedMomentum * 10) / 10,
      weightedControversyRisk: Math.round(weightedRisk * 10) / 10,
      totalPositions: portfolio.items.length,
      calculatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ── helpers ───────────────────────────────────────────────

function enrichPortfolio(portfolio) {
  const items = portfolio.items.map(item => {
    const latestScore = item.company.scoreSnapshots?.[0] || null;
    return { ...item, company: { ...item.company, scoreSnapshots: undefined }, latestScore };
  });

  const totalShares = items.reduce((s, i) => s + i.shares, 0);
  return { ...portfolio, items, totalPositions: items.length, totalShares };
}

module.exports = router;
