'use strict';

/**
 * SignalClassifierAgent — classifies ESG/AI signals from text using keyword rules.
 * Ported from Python with identical logic.
 */

const CATEGORY_RULES = {
  environmental: [
    'emissions', 'carbon', 'climate', 'pollution', 'environmental', 'renewable',
    'net zero', 'biodiversity', 'water', 'waste', 'spill', 'deforestation',
  ],
  social: [
    'employee', 'worker', 'safety', 'diversity', 'inclusion', 'labor', 'labour',
    'human rights', 'community', 'health', 'discrimination', 'harassment',
    'modern slavery', 'supply chain',
  ],
  governance: [
    'board', 'executive', 'corruption', 'bribery', 'audit', 'shareholder',
    'whistleblower', 'ethics', 'compliance', 'data privacy', 'cybersecurity',
    'regulatory', 'fine', 'penalty', 'lawsuit', 'investigation',
  ],
  ai_adoption: [
    'artificial intelligence', 'machine learning', 'automation', 'ai strategy',
    'ai patent', 'ai partnership', 'digital transformation', 'algorithm',
    'generative ai', 'ai infrastructure', 'robotics', 'ai hiring',
  ],
  controversy: [
    'scandal', 'lawsuit', 'fine', 'violation', 'greenwashing', 'fraud',
    'accident', 'disaster', 'spill', 'explosion', 'death', 'injury',
    'protest', 'boycott', 'recall',
  ],
};

const SENTIMENT_RULES = {
  positive: [
    'achieve', 'reduce', 'commit', 'launch', 'invest', 'partner', 'improve',
    'certif', 'award', 'recogni', 'progress', 'reach', 'target met', 'success',
    'breakthrough', 'first', 'lead',
  ],
  negative: [
    'fail', 'violat', 'fine', 'penalt', 'lawsuit', 'scandal', 'miss', 'decline',
    'increase emission', 'accident', 'death', 'injury', 'recall', 'probe',
    'investig', 'allege', 'charge',
  ],
};

function classifyText(title, body = '') {
  const text = `${title} ${body}`.toLowerCase();
  const categoryScores = Object.fromEntries(Object.keys(CATEGORY_RULES).map(k => [k, 0]));

  for (const [cat, keywords] of Object.entries(CATEGORY_RULES)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) categoryScores[cat]++;
    }
  }

  let category = Object.entries(categoryScores).reduce((a, b) => a[1] >= b[1] ? a : b)[0];
  if (categoryScores[category] === 0) category = 'neutral';

  let sentiment = 'neutral';
  const posScore = SENTIMENT_RULES.positive.filter(w => text.includes(w)).length;
  const negScore = SENTIMENT_RULES.negative.filter(w => text.includes(w)).length;
  if (posScore > negScore) sentiment = 'positive';
  else if (negScore > posScore) sentiment = 'negative';

  let severity = 0.0;
  if (category === 'controversy' || sentiment === 'negative') {
    const severityKw = ['death', 'explosion', 'disaster', 'fraud', 'billion', 'criminal'];
    severity = Math.min(10.0, 3.0 + severityKw.filter(w => text.includes(w)).length * 2.0);
  }

  const confidence = Math.min(0.95, 0.5 + (categoryScores[category] || 0) * 0.08);

  return { category, sentiment, severity, confidenceScore: Math.round(confidence * 100) / 100 };
}

const CATEGORY_EXPLANATIONS = {
  environmental: 'This signal relates to environmental impact or climate action.',
  social: 'This signal relates to social factors including workforce and community.',
  governance: 'This signal relates to corporate governance, ethics or regulatory compliance.',
  ai_adoption: 'This signal indicates AI or digital transformation activity.',
  controversy: 'This signal flags a potential ESG controversy or risk event.',
  neutral: 'This signal has limited ESG relevance based on current analysis.',
};

function classify(title, body = '', source = '', date = '') {
  const result = classifyText(title, body);
  let explanation = CATEGORY_EXPLANATIONS[result.category] || 'Signal classified by keyword analysis.';
  if (result.sentiment === 'positive') explanation += ' Sentiment is positive — potential improvement signal.';
  else if (result.sentiment === 'negative') explanation += ` Sentiment is negative — severity rated ${result.severity.toFixed(1)}/10.`;

  return { ...result, title, source, date, explanation };
}

module.exports = { classify, classifyText };
