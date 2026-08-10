'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzePriceHistory } = require('../../backend-node/src/services/technicalAnalysis');

function pricesFromCloses(closes) {
  return closes.map((close, index) => ({
    timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    close,
    volume: 1_000,
  }));
}

test('technical analysis detects a 20/50-day golden cross from price history', () => {
  const closes = [...Array(59).fill(100), 200];
  const analysis = analyzePriceHistory(pricesFromCloses(closes));

  assert.ok(analysis.indicators);
  assert.ok(analysis.events.some(event => event.key === 'golden_cross'));
  assert.equal(analysis.events.find(event => event.key === 'golden_cross').sentiment, 'positive');
});

test('technical analysis requires sufficient OHLCV history', () => {
  const analysis = analyzePriceHistory(pricesFromCloses(Array(30).fill(100)));

  assert.equal(analysis.indicators, null);
  assert.deepEqual(analysis.events, []);
});