'use strict';
/**
 * patch_new_companies.js
 * Adds WDC, SNDK, SPY, QQQ, VOO, GLD, VTI, DIA, TLT, SSNLF, HXSCL, ON
 * (IDs 72-83) and creates score snapshots + dividends for each.
 * Run: node src/seed/patch_new_companies.js
 */

const prisma = require('../database');
const { calculateScores } = require('../services/scoring');

const NEW_COMPANIES = [
  { id: 72, ticker: 'WDC',   name: 'Western Digital Corporation',           exchange: 'NASDAQ',   industry: 'Storage / Semiconductors',       country: 'United States', marketCap: '$20B',  logoUrl: 'https://www.google.com/s2/favicons?domain=westerndigital.com&sz=128' },
  { id: 83, ticker: 'SNDK',  name: 'SanDisk Corporation',                   exchange: 'NASDAQ',   industry: 'Storage / NAND Flash',           country: 'United States', marketCap: '$12B',  logoUrl: 'https://www.google.com/s2/favicons?domain=sandisk.com&sz=128' },
  { id: 73, ticker: 'SPY',   name: 'SPDR S&P 500 ETF Trust',                exchange: 'NYSEARCA', industry: 'ETF / Index',                    country: 'United States', marketCap: '$570B', logoUrl: 'https://www.google.com/s2/favicons?domain=ssga.com&sz=128' },
  { id: 74, ticker: 'QQQ',   name: 'Invesco QQQ Trust (NASDAQ-100)',         exchange: 'NASDAQ',   industry: 'ETF / Technology',               country: 'United States', marketCap: '$340B', logoUrl: 'https://www.google.com/s2/favicons?domain=invesco.com&sz=128' },
  { id: 75, ticker: 'VOO',   name: 'Vanguard S&P 500 ETF',                  exchange: 'NYSEARCA', industry: 'ETF / Index',                    country: 'United States', marketCap: '$550B', logoUrl: 'https://www.google.com/s2/favicons?domain=vanguard.com&sz=128' },
  { id: 76, ticker: 'GLD',   name: 'SPDR Gold Shares ETF',                  exchange: 'NYSEARCA', industry: 'ETF / Commodities',              country: 'United States', marketCap: '$72B',  logoUrl: 'https://www.google.com/s2/favicons?domain=spdrgoldshares.com&sz=128' },
  { id: 77, ticker: 'VTI',   name: 'Vanguard Total Stock Market ETF',       exchange: 'NYSEARCA', industry: 'ETF / Total Market',             country: 'United States', marketCap: '$480B', logoUrl: 'https://www.google.com/s2/favicons?domain=vanguard.com&sz=128' },
  { id: 78, ticker: 'DIA',   name: 'SPDR Dow Jones Industrial Average ETF', exchange: 'NYSEARCA', industry: 'ETF / Index',                    country: 'United States', marketCap: '$38B',  logoUrl: 'https://www.google.com/s2/favicons?domain=ssga.com&sz=128' },
  { id: 79, ticker: 'TLT',   name: 'iShares 20+ Year Treasury Bond ETF',    exchange: 'NASDAQ',   industry: 'ETF / Fixed Income',             country: 'United States', marketCap: '$56B',  logoUrl: 'https://www.google.com/s2/favicons?domain=ishares.com&sz=128' },
  { id: 80, ticker: 'SSNLF', name: 'Samsung Electronics Co., Ltd.',         exchange: 'OTC',      industry: 'Semiconductors / DRAM',          country: 'South Korea',   marketCap: '$290B', logoUrl: 'https://www.google.com/s2/favicons?domain=samsung.com&sz=128' },
  { id: 81, ticker: 'HXSCL', name: 'SK Hynix Inc.',                         exchange: 'OTC',      industry: 'Semiconductors / DRAM',          country: 'South Korea',   marketCap: '$95B',  logoUrl: 'https://www.google.com/s2/favicons?domain=skhynix.com&sz=128' },
  { id: 82, ticker: 'ON',    name: 'ON Semiconductor Corporation (onsemi)', exchange: 'NASDAQ',   industry: 'Semiconductors / Power',         country: 'United States', marketCap: '$25B',  logoUrl: 'https://www.google.com/s2/favicons?domain=onsemi.com&sz=128' },
];

// ESG & signal characteristics per company
const ESG_PROFILES = {
  WDC:   { esg: 55, env: 52, soc: 54, gov: 59, mom: 8,  ai: 35, controversy: 28, classification: 'Watchlist',      signal: 'Hold' },
  SNDK:  { esg: 57, env: 55, soc: 56, gov: 60, mom: 14, ai: 42, controversy: 24, classification: 'Hidden Winner',  signal: 'Buy / Watchlist' },
  SPY:   { esg: 63, env: 62, soc: 65, gov: 66, mom: 12, ai: 45, controversy: 14, classification: 'Hidden Winner',  signal: 'Buy / Watchlist' },
  QQQ:   { esg: 66, env: 65, soc: 66, gov: 67, mom: 18, ai: 70, controversy: 13, classification: 'Future Leader',  signal: 'Buy' },
  VOO:   { esg: 63, env: 61, soc: 64, gov: 64, mom: 11, ai: 44, controversy: 14, classification: 'Hidden Winner',  signal: 'Buy / Watchlist' },
  GLD:   { esg: 58, env: 55, soc: 57, gov: 62, mom: 14, ai: 10, controversy: 12, classification: 'Watchlist',      signal: 'Hold' },
  VTI:   { esg: 62, env: 61, soc: 63, gov: 62, mom: 11, ai: 43, controversy: 15, classification: 'Hidden Winner',  signal: 'Buy / Watchlist' },
  DIA:   { esg: 60, env: 58, soc: 61, gov: 61, mom: 9,  ai: 38, controversy: 16, classification: 'Watchlist',      signal: 'Hold' },
  TLT:   { esg: 72, env: 74, soc: 71, gov: 71, mom: -4, ai: 5,  controversy: 8,  classification: 'Watchlist',      signal: 'Hold' },
  SSNLF: { esg: 62, env: 60, soc: 61, gov: 65, mom: 15, ai: 68, controversy: 22, classification: 'Future Leader',  signal: 'Buy' },
  HXSCL: { esg: 58, env: 56, soc: 57, gov: 61, mom: 17, ai: 72, controversy: 24, classification: 'Future Leader',  signal: 'Buy' },
  ON:    { esg: 61, env: 63, soc: 60, gov: 60, mom: -5, ai: 42, controversy: 19, classification: 'Watchlist',      signal: 'Hold' },
};

// Dividend data for new companies
const DIVIDEND_DATA = {
  WDC:   { annualDividend: null, dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None' },
  SNDK:  { annualDividend: null, dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None' },
  SPY:   { annualDividend: 6.52, dividendYield: 1.22,  lastDividendDate: '2025-12-20', payoutFrequency: 'Quarterly' },
  QQQ:   { annualDividend: 1.90, dividendYield: 0.56,  lastDividendDate: '2025-12-23', payoutFrequency: 'Quarterly' },
  VOO:   { annualDividend: 6.48, dividendYield: 1.21,  lastDividendDate: '2025-12-23', payoutFrequency: 'Quarterly' },
  GLD:   { annualDividend: null, dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None' },
  VTI:   { annualDividend: 3.60, dividendYield: 1.30,  lastDividendDate: '2025-12-23', payoutFrequency: 'Quarterly' },
  DIA:   { annualDividend: 6.40, dividendYield: 1.54,  lastDividendDate: '2025-12-15', payoutFrequency: 'Monthly' },
  TLT:   { annualDividend: 3.20, dividendYield: 3.62,  lastDividendDate: '2026-01-07', payoutFrequency: 'Monthly' },
  SSNLF: { annualDividend: 0.50, dividendYield: 2.80,  lastDividendDate: '2025-04-17', payoutFrequency: 'Annual' },
  HXSCL: { annualDividend: 0.40, dividendYield: 1.90,  lastDividendDate: '2025-04-15', payoutFrequency: 'Annual' },
  ON:    { annualDividend: null, dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None' },
};

async function main() {
  let added = 0;
  for (const co of NEW_COMPANIES) {
    try {
      const existing = await prisma.company.findUnique({ where: { ticker: co.ticker } });
      if (existing) {
        if (co.ticker === 'WDC' && existing.name !== co.name) {
          await prisma.company.update({
            where: { ticker: co.ticker },
            data: { name: co.name, industry: co.industry, logoUrl: co.logoUrl },
          });
          console.log(`  [UPDATE] ${co.ticker} — ${co.name}`);
          continue;
        }
        console.log(`  [SKIP] ${co.ticker} already exists (id=${existing.id})`);
        continue;
      }

      const div = DIVIDEND_DATA[co.ticker] || {};
      const company = await prisma.company.create({
        data: {
          id: co.id,
          name: co.name,
          ticker: co.ticker,
          exchange: co.exchange,
          industry: co.industry,
          country: co.country,
          marketCap: co.marketCap,
          logoUrl: co.logoUrl,
          annualDividend: div.annualDividend ?? null,
          dividendYield: div.dividendYield ?? null,
          lastDividendDate: div.lastDividendDate ?? null,
          payoutFrequency: div.payoutFrequency ?? null,
        },
      });

      // Create score snapshot
      const p = ESG_PROFILES[co.ticker];
      await prisma.scoreSnapshot.create({
        data: {
          companyId: company.id,
          currentEsgScore: p.esg,
          environmentalScore: p.env,
          socialScore: p.soc,
          governanceScore: p.gov,
          momentumScore: p.mom,
          aiAdoptionScore: p.ai,
          controversyRisk: p.controversy,
          classification: p.classification,
          investorSignal: p.signal,
          confidenceScore: 0.75,
        },
      });

      added++;
      console.log(`  [OK] ${co.ticker} — ${co.name} (id=${company.id})`);
    } catch (err) {
      console.error(`  [ERR] ${co.ticker}:`, err.message);
    }
  }
  console.log(`\n✅ Added ${added} new companies.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
