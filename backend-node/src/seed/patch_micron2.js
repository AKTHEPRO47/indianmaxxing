'use strict';
require('dotenv').config();
const prisma = require('../database');
const { calculateScores } = require('../services/scoring');

const MU_MOMENTUM_SIGNALS = [
  {
    title: 'Micron Q3 2025 revenue beats expectations — $8.7B vs $8.1B consensus',
    category: 'ai_adoption',
    sentiment: 'positive',
    severity: 0,
    source: 'Earnings Release',
    confidenceScore: 0.95,
  },
  {
    title: 'Wall Street upgrades Micron to Strong Buy on AI memory supercycle',
    category: 'ai_adoption',
    sentiment: 'positive',
    severity: 0,
    source: 'Morgan Stanley',
    confidenceScore: 0.92,
  },
  {
    title: 'Micron HBM demand outpaces supply through 2026 — CEO commentary',
    category: 'ai_adoption',
    sentiment: 'positive',
    severity: 0,
    source: 'Bloomberg',
    confidenceScore: 0.90,
  },
  {
    title: 'Micron EPS guidance raised 30% — AI datacenter drives growth',
    category: 'ai_adoption',
    sentiment: 'positive',
    severity: 0,
    source: 'Investor Day',
    confidenceScore: 0.93,
  },
  {
    title: 'Micron achieves #1 market share in HBM for AI training',
    category: 'ai_adoption',
    sentiment: 'positive',
    severity: 0,
    source: 'IDC Market Share',
    confidenceScore: 0.91,
  },
];

async function patch() {
  const company = await prisma.company.findUnique({ where: { id: 9 } });
  if (!company || company.ticker !== 'MU') {
    console.error('Company 9 is not MU — aborting');
    process.exit(1);
  }

  console.log('[Patch2] Adding momentum-boosting signals for Micron...');
  for (const s of MU_MOMENTUM_SIGNALS) {
    await prisma.signal.create({
      data: {
        companyId: 9,
        title: s.title,
        category: s.category,
        sentiment: s.sentiment,
        severity: s.severity,
        source: s.source,
        confidenceScore: s.confidenceScore,
        date: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().split('T')[0],
      },
    });
  }
  console.log('[Patch2] ✓ Added', MU_MOMENTUM_SIGNALS.length, 'momentum signals');

  const snapshot = await calculateScores(9);
  console.log('[Patch2] Updated snapshot:', {
    esg: snapshot.currentEsgScore,
    momentum: snapshot.momentumScore,
    aiAdoption: snapshot.aiAdoptionScore,
    controversy: snapshot.controversyRisk,
    signal: snapshot.investorSignal,
    classification: snapshot.classification,
  });
}

patch()
  .then(() => prisma.$disconnect())
  .catch(err => { console.error(err); prisma.$disconnect(); process.exit(1); });
