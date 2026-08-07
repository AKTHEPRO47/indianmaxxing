'use strict';

const express = require('express');
const prisma = require('../database');

const router = express.Router();

// ── GET /matrix ───────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { exchange, industry, country } = req.query;
    const companyWhere = {};
    if (exchange) companyWhere.exchange = { equals: exchange, mode: 'insensitive' };
    if (industry) companyWhere.industry = { contains: industry };
    if (country) companyWhere.country = { contains: country };

    const companies = await prisma.company.findMany({
      where: companyWhere,
      select: { id: true, name: true, ticker: true, exchange: true, industry: true, country: true, logoUrl: true, dividendYield: true, annualDividend: true, marketCap: true },
    });

    const matrixData = await Promise.all(companies.map(async (company) => {
      const latestScore = await prisma.scoreSnapshot.findFirst({
        where: { companyId: company.id },
        orderBy: { createdAt: 'desc' },
      });

      if (!latestScore) return null;

      return {
        company,
        currentEsgScore: latestScore.currentEsgScore,
        momentumScore: latestScore.momentumScore,
        aiAdoptionScore: latestScore.aiAdoptionScore,
        controversyRisk: latestScore.controversyRisk,
        environmentalScore: latestScore.environmentalScore,
        socialScore: latestScore.socialScore,
        governanceScore: latestScore.governanceScore,
        classification: latestScore.classification,
        investorSignal: latestScore.investorSignal,
        confidenceScore: latestScore.confidenceScore,
        snapshotDate: latestScore.createdAt,
      };
    }));

    res.json({ entries: matrixData.filter(Boolean) });
  } catch (err) {
    next(err);
  }
});

// ── GET /matrix/leaderboard ───────────────────────────────

router.get('/leaderboard', async (req, res, next) => {
  try {
    const { sortBy = 'esgScore', limit = '20', order = 'desc' } = req.query;

    const fieldMap = {
      esgScore: 'currentEsgScore',
      momentum: 'momentumScore',
      ai: 'aiAdoptionScore',
      risk: 'controversyRisk',
    };
    const field = fieldMap[sortBy] || 'currentEsgScore';

    const snapshots = await prisma.scoreSnapshot.findMany({
      distinct: ['companyId'],
      orderBy: [{ createdAt: 'desc' }],
      take: parseInt(limit, 10) * 3, // fetch extra to deduplicate and sort
      include: { company: true },
    });

    // Keep latest per company, then sort
    const latestByCompany = new Map();
    for (const s of snapshots) {
      if (!latestByCompany.has(s.companyId)) latestByCompany.set(s.companyId, s);
    }

    const sorted = [...latestByCompany.values()]
      .sort((a, b) => order === 'desc' ? b[field] - a[field] : a[field] - b[field])
      .slice(0, parseInt(limit, 10));

    res.json(sorted.map((s, i) => ({ rank: i + 1, company: s.company, ...s })));
  } catch (err) {
    next(err);
  }
});

// ── GET /matrix/peer-groups ────────────────────────────────

router.get('/peer-groups', async (req, res, next) => {
  try {
    const groups = await prisma.peerGroup.findMany({
      include: { members: { include: { company: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(groups);
  } catch (err) {
    next(err);
  }
});

router.post('/peer-groups', async (req, res, next) => {
  try {
    const { name, description, industry, companyIds = [] } = req.body;
    if (!name) return res.status(400).json({ detail: 'Name is required.' });

    const group = await prisma.peerGroup.create({ data: { name, description: description || null, industry: industry || null } });

    if (companyIds.length) {
      await prisma.peerGroupMember.createMany({
        data: companyIds.map(id => ({ peerGroupId: group.id, companyId: parseInt(id) })),
        skipDuplicates: true,
      });
    }

    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
});

router.get('/peer-groups/:id/benchmarks', async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const members = await prisma.peerGroupMember.findMany({
      where: { peerGroupId: groupId },
      include: { company: true },
    });

    const benchmarks = await Promise.all(members.map(async (m) => {
      const latestScore = await prisma.scoreSnapshot.findFirst({
        where: { companyId: m.companyId },
        orderBy: { createdAt: 'desc' },
      });
      return { company: m.company, latestScore };
    }));

    // Compute averages
    const withScores = benchmarks.filter(b => b.latestScore);
    const avg = withScores.length > 0 ? {
      esgScore: withScores.reduce((s, b) => s + b.latestScore.currentEsgScore, 0) / withScores.length,
      momentum: withScores.reduce((s, b) => s + b.latestScore.momentumScore, 0) / withScores.length,
      ai: withScores.reduce((s, b) => s + b.latestScore.aiAdoptionScore, 0) / withScores.length,
      risk: withScores.reduce((s, b) => s + b.latestScore.controversyRisk, 0) / withScores.length,
    } : null;

    res.json({ benchmarks, averages: avg });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
