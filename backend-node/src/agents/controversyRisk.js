'use strict';

/**
 * ControversyRiskAgent — aggregates controversy signals into a 0-100 risk score.
 */

const HIGH_SEVERITY_THRESHOLD = 7.0;

function score(signals = []) {
  const controversySignals = signals.filter(s => s.category === 'controversy' || s.sentiment === 'negative');

  if (!controversySignals.length) {
    return { controversyRisk: 0.0, count: 0, explanation: 'No controversy signals detected.' };
  }

  const totalSeverity = controversySignals.reduce((sum, s) => sum + (s.severity || 0), 0);
  const avgSeverity = totalSeverity / controversySignals.length;
  const highSeverityCount = controversySignals.filter(s => (s.severity || 0) >= HIGH_SEVERITY_THRESHOLD).length;

  // Base risk from count and severity
  const baseRisk = Math.min(100, controversySignals.length * 8 + avgSeverity * 3 + highSeverityCount * 15);
  const controversyRisk = Math.round(baseRisk * 10) / 10;

  const explanation = `Controversy risk ${controversyRisk}/100 from ${controversySignals.length} negative signals (${highSeverityCount} high-severity).`;
  return { controversyRisk, count: controversySignals.length, explanation };
}

module.exports = { score };
