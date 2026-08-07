'use strict';

const { XMLParser } = require('fast-xml-parser');
const prisma = require('../database');
const signalClassifier = require('../agents/signalClassifier');
const scoringService = require('./scoring');

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
let refreshInFlight = false;

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function readText(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value['#text'] || value.__cdata || '';
  return '';
}

function toDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

async function fetchYahooFinanceNews(ticker) {
  const response = await fetch(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`, {
    headers: { 'User-Agent': 'ESG-Momentum-Engine/2.0 (educational project)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`RSS request failed with ${response.status}`);

  const feed = parser.parse(await response.text());
  return asArray(feed?.rss?.channel?.item).slice(0, 5).map(item => ({
    title: readText(item.title).trim(),
    summary: readText(item.description).trim(),
    publishedAt: toDate(readText(item.pubDate)),
  })).filter(item => item.title);
}

async function ingestCompanyNews(company) {
  if (!company.ticker) return 0;
  const items = await fetchYahooFinanceNews(company.ticker);
  let created = 0;

  for (const item of items) {
    const existing = await prisma.signal.findFirst({
      where: { companyId: company.id, title: item.title, source: 'Yahoo Finance RSS' },
      select: { id: true },
    });
    if (existing) continue;

    const classified = signalClassifier.classify(item.title, item.summary, 'Yahoo Finance RSS', item.publishedAt);
    await prisma.signal.create({
      data: {
        companyId: company.id,
        title: classified.title,
        category: classified.category,
        sentiment: classified.sentiment,
        severity: classified.severity,
        date: classified.date,
        source: classified.source,
        explanation: classified.explanation,
        confidenceScore: classified.confidenceScore,
      },
    });
    created += 1;
  }

  if (created > 0) await scoringService.calculateScores(company.id);
  return created;
}

async function refreshNews(limit = 15) {
  if (refreshInFlight) return { skipped: true, refreshedCompanies: 0, newSignals: 0 };
  refreshInFlight = true;
  try {
    const companies = await prisma.company.findMany({
      where: { ticker: { not: null } },
      select: { id: true, ticker: true },
      take: Math.min(Math.max(Number(limit) || 15, 1), 25),
      orderBy: { id: 'asc' },
    });
    let newSignals = 0;
    for (const company of companies) {
      try {
        newSignals += await ingestCompanyNews(company);
      } catch (error) {
        console.warn(`[News] ${company.ticker}: ${error.message}`);
      }
    }
    return { skipped: false, refreshedCompanies: companies.length, newSignals };
  } finally {
    refreshInFlight = false;
  }
}

module.exports = { refreshNews };