'use strict';

const prisma = require('../database');
const momentumAgent = require('../agents/momentumScoring');
const controversyAgent = require('../agents/controversyRisk');
const aiAdoptionAgent = require('../agents/aiAdoption');
const greenwashingAgent = require('../agents/greenwashingDetector');

const PILLAR_WEIGHTS = { environmental: 0.40, social: 0.30, governance: 0.30 };
const CONTROVERSY_RISK_ALERT_THRESHOLD = 75.0;

function scorePillarFromMetrics(metrics, pillar) {
  const relevant = metrics.filter(m => m.pillar === pillar);
  if (!relevant.length) return 50.0;

  const scores = [];
  for (const m of relevant) {
    if (m.value == null) continue;
    if (/(emission|co2)/i.test(m.metricName)) {
      const inv = Math.max(0, 100 - m.value / 10000);
      scores.push(Math.min(100, inv) * m.confidenceScore);
    } else if (m.unit === '%') {
      scores.push(Math.min(100, m.value) * m.confidenceScore);
    } else {
      scores.push(50.0 * m.confidenceScore);
    }
  }

  if (!scores.length) {
    const pos = relevant.filter(m => m.confidenceScore > 0.6).length;
    return 40.0 + Math.min(40, pos * 8);
  }
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

function scorePillarFromSignals(signals, pillar) {
  const relevant = signals.filter(s => s.category === pillar);
  if (!relevant.length) return 50.0;
  const pos = relevant.filter(s => s.sentiment === 'positive').length;
  const neg = relevant.filter(s => s.sentiment === 'negative').length;
  const base = 50.0 + ((pos - neg) / relevant.length) * 30.0;
  return Math.round(Math.max(0, Math.min(100, base)) * 10) / 10;
}

function classify(esgScore, momentum, controversyRisk) {
  let classification = 'Watchlist';
  if (esgScore < 60 && momentum > 10) classification = 'Hidden Winner';
  else if (esgScore >= 60 && momentum > 10) classification = 'Future Leader';
  else if (esgScore < 60 && momentum < -10) classification = 'Value Trap';
  else if (esgScore >= 60 && momentum < -10) classification = 'Overrated Leader';

  let investorSignal = 'Hold';
  if (controversyRisk >= CONTROVERSY_RISK_ALERT_THRESHOLD) investorSignal = 'Risk Alert';
  else if (['Hidden Winner', 'Future Leader'].includes(classification)) investorSignal = 'Buy / Watchlist';
  else if (classification === 'Value Trap') investorSignal = 'Avoid';

  return { classification, investorSignal };
}

function confidenceFromEvidence(evidences) {
  if (!evidences.length) return 0.20;
  const avg = evidences.reduce((s, e) => s + e.confidenceScore, 0) / evidences.length;
  const volumeBonus = Math.min(0.20, evidences.length * 0.01);
  return Math.round(Math.min(0.95, avg + volumeBonus) * 100) / 100;
}

async function calculateScores(companyId) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error(`Company ${companyId} not found`);

  const [metrics, signals, evidences] = await Promise.all([
    prisma.eSGMetric.findMany({ where: { companyId } }),
    prisma.signal.findMany({ where: { companyId } }),
    prisma.evidence.findMany({ where: { companyId } }),
  ]);

  // Pillar scores
  const envMetric = scorePillarFromMetrics(metrics, 'environmental');
  const socMetric = scorePillarFromMetrics(metrics, 'social');
  const govMetric = scorePillarFromMetrics(metrics, 'governance');
  const envSignal = scorePillarFromSignals(signals, 'environmental');
  const socSignal = scorePillarFromSignals(signals, 'social');
  const govSignal = scorePillarFromSignals(signals, 'governance');

  const blend = metrics.length > 0 ? [0.6, 0.4] : [0.0, 1.0];
  const envScore = Math.round((envMetric * blend[0] + envSignal * blend[1]) * 10) / 10;
  const socScore = Math.round((socMetric * blend[0] + socSignal * blend[1]) * 10) / 10;
  const govScore = Math.round((govMetric * blend[0] + govSignal * blend[1]) * 10) / 10;

  const currentEsgScore = Math.round(
    (envScore * PILLAR_WEIGHTS.environmental + socScore * PILLAR_WEIGHTS.social + govScore * PILLAR_WEIGHTS.governance) * 10
  ) / 10;

  const { momentumScore } = momentumAgent.calculate(signals, metrics);
  const { aiAdoptionScore } = aiAdoptionAgent.score(signals, evidences);
  const { controversyRisk } = controversyAgent.score(signals);
  const confidenceScore = confidenceFromEvidence(evidences);
  const { classification, investorSignal } = classify(currentEsgScore, momentumScore, controversyRisk);

  const snapshot = await prisma.scoreSnapshot.create({
    data: {
      companyId, currentEsgScore, momentumScore, aiAdoptionScore,
      controversyRisk, confidenceScore, environmentalScore: envScore,
      socialScore: socScore, governanceScore: govScore,
      classification, investorSignal,
    },
  });

  // Check alert rules
  await evaluateAlerts(companyId, snapshot).catch(() => {});

  return snapshot;
}

/**
 * Evaluate active alert rules for a company and dispatch notifications.
 */
async function evaluateAlerts(companyId, snapshot) {
  const alerts = await prisma.alertRule.findMany({
    where: { isActive: true, OR: [{ companyId }, { companyId: null }] },
  });

  const fieldMap = {
    esg_drop: snapshot.currentEsgScore,
    esg_rise: snapshot.currentEsgScore,
    controversy_spike: snapshot.controversyRisk,
    momentum_change: snapshot.momentumScore,
    ai_adoption_change: snapshot.aiAdoptionScore,
  };

  for (const alert of alerts) {
    const value = fieldMap[alert.triggerType];
    if (value == null || alert.threshold == null) continue;

    let triggered = false;
    if (alert.operator === 'gt' && value > alert.threshold) triggered = true;
    if (alert.operator === 'lt' && value < alert.threshold) triggered = true;
    if (alert.operator === 'eq' && value === alert.threshold) triggered = true;

    if (triggered) {
      await prisma.notification.create({
        data: {
          userId: alert.userId,
          companyId,
          triggerType: alert.triggerType,
          channel: 'IN_APP',
          title: `Alert: ${alert.name}`,
          body: `${alert.triggerType} triggered — value ${value} ${alert.operator} ${alert.threshold}`,
          deliveredAt: new Date(),
        },
      });

      await prisma.alertRule.update({ where: { id: alert.id }, data: { lastTriggered: new Date() } });
    }
  }
}

module.exports = { calculateScores, classify };
