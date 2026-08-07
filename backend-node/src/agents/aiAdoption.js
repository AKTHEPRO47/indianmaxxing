'use strict';

/**
 * AIAdoptionAgent — scores AI/technology adoption from signals and evidence.
 */

const AI_KEYWORDS = [
  'artificial intelligence', 'machine learning', 'deep learning', 'ai', 'ml',
  'automation', 'robotics', 'generative ai', 'large language model', 'llm',
  'neural network', 'algorithm', 'digital transformation', 'ai strategy',
  'ai patent', 'ai partnership', 'ai hiring', 'ai infrastructure', 'ai investment',
];

function scoreText(text = '') {
  const lower = text.toLowerCase();
  const matches = AI_KEYWORDS.filter(kw => lower.includes(kw));
  return matches.length;
}

function score(signals = [], evidences = []) {
  const aiSignals = signals.filter(s => s.category === 'ai_adoption');

  // Score from dedicated AI signals
  let signalScore = aiSignals.length * 15;
  for (const s of aiSignals) {
    if (s.sentiment === 'positive') signalScore += 5;
  }

  // Score from evidence keyword matches
  let evidenceScore = 0;
  for (const ev of evidences) {
    evidenceScore += scoreText(ev.evidenceText) * 2;
  }

  const raw = Math.min(100, signalScore + Math.min(40, evidenceScore));
  const aiAdoptionScore = Math.round(raw * 10) / 10;

  const maturityLabel = aiAdoptionScore >= 70 ? 'Advanced' : aiAdoptionScore >= 40 ? 'Developing' : 'Early Stage';
  return {
    aiAdoptionScore,
    maturityLabel,
    explanation: `AI adoption scored ${aiAdoptionScore}/100 — ${maturityLabel}. Based on ${aiSignals.length} AI signals.`,
  };
}

module.exports = { score };
