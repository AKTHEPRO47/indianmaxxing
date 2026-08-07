'use strict';

/**
 * MomentumScoringAgent — measures rate of ESG change using signals + metrics.
 */

function calculate(signals = [], metrics = []) {
  if (!signals.length && !metrics.length) {
    return { momentumScore: 0.0, trend: 'stable', explanation: 'Insufficient data for momentum calculation.' };
  }

  // Signal-based momentum: weighted positive minus negative by recency
  const now = Date.now();
  let momentumSum = 0;
  let weight = 0;

  for (const signal of signals) {
    const sentimentWeight = signal.sentiment === 'positive' ? 1 : signal.sentiment === 'negative' ? -1 : 0;
    const severity = signal.severity || 0;
    const recencyBonus = signal.createdAt ? Math.max(0.5, 1 - (now - new Date(signal.createdAt).getTime()) / (90 * 24 * 3600 * 1000)) : 0.7;
    const conf = signal.confidenceScore || 0.5;

    const signalScore = sentimentWeight * (1 + severity * 0.1) * recencyBonus * conf * 20;
    momentumSum += signalScore;
    weight += recencyBonus * conf;
  }

  // Metric trend: if multiple years present, check direction
  const metricsByName = {};
  for (const m of metrics) {
    if (!m.metricName) continue;
    if (!metricsByName[m.metricName]) metricsByName[m.metricName] = [];
    metricsByName[m.metricName].push(m);
  }

  let metricTrendScore = 0;
  for (const [, mList] of Object.entries(metricsByName)) {
    const sorted = mList.sort((a, b) => (a.year || 0) - (b.year || 0));
    if (sorted.length >= 2) {
      const last = sorted[sorted.length - 1].value;
      const prev = sorted[sorted.length - 2].value;
      if (last != null && prev != null && prev !== 0) {
        const change = ((last - prev) / Math.abs(prev)) * 100;
        // For emissions-like metrics, lower is better → invert
        const isInverse = ['emission', 'co2', 'carbon', 'waste'].some(kw =>
          mList[0].metricName.toLowerCase().includes(kw)
        );
        metricTrendScore += isInverse ? -change : change;
      }
    }
  }

  const rawMomentum = weight > 0 ? momentumSum / weight : 0;
  const combined = rawMomentum * 0.7 + metricTrendScore * 0.3;
  const momentumScore = Math.max(-100, Math.min(100, Math.round(combined * 10) / 10));

  const trend = momentumScore > 10 ? 'improving' : momentumScore < -10 ? 'declining' : 'stable';
  const explanation = `Momentum score of ${momentumScore} based on ${signals.length} signals and ${metrics.length} metrics.`;

  return { momentumScore, trend, explanation };
}

module.exports = { calculate };
