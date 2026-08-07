'use strict';

const express = require('express');
const prisma = require('../database');
const { requireAuth } = require('../middleware/auth');
const { refreshNews } = require('../services/newsIngestion');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const where = {};
    if (req.query.company_id) where.companyId = parseInt(req.query.company_id, 10);
    if (req.query.category) where.category = req.query.category;

    const signals = await prisma.signal.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: { company: { select: { id: true, name: true, ticker: true, logoUrl: true } } },
    });
    res.json(signals);
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', requireAuth, async (req, res, next) => {
  try {
    const result = await refreshNews(req.body?.limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;