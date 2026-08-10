'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const prisma = require('../database');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const activityLogger = require('../utils/activityLogger');
const scoringService = require('../services/scoring');
const logoLookup = require('../services/logoLookup');
const marketData = require('../services/marketData');
const signalClassifier = require('../agents/signalClassifier');
const { notifyWatchersOfSignal } = require('../services/watchlistSignalNotifications');
const { scanCompanyTechnical } = require('../services/technicalAnalysis');
const { stringifyCSV } = require('../utils/csvHelper');

const router = express.Router();

// ── Stock response shape helper ───────────────────────────
// Transforms raw Yahoo Finance data into the frontend StockData shape
function buildStockResponse(companyId, company, raw, range) {
  const prices = raw.prices || [];
  const lastPrice = raw.currentPrice ?? (prices.length ? prices[prices.length - 1].close : null);
  const prevClose = raw.previousClose ?? null;
  const change = (lastPrice != null && prevClose != null) ? +(lastPrice - prevClose).toFixed(4) : null;
  const changePct = (change != null && prevClose) ? +(change / prevClose * 100).toFixed(4) : null;
  const highs = prices.map(p => p.high).filter(v => v != null);
  const lows  = prices.map(p => p.low).filter(v => v != null);

  return {
    companyId,
    companyName: company.name,
    ticker: company.ticker,
    range,
    quote: {
      symbol: raw.symbol || company.ticker,
      currency: raw.currency || 'USD',
      exchange: raw.exchangeName || company.exchange || null,
      quoteType: 'EQUITY',
      lastPrice,
      change,
      changePercent: changePct,
      open: prices.length ? prices[prices.length - 1].open : null,
      high: prices.length ? prices[prices.length - 1].high : null,
      low:  prices.length ? prices[prices.length - 1].low  : null,
      previousClose: prevClose,
      dayHigh: prices.length ? prices[prices.length - 1].high : null,
      dayLow:  prices.length ? prices[prices.length - 1].low  : null,
      yearHigh: highs.length ? Math.max(...highs) : null,
      yearLow:  lows.length  ? Math.min(...lows)  : null,
      fiftyDayAverage: null,
      twoHundredDayAverage: null,
      volume: prices.length ? prices[prices.length - 1].volume : null,
      averageVolume: null,
      marketCap: null,
      premarketPrice: null,
      premarketChange: null,
      premarketChangePercent: null,
      premarketAsOf: null,
      source: 'Yahoo Finance',
      asOf: new Date().toISOString(),
    },
    history: prices,
    dividends: [],
    quarterlyProgress: [],
    annualDividend: null,
    dividendYield: null,
    lastDividendDate: null,
  };
}

// ── File upload setup ─────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(config.uploadDir, String(req.params.companyId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.txt', '.docx'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Only PDF, TXT, and DOCX files are allowed.'));
    }
    cb(null, true);
  },
});

// ── POST /companies ───────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const { name, ticker, exchange, industry, country, description, logoUrl, websiteUrl, executiveName, executiveUrl, marketCap } = req.body;
    if (!name) return res.status(400).json({ detail: 'Company name is required.' });

    if (ticker) {
      const existing = await prisma.company.findUnique({ where: { ticker } });
      if (existing) return res.status(400).json({ detail: `Ticker ${ticker} already exists.` });
    }

    const company = await prisma.company.create({
      data: {
        name, ticker: ticker || null, exchange: exchange || null,
        industry: industry || null, country: country || null,
        description: description || null,
        logoUrl: logoUrl || (ticker ? logoLookup.logoUrlForTicker(ticker) : null),
        websiteUrl: websiteUrl || null, executiveName: executiveName || null,
        executiveUrl: executiveUrl || null, marketCap: marketCap || null,
      },
    });
    res.status(201).json(company);
  } catch (err) {
    next(err);
  }
});

// ── GET /companies ────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { q, exchange, industry, country, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { ticker: { contains: q.toUpperCase() } },
        { industry: { contains: q } },
        { exchange: { contains: q } },
        { country: { contains: q } },
      ];
    }
    if (exchange) where.exchange = { equals: exchange, mode: 'insensitive' };
    if (industry) where.industry = { contains: industry };
    if (country) where.country = { contains: country };

    const [companies, total] = await Promise.all([
      prisma.company.findMany({ where, skip, take: parseInt(limit, 10), orderBy: { name: 'asc' } }),
      prisma.company.count({ where }),
    ]);

    const enriched = await Promise.all(companies.map(async (c) => {
      const latestScore = await prisma.scoreSnapshot.findFirst({
        where: { companyId: c.id },
        orderBy: { createdAt: 'desc' },
      });
      return { ...c, latestScore: latestScore || null };
    }));

    // Return plain array for frontend compatibility; pagination headers provided separately
    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', parseInt(page, 10));
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/:id ────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });

    const latestScore = await prisma.scoreSnapshot.findFirst({
      where: { companyId: company.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ ...company, latestScore: latestScore || null });
  } catch (err) {
    next(err);
  }
});

// ── PUT /companies/:id ────────────────────────────────────

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });

    const allowed = ['name', 'exchange', 'industry', 'country', 'description', 'logoUrl', 'websiteUrl', 'executiveName', 'executiveUrl', 'marketCap'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const updated = await prisma.company.update({ where: { id }, data: updates });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /companies/:id ─────────────────────────────────

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ detail: 'Admin access required.' });
    await prisma.company.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Company deleted.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/:id/reports ────────────────────────────

router.get('/:id/reports', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });

    const reports = await prisma.report.findMany({
      where: { companyId },
      orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
    });
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

// ── POST /companies/:id/upload-report ────────────────────

router.post('/:companyId/upload-report', uploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });
    if (!req.file) return res.status(400).json({ detail: 'No file uploaded.' });

    const year = req.body.year ? parseInt(req.body.year, 10) : null;
    const userId = req.user?.id || null;

    const report = await prisma.report.create({
      data: {
        companyId, userId,
        fileName: req.file.originalname,
        year, status: 'processing',
      },
    });

    // Process in background
    const pdfParser = require('../services/pdfParser');
    const documentExtractor = require('../agents/documentExtractor');

    setImmediate(async () => {
      try {
        const pages = await pdfParser.extractPages(req.file.path);
        const textPath = req.file.path.replace(/\.[^.]+$/, '_extracted.txt');
        await pdfParser.saveExtractedText(pages, textPath);

        await prisma.report.update({
          where: { id: report.id },
          data: { extractedTextPath: textPath, pageCount: pages.length },
        });

        const extracted = await documentExtractor.extract(pages, company.name);
        for (const item of extracted) {
          const ev = await prisma.evidence.create({
            data: {
              companyId, reportId: report.id,
              sourceType: 'pdf',
              sourceName: req.file.originalname,
              sourceDate: year ? String(year) : null,
              pageNumber: item.pageNumber || null,
              evidenceText: item.evidenceText,
              category: item.pillar || null,
              confidenceScore: item.confidenceScore || 0.5,
            },
          });

          if (item.value != null) {
            await prisma.eSGMetric.create({
              data: {
                companyId, reportId: report.id,
                metricName: item.metricName,
                pillar: item.pillar,
                value: item.value,
                unit: item.unit || null,
                year: year || null,
                confidenceScore: item.confidenceScore || 0.5,
                evidenceId: ev.id,
              },
            });
          }
        }

        await prisma.report.update({ where: { id: report.id }, data: { status: 'done' } });
      } catch (err) {
        await prisma.report.update({ where: { id: report.id }, data: { status: 'failed' } }).catch(() => {});
      }
    });

    if (req.user) activityLogger.log(req.user.id, 'upload_report', 'report', report.id, { companyId }, req);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

// ── POST /companies/:id/scan-signals ─────────────────────

router.post('/:id/scan-signals', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });

    const openaiService = require('../services/openai');
    const rawSignals = await openaiService.generateSignals(company.name);

    const created = [];
    for (const s of rawSignals) {
      const classified = signalClassifier.classify(s.title, s.body || '', s.source || '', s.date || '');
      const signal = await prisma.signal.create({
        data: {
          companyId,
          title: classified.title,
          category: classified.category,
          sentiment: classified.sentiment,
          severity: classified.severity,
          date: classified.date || null,
          source: classified.source || null,
          explanation: classified.explanation,
          confidenceScore: classified.confidenceScore,
        },
      });
      created.push(signal);
      await notifyWatchersOfSignal({ company, signal }).catch(error => {
        console.warn(`[Notifications] Signal ${signal.id}: ${error.message}`);
      });
    }

    res.json({ message: `${created.length} signal(s) added.`, signals: created });
  } catch (err) {
    next(err);
  }
});

// ── POST /companies/:id/calculate-scores ─────────────────

router.post('/:id/calculate-scores', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });

    const snapshot = await scoringService.calculateScores(companyId);
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

// ── POST /companies/:id/scan-technical ───────────────────

router.post('/:id/scan-technical', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, ticker: true },
    });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });

    res.json(await scanCompanyTechnical(company));
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/:id/score-history ─────────────────────

router.get('/:id/score-history', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const { limit = '30' } = req.query;

    const snapshots = await prisma.scoreSnapshot.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
    });
    res.json(snapshots.reverse()); // Chronological order
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/:id/scores (alias for score-history) ──

router.get('/:id/scores', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const { limit = '30' } = req.query;

    const snapshots = await prisma.scoreSnapshot.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
    });
    res.json(snapshots.reverse());
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/:id/quant-analytics ───────────────────

router.get('/:id/quant-analytics', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const { lookback_points = '12' } = req.query;
    const lookback = parseInt(lookback_points, 10);

    const snapshots = await prisma.scoreSnapshot.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: lookback,
    });

    if (snapshots.length === 0) {
      return res.status(404).json({ detail: 'No score history found for this company.' });
    }

    const latest = snapshots[0];
    const scores = snapshots.map(s => s.currentEsgScore);
    const momenta = snapshots.map(s => s.momentumScore);

    // Compute simple linear regression slope for ESG trend
    const n = scores.length;
    const meanX = (n - 1) / 2;
    const meanY = scores.reduce((a, b) => a + b, 0) / n;
    const slope = n > 1
      ? scores.reduce((acc, y, i) => acc + (i - meanX) * (y - meanY), 0) /
        scores.reduce((acc, _, i) => acc + (i - meanX) ** 2, 0)
      : 0;

    const avgMomentum = momenta.reduce((a, b) => a + b, 0) / n;
    const maxEsgDrawdown = Math.max(2, 22 - latest.currentEsgScore * 0.2);
    const downsideRisk = Math.max(0.2, latest.controversyRisk / 35);
    const riskAdjMomentum = avgMomentum * (1 - latest.controversyRisk / 100);
    const signalQuality = Math.max(35, Math.min(85, 50 + avgMomentum * 0.4 - latest.controversyRisk * 0.2));
    const positiveRatio = Math.max(10, Math.min(90, 50 + avgMomentum * 0.8));
    const evidenceCoverage = Math.max(20, Math.min(100, 45 + latest.currentEsgScore * 0.5));

    const regime = avgMomentum > 20 ? 'Compounding Upside'
      : avgMomentum < -20 ? 'De-Rating Risk'
      : 'Transition';

    res.json({
      companyId,
      lookbackPoints: snapshots.length,
      esgTrendSlope: parseFloat(slope.toFixed(2)),
      momentumAcceleration: parseFloat((avgMomentum / 10).toFixed(2)),
      maxEsgDrawdownPct: parseFloat(maxEsgDrawdown.toFixed(2)),
      downsideRisk: parseFloat(downsideRisk.toFixed(2)),
      riskAdjustedMomentum: parseFloat(riskAdjMomentum.toFixed(2)),
      signalQualityScore: parseFloat(signalQuality.toFixed(2)),
      positiveSignalRatio: parseFloat(positiveRatio.toFixed(2)),
      evidenceCoverageRatio: parseFloat(evidenceCoverage.toFixed(2)),
      dataFreshnessDays: 7,
      regime,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/:id/signals ────────────────────────────

router.get('/:id/signals', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const { category, sentiment, limit = '50' } = req.query;
    const where = { companyId };
    if (category) where.category = category;
    if (sentiment) where.sentiment = sentiment;

    const signals = await prisma.signal.findMany({
      where, orderBy: { createdAt: 'desc' }, take: parseInt(limit, 10),
    });
    res.json(signals);
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/:id/evidence ───────────────────────────

router.get('/:id/evidence', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const { reportId, category, limit = '50' } = req.query;
    const where = { companyId };
    if (reportId) where.reportId = parseInt(reportId, 10);
    if (category) where.category = category;

    const evidences = await prisma.evidence.findMany({
      where, orderBy: { createdAt: 'desc' }, take: parseInt(limit, 10),
    });
    res.json(evidences);
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/:id/metrics ────────────────────────────

router.get('/:id/metrics', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const metrics = await prisma.eSGMetric.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/:id/stock ──────────────────────────────

router.get('/:id/stock', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });
    if (!company.ticker) return res.status(400).json({ detail: 'No ticker available for this company.' });

    const range = req.query.range || '1mo';
    const raw = await marketData.fetchStockData(company.ticker, range);
    res.json(buildStockResponse(companyId, company, raw, range));
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/:id/stock-data (alias for /stock) ─────

router.get('/:id/stock-data', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });
    if (!company.ticker) return res.status(400).json({ detail: 'No ticker available for this company.' });

    const range = req.query.range || '1mo';
    const raw = await marketData.fetchStockData(company.ticker, range);
    res.json(buildStockResponse(companyId, company, raw, range));
  } catch (err) {
    next(err);
  }
});

// ── POST /companies/:id/copilot ───────────────────────────

router.post('/:id/copilot', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });

    const { query } = req.body;
    if (!query) return res.status(400).json({ detail: 'Query is required.' });

    const [signals, evidences, latestScore] = await Promise.all([
      prisma.signal.findMany({ where: { companyId }, take: 20, orderBy: { createdAt: 'desc' } }),
      prisma.evidence.findMany({ where: { companyId }, take: 10, orderBy: { createdAt: 'desc' } }),
      prisma.scoreSnapshot.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } }),
    ]);

    const openaiService = require('../services/openai');
    const answer = await openaiService.copilotQuery(company, query, signals, evidences, latestScore);
    res.json({ answer, company: company.name });
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/:id/esg-summary (AI-generated) ────────

router.get('/:id/esg-summary', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });

    const [signals, latestScore] = await Promise.all([
      prisma.signal.findMany({ where: { companyId }, take: 30, orderBy: { createdAt: 'desc' } }),
      prisma.scoreSnapshot.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } }),
    ]);

    const openaiService = require('../services/openai');
    const summary = await openaiService.generateEsgSummary(company, signals, latestScore);
    res.json({ summary, companyId, generatedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/compare ────────────────────────────────

router.get('/compare/batch', async (req, res, next) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ detail: 'ids query param required (comma-separated).' });

    const companyIds = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(Boolean).slice(0, 10);

    const results = await Promise.all(companyIds.map(async (id) => {
      const company = await prisma.company.findUnique({ where: { id } });
      if (!company) return null;
      const latestScore = await prisma.scoreSnapshot.findFirst({ where: { companyId: id }, orderBy: { createdAt: 'desc' } });
      const signalCount = await prisma.signal.count({ where: { companyId: id } });
      return { ...company, latestScore, signalCount };
    }));

    res.json(results.filter(Boolean));
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/:id/full-text-search ───────────────────

router.get('/:id/search', async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const { q, limit = '20' } = req.query;
    if (!q) return res.status(400).json({ detail: 'Search query required.' });

    const [evidences, signals] = await Promise.all([
      prisma.evidence.findMany({
        where: { companyId, evidenceText: { contains: q } },
        take: parseInt(limit, 10),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.signal.findMany({
        where: { companyId, title: { contains: q } },
        take: parseInt(limit, 10),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({ evidences, signals, query: q });
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/:id/report/:reportId/share ─────────────

router.post('/:companyId/reports/:reportId/share', requireAuth, async (req, res, next) => {
  try {
    const reportId = parseInt(req.params.reportId);
    const companyId = parseInt(req.params.companyId);

    const report = await prisma.report.findFirst({ where: { id: reportId, companyId } });
    if (!report) return res.status(404).json({ detail: 'Report not found.' });

    const { generateToken } = require('../utils/security');
    let shareToken = report.shareToken;
    if (!shareToken) {
      shareToken = generateToken().substring(0, 32);
      await prisma.report.update({ where: { id: reportId }, data: { shareToken } });
    }

    res.json({ shareUrl: `${config.frontendUrl}/shared/report/${shareToken}`, shareToken });
  } catch (err) {
    next(err);
  }
});

// ── GET /companies/shared/:token ──────────────────────────

router.get('/shared/:token', async (req, res, next) => {
  try {
    const report = await prisma.report.findFirst({
      where: { shareToken: req.params.token },
      include: { company: true },
    });
    if (!report) return res.status(404).json({ detail: 'Shared report not found.' });

    const evidences = await prisma.evidence.findMany({
      where: { reportId: report.id },
      take: 50,
    });

    res.json({ report, company: report.company, evidences });
  } catch (err) {
    next(err);
  }
});

// ── GET /companies (export CSV) ────────────────────────────

router.get('/export/csv', async (req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      include: { scoreSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    const rows = companies.map(c => ({
      id: c.id, name: c.name, ticker: c.ticker || '',
      exchange: c.exchange || '', industry: c.industry || '',
      country: c.country || '', marketCap: c.marketCap || '',
      esgScore: c.scoreSnapshots[0]?.currentEsgScore ?? '',
      momentum: c.scoreSnapshots[0]?.momentumScore ?? '',
      classification: c.scoreSnapshots[0]?.classification ?? '',
      investorSignal: c.scoreSnapshots[0]?.investorSignal ?? '',
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="companies-esg.csv"');

    const csvStr = await stringifyCSV(rows);
    res.send(csvStr);
  } catch (err) {
    next(err);
  }
});

// ── POST /companies/import-csv ─────────────────────────────

router.post('/import/csv', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ detail: 'Admin access required.' });
    if (!req.file) return res.status(400).json({ detail: 'No file uploaded.' });

    const { parse } = require('csv-parse/sync');
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true });

    let created = 0, skipped = 0;
    for (const row of records) {
      if (!row.name) { skipped++; continue; }
      const existing = row.ticker ? await prisma.company.findUnique({ where: { ticker: row.ticker } }) : null;
      if (existing) { skipped++; continue; }

      await prisma.company.create({
        data: {
          name: row.name,
          ticker: row.ticker || null,
          exchange: row.exchange || null,
          industry: row.industry || null,
          country: row.country || null,
          description: row.description || null,
          marketCap: row.marketCap || null,
          logoUrl: row.ticker ? logoLookup.logoUrlForTicker(row.ticker) : null,
        },
      });
      created++;
    }

    fs.unlinkSync(req.file.path);
    res.json({ message: `Import complete. Created: ${created}, Skipped: ${skipped}.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
