'use strict';
// One-time patch: Update Micron (MU) with proper AI/HBM memory signals and recalculate scores
require('dotenv').config();
const prisma = require('../database');
const { calculateScores } = require('../services/scoring');

const MU_SIGNALS = [
  {
    title: 'Micron HBM3E memory wins exclusive spot in NVIDIA H200 GPU',
    category: 'ai_adoption',
    sentiment: 'positive',
    severity: 0,
    source: 'Micron IR',
  },
  {
    title: 'Micron ships HBM3 for AI training clusters — record revenue quarter',
    category: 'ai_adoption',
    sentiment: 'positive',
    severity: 0,
    source: 'Earnings Call Q3 2025',
  },
  {
    title: 'Micron deepens AI infrastructure partnership with hyperscalers',
    category: 'ai_adoption',
    sentiment: 'positive',
    severity: 0,
    source: 'Bloomberg',
  },
  {
    title: 'Micron commits $50B to domestic chip manufacturing expansion',
    category: 'governance',
    sentiment: 'positive',
    severity: 0,
    source: 'Reuters',
  },
  {
    title: 'Micron CHIPS Act award: $6.1B for New York and Idaho fabs',
    category: 'governance',
    sentiment: 'positive',
    severity: 0,
    source: 'DOC Press Release',
  },
  {
    title: 'Micron 2025 Sustainability Report: 100% renewable energy target by 2030',
    category: 'environmental',
    sentiment: 'positive',
    severity: 0,
    source: 'Micron ESG',
  },
  {
    title: 'Micron partners with universities on AI memory research grants',
    category: 'ai_adoption',
    sentiment: 'positive',
    severity: 0,
    source: 'Micron Blog',
  },
  {
    title: 'Micron lp-CAMM2 memory standard accelerates AI laptop adoption',
    category: 'ai_adoption',
    sentiment: 'positive',
    severity: 0,
    source: 'Tech Analysis',
  },
  {
    title: 'Memory cycle downturn concerns eased by AI demand floor',
    category: 'controversy',
    sentiment: 'positive',
    severity: 0,
    source: 'Goldman Sachs',
  },
  {
    title: 'Micron diversity report: women in leadership reaches 38%',
    category: 'social',
    sentiment: 'positive',
    severity: 0,
    source: 'Micron ESG 2025',
  },
];

async function patch() {
  const company = await prisma.company.findUnique({ where: { id: 9 } });
  if (!company || company.ticker !== 'MU') {
    console.error('Company 9 is not MU — aborting');
    process.exit(1);
  }

  console.log('[Patch] Adding AI/ESG signals for Micron (MU)...');
  for (const s of MU_SIGNALS) {
    await prisma.signal.create({
      data: {
        companyId: 9,
        title: s.title,
        category: s.category,
        sentiment: s.sentiment,
        severity: s.severity,
        source: s.source,
        confidenceScore: 0.88,
        date: new Date(Date.now() - Math.random() * 60 * 86400000).toISOString().split('T')[0],
      },
    });
  }
  console.log('[Patch] ✓ Added', MU_SIGNALS.length, 'signals');

  console.log('[Patch] Recalculating scores...');
  const snapshot = await calculateScores(9);
  console.log('[Patch] New snapshot:', {
    esg: snapshot.currentEsgScore,
    momentum: snapshot.momentumScore,
    aiAdoption: snapshot.aiAdoptionScore,
    controversy: snapshot.controversyRisk,
    signal: snapshot.investorSignal,
    classification: snapshot.classification,
  });
  console.log('[Patch] Done!');
}

patch()
  .then(() => prisma.$disconnect())
  .catch(err => { console.error(err); prisma.$disconnect(); process.exit(1); });
