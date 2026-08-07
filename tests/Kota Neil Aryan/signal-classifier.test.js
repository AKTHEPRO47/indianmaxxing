'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyText } = require('../../backend-node/src/agents/signalClassifier');
const { generateMockCopilotAnswer } = require('../../backend-node/src/services/openai');

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

test('basic copilot answer uses relevant stored signals for common questions', () => {
  const answer = generateMockCopilotAnswer(
    { name: 'Example Semiconductor' },
    'What controversy risks exist?',
    [{ category: 'controversy', title: 'Regulator opens governance investigation', source: 'Company news' }],
    [],
    { currentEsgScore: 61.5, momentumScore: 4.2, controversyRisk: 38, aiAdoptionScore: 72, classification: 'Watchlist', investorSignal: 'Hold' },
  );

  assert.match(answer, /Controversy risk is 38\/100/);
  assert.match(answer, /Regulator opens governance investigation/);
  assert.match(answer, /Example Semiconductor is currently scored 61\.5\/100/);
});