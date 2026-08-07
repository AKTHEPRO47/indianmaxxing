'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyText } = require('../../backend-node/src/agents/signalClassifier');

test('classifyText identifies a positive environmental signal', () => {
  const result = classifyText('Company achieves renewable energy target', 'Carbon emissions reduced by 35 percent.');

  assert.equal(result.category, 'environmental');
  assert.equal(result.sentiment, 'positive');
  assert.equal(result.severity, 0);
  assert.ok(result.confidenceScore > 0.5);
});

test('classifyText flags a severe controversy with negative sentiment', () => {
  const result = classifyText('Regulator fines company after fatal explosion', 'Investigation alleges fraud and safety violations.');

  assert.equal(result.category, 'controversy');
  assert.equal(result.sentiment, 'negative');
  assert.equal(result.severity, 7);
});