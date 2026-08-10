'use strict';

const axios = require('axios');
const config = require('../config');

/**
 * OpenAI service with mock fallback when USE_MOCK_LLM=true or no API key set.
 */

async function callOpenAI(messages, maxTokens = 1000) {
  if (config.useMockLlm) return null;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    { model: config.openaiModel, messages, max_tokens: maxTokens, temperature: 0.3 },
    { headers: { Authorization: `Bearer ${config.openaiApiKey}`, 'Content-Type': 'application/json' }, timeout: 30000 }
  );

  return response.data.choices?.[0]?.message?.content || null;
}

// ── Signal generation ─────────────────────────────────────

const MOCK_SIGNALS_BY_COMPANY = {
  default: [
    { title: 'Company commits to 50% renewable energy by 2030', body: 'invest partner renewable commit', source: 'Press Release', date: '2025-06-15' },
    { title: 'Board approves new ESG governance framework', body: 'board governance compliance ethics audit', source: 'IR Website', date: '2025-05-20' },
    { title: 'Employee safety incident at manufacturing plant', body: 'accident injury worker safety', source: 'Reuters', date: '2025-04-10' },
    { title: 'AI strategy roadmap announced for digital transformation', body: 'artificial intelligence machine learning ai strategy digital transformation', source: 'Tech Blog', date: '2025-07-01' },
    { title: 'Carbon emissions reduced 15% year-over-year', body: 'emissions reduce carbon environmental progress achieve', source: 'ESG Report', date: '2025-03-22' },
  ],
};

async function generateSignals(companyName) {
  if (config.useMockLlm) {
    return MOCK_SIGNALS_BY_COMPANY[companyName] || MOCK_SIGNALS_BY_COMPANY.default;
  }

  const prompt = `Generate 5 realistic ESG news signals for ${companyName}. Return JSON array with fields: title, body, source, date (YYYY-MM-DD). Cover: environmental, social, governance, AI adoption, and one controversy.`;

  try {
    const content = await callOpenAI([{ role: 'user', content: prompt }], 500);
    const jsonMatch = content?.match(/\[[\s\S]+\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}

  return MOCK_SIGNALS_BY_COMPANY.default;
}

// ── Copilot Q&A ───────────────────────────────────────────

async function copilotQuery(company, query, signals, evidences, latestScore) {
  if (config.useMockLlm) {
    const error = new Error('Live AI research is unavailable because OpenAI is not configured.');
    error.status = 503;
    throw error;
  }

  const context = buildContext(company, signals, evidences, latestScore);
  const messages = [
    { role: 'system', content: 'You are an ESG investment analyst assistant. Answer questions about company ESG performance based on the provided data. Be concise and evidence-based.' },
    { role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` },
  ];

  const answer = await callOpenAI(messages, 600);
  if (answer) return answer;

  const error = new Error('Live AI research returned no response.');
  error.status = 502;
  throw error;
}

// ── ESG Executive Summary ─────────────────────────────────

async function generateEsgSummary(company, signals, latestScore) {
  if (config.useMockLlm) {
    return generateMockSummary(company, latestScore);
  }

  const scoreText = latestScore
    ? `ESG Score: ${latestScore.currentEsgScore}, Momentum: ${latestScore.momentumScore}, Classification: ${latestScore.classification}`
    : 'No score data available.';

  const signalSummary = signals.slice(0, 10).map(s => `- ${s.title} (${s.category}, ${s.sentiment})`).join('\n');

  const prompt = `Write a concise executive ESG brief for ${company.name}. ${scoreText}. Recent signals:\n${signalSummary}. Include: overall assessment, key risks, opportunities, and investor recommendation in 150-200 words.`;

  try {
    const content = await callOpenAI([{ role: 'user', content: prompt }], 350);
    return content || generateMockSummary(company, latestScore);
  } catch {
    return generateMockSummary(company, latestScore);
  }
}

// ── Document extraction ───────────────────────────────────

async function extractFromDocument(text, companyName) {
  if (config.useMockLlm) {
    return generateMockExtractions(text, companyName);
  }

  const prompt = `Extract ESG metrics and evidence from this sustainability report excerpt for ${companyName}. Return JSON array with fields: evidence_text, pillar (environmental/social/governance/ai_adoption), metric_name, value, unit, confidence_score (0-1), page_number. Text:\n\n${text.substring(0, 3000)}`;

  try {
    const content = await callOpenAI([{ role: 'user', content: prompt }], 1000);
    const jsonMatch = content?.match(/\[[\s\S]+\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}

  return generateMockExtractions(text, companyName);
}

// ── Helpers ───────────────────────────────────────────────

function buildContext(company, signals, evidences, latestScore) {
  const lines = [`Company: ${company.name} (${company.ticker || 'N/A'})`, `Industry: ${company.industry || 'Unknown'}`];
  if (latestScore) {
    lines.push(`ESG Score: ${latestScore.currentEsgScore} | Momentum: ${latestScore.momentumScore} | Controversy Risk: ${latestScore.controversyRisk}`);
    lines.push(`Classification: ${latestScore.classification} | Signal: ${latestScore.investorSignal}`);
  }
  if (signals.length) {
    lines.push('\nRecent signals:');
    signals.slice(0, 8).forEach(s => lines.push(`- [${s.category}/${s.sentiment}] ${s.title}`));
  }
  if (evidences.length) {
    lines.push('\nKey evidence:');
    evidences.slice(0, 3).forEach(e => lines.push(`- ${e.evidenceText.substring(0, 100)}...`));
  }
  return lines.join('\n');
}

function generateMockCopilotAnswer(company, query, signals = [], evidences = [], latestScore) {
  const normalizedQuery = query.toLowerCase();
  const score = latestScore?.currentEsgScore?.toFixed(1) || 'N/A';
  const classification = latestScore?.classification || 'Watchlist';
  const momentum = latestScore?.momentumScore;
  const risk = latestScore?.controversyRisk;
  const aiAdoption = latestScore?.aiAdoptionScore;
  const category = normalizedQuery.match(/emission|carbon|climate|environment|scope/) ? 'environmental'
    : normalizedQuery.match(/employee|worker|labor|labour|diversity|social|safety/) ? 'social'
      : normalizedQuery.match(/board|governance|audit|privacy|cyber|regulat|compliance/) ? 'governance'
        : normalizedQuery.match(/ai |artificial intelligence|automation|machine learning|digital/) ? 'ai_adoption'
          : normalizedQuery.match(/controvers|risk|lawsuit|fine|greenwash|scandal/) ? 'controversy'
            : null;
  const relevantSignals = category ? signals.filter(signal => signal.category === category) : signals;
  const relevantEvidence = category
    ? evidences.filter(evidence => evidence.category === category)
    : evidences;
  const recentSignals = relevantSignals.slice(0, 3);
  const recentEvidence = relevantEvidence.slice(0, 2);
  const lines = [
    `${company.name} is currently scored ${score}/100 and classified as "${classification}".`,
  ];

  if (normalizedQuery.match(/score|esg|why/)) {
    lines.push(`The latest profile combines ESG signals and disclosures. Momentum is ${momentum == null ? 'not available' : `${momentum >= 0 ? '+' : ''}${momentum.toFixed(1)}`}, while controversy risk is ${risk == null ? 'not available' : `${risk.toFixed(0)}/100`}.`);
  }
  if (normalizedQuery.match(/invest|buy|sell|hold|signal/)) {
    lines.push(`The current investor signal is "${latestScore?.investorSignal || 'Hold'}". Treat it as a screening input alongside valuation and your own risk constraints.`);
  }
  if (normalizedQuery.match(/momentum|trend|improv|deteriorat/)) {
    lines.push(momentum == null ? 'No current momentum score is available.' : `ESG momentum is ${momentum >= 0 ? 'positive' : 'negative'} at ${momentum >= 0 ? '+' : ''}${momentum.toFixed(1)}, which indicates the direction of recent scored signals.`);
  }
  if (normalizedQuery.match(/ai |artificial intelligence|automation|machine learning|digital/)) {
    lines.push(aiAdoption == null ? 'No AI-adoption score is available.' : `AI adoption is scored ${aiAdoption.toFixed(0)}/100 based on the stored AI and digital-transformation signals.`);
  }
  if (normalizedQuery.match(/controvers|risk|lawsuit|fine|greenwash|scandal/)) {
    lines.push(risk == null ? 'No current controversy-risk score is available.' : `Controversy risk is ${risk.toFixed(0)}/100. Review the recent risk signals below for the underlying events rather than assuming a specific allegation.`);
  }

  if (recentSignals.length) {
    lines.push(`Recent ${category ? category.replace('_', ' ') : 'company'} signals: ${recentSignals.map(signal => `${signal.title} (${signal.source || 'stored signal'})`).join('; ')}.`);
  } else if (recentEvidence.length) {
    lines.push(`Stored evidence relevant to this question: ${recentEvidence.map(evidence => evidence.evidenceText?.slice(0, 180) || evidence.sourceName || 'Company disclosure').join(' ')}`);
  } else {
    lines.push(`There are no stored ${category ? category.replace('_', ' ') : 'topic-specific'} items matching this question yet. Try a score, momentum, risk, AI, governance, workforce, emissions, or recent-news question.`);
  }

  lines.push('This basic-mode answer uses the current Tricard score and stored company signals; consult original filings and sources for investment decisions.');
  return lines.join('\n\n');
}

function generateMockSummary(company, latestScore) {
  if (!latestScore) {
    return `${company.name} currently lacks sufficient ESG data for comprehensive analysis. Recommend uploading annual sustainability reports to generate accurate scoring.`;
  }
  const { currentEsgScore, momentumScore, classification, investorSignal, controversyRisk } = latestScore;
  return `${company.name} — ESG Executive Brief: Score ${currentEsgScore.toFixed(1)}/100 with momentum of ${momentumScore > 0 ? '+' : ''}${momentumScore.toFixed(1)}, classified as "${classification}". Investor signal: ${investorSignal}. Controversy risk: ${controversyRisk.toFixed(0)}/100. ${momentumScore > 0 ? 'Positive momentum suggests improving ESG trajectory.' : 'Declining momentum warrants monitoring of key risk factors.'} ${controversyRisk > 50 ? 'Elevated controversy risk requires attention.' : 'Controversy risk is manageable.'} Recommend continued monitoring of environmental commitments and governance practices.`;
}

function generateMockExtractions(text, companyName) {
  const lower = text.toLowerCase();
  const extractions = [];

  if (lower.includes('emission') || lower.includes('co2') || lower.includes('carbon')) {
    extractions.push({
      evidenceText: text.substring(0, 200),
      pillar: 'environmental',
      metricName: 'Total GHG Emissions',
      value: null,
      unit: 'tCO2e',
      confidenceScore: 0.65,
      pageNumber: 1,
    });
  }

  if (lower.includes('employee') || lower.includes('workforce') || lower.includes('diversity')) {
    extractions.push({
      evidenceText: text.substring(0, 200),
      pillar: 'social',
      metricName: 'Workforce Diversity',
      value: null,
      unit: '%',
      confidenceScore: 0.60,
      pageNumber: 1,
    });
  }

  if (!extractions.length) {
    extractions.push({
      evidenceText: text.substring(0, 300),
      pillar: 'governance',
      metricName: 'ESG Disclosure',
      value: null,
      unit: null,
      confidenceScore: 0.50,
      pageNumber: 1,
    });
  }

  return extractions;
}

module.exports = { generateSignals, copilotQuery, generateEsgSummary, extractFromDocument, generateMockCopilotAnswer };
