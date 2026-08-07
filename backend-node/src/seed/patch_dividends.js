'use strict';
/**
 * patch_dividends.js
 * Seeds annualDividend, dividendYield, lastDividendDate, payoutFrequency
 * for all 71 tracked companies.  Run once: node src/seed/patch_dividends.js
 */

const prisma = require('../database');

// ticker → { annualDividend (USD), dividendYield (%), lastDividendDate, payoutFrequency }
// dividendYield = percentage (e.g. 3.25 means 3.25%)
// annualDividend = total per-share USD/year
const DIVIDENDS = {
  AAPL:  { annualDividend: 0.99,  dividendYield: 0.51, lastDividendDate: '2025-08-14', payoutFrequency: 'Quarterly' },
  MSFT:  { annualDividend: 3.32,  dividendYield: 0.82, lastDividendDate: '2025-12-11', payoutFrequency: 'Quarterly' },
  NVDA:  { annualDividend: 0.04,  dividendYield: 0.03, lastDividendDate: '2025-06-26', payoutFrequency: 'Quarterly' },
  AMZN:  { annualDividend: null,  dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None'      },
  META:  { annualDividend: 2.00,  dividendYield: 0.38, lastDividendDate: '2025-09-25', payoutFrequency: 'Quarterly' },
  GOOGL: { annualDividend: 0.80,  dividendYield: 0.46, lastDividendDate: '2025-09-17', payoutFrequency: 'Quarterly' },
  SPACEX:{ annualDividend: null,  dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None'      },
  SPCX:  { annualDividend: 0.36,  dividendYield: 3.20, lastDividendDate: '2025-06-30', payoutFrequency: 'Quarterly' },
  MU:    { annualDividend: 0.46,  dividendYield: 0.51, lastDividendDate: '2025-07-10', payoutFrequency: 'Quarterly' },
  QCOM:  { annualDividend: 3.60,  dividendYield: 2.09, lastDividendDate: '2025-09-25', payoutFrequency: 'Quarterly' },
  INTC:  { annualDividend: 0.50,  dividendYield: 2.25, lastDividendDate: '2025-03-01', payoutFrequency: 'Quarterly' },
  TXN:   { annualDividend: 5.20,  dividendYield: 2.77, lastDividendDate: '2025-11-20', payoutFrequency: 'Quarterly' },
  ADI:   { annualDividend: 3.84,  dividendYield: 2.06, lastDividendDate: '2025-09-10', payoutFrequency: 'Quarterly' },
  AMAT:  { annualDividend: 0.56,  dividendYield: 0.54, lastDividendDate: '2025-06-19', payoutFrequency: 'Quarterly' },
  LRCX:  { annualDividend: 1.80,  dividendYield: 1.07, lastDividendDate: '2025-07-24', payoutFrequency: 'Quarterly' },
  KLAC:  { annualDividend: 1.80,  dividendYield: 0.67, lastDividendDate: '2025-08-01', payoutFrequency: 'Quarterly' },
  PANW:  { annualDividend: null,  dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None'      },
  SNPS:  { annualDividend: null,  dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None'      },
  CDNS:  { annualDividend: null,  dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None'      },
  NOW:   { annualDividend: null,  dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None'      },
  CRWD:  { annualDividend: null,  dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None'      },
  ARM:   { annualDividend: null,  dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None'      },
  DELL:  { annualDividend: 0.44,  dividendYield: 0.54, lastDividendDate: '2025-07-28', payoutFrequency: 'Quarterly' },
  HPE:   { annualDividend: 0.55,  dividendYield: 3.07, lastDividendDate: '2025-10-10', payoutFrequency: 'Quarterly' },
  TSLA:  { annualDividend: null,  dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None'      },
  AVGO:  { annualDividend: 23.40, dividendYield: 1.49, lastDividendDate: '2025-09-30', payoutFrequency: 'Quarterly' },
  AMD:   { annualDividend: null,  dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None'      },
  NFLX:  { annualDividend: null,  dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None'      },
  JPM:   { annualDividend: 5.00,  dividendYield: 2.05, lastDividendDate: '2025-10-31', payoutFrequency: 'Quarterly' },
  V:     { annualDividend: 2.36,  dividendYield: 0.77, lastDividendDate: '2025-09-02', payoutFrequency: 'Quarterly' },
  MA:    { annualDividend: 2.64,  dividendYield: 0.54, lastDividendDate: '2025-11-07', payoutFrequency: 'Quarterly' },
  WMT:   { annualDividend: 0.94,  dividendYield: 0.99, lastDividendDate: '2026-01-02', payoutFrequency: 'Quarterly' },
  PG:    { annualDividend: 4.03,  dividendYield: 2.42, lastDividendDate: '2025-11-14', payoutFrequency: 'Quarterly' },
  KO:    { annualDividend: 1.96,  dividendYield: 3.25, lastDividendDate: '2025-10-01', payoutFrequency: 'Quarterly' },
  XOM:   { annualDividend: 3.96,  dividendYield: 3.54, lastDividendDate: '2025-09-10', payoutFrequency: 'Quarterly' },
  CVX:   { annualDividend: 6.52,  dividendYield: 4.50, lastDividendDate: '2025-09-10', payoutFrequency: 'Quarterly' },
  SHEL:  { annualDividend: 2.00,  dividendYield: 4.08, lastDividendDate: '2025-09-22', payoutFrequency: 'Quarterly' },
  TM:    { annualDividend: 3.28,  dividendYield: 1.48, lastDividendDate: '2025-09-30', payoutFrequency: 'Semi-Annual' },
  BYDDF: { annualDividend: 0.35,  dividendYield: 0.52, lastDividendDate: '2025-06-20', payoutFrequency: 'Annual'    },
  VWAGY: { annualDividend: 2.40,  dividendYield: 8.20, lastDividendDate: '2025-05-15', payoutFrequency: 'Annual'    },
  NSRGY: { annualDividend: 3.10,  dividendYield: 4.02, lastDividendDate: '2025-04-17', payoutFrequency: 'Annual'    },
  TTE:   { annualDividend: 3.60,  dividendYield: 5.21, lastDividendDate: '2025-10-15', payoutFrequency: 'Quarterly' },
  BP:    { annualDividend: 1.54,  dividendYield: 5.75, lastDividendDate: '2025-09-19', payoutFrequency: 'Quarterly' },
  ASML:  { annualDividend: 7.62,  dividendYield: 0.87, lastDividendDate: '2025-11-06', payoutFrequency: 'Semi-Annual' },
  SAP:   { annualDividend: 2.52,  dividendYield: 1.50, lastDividendDate: '2025-05-22', payoutFrequency: 'Annual'    },
  ORCL:  { annualDividend: 1.60,  dividendYield: 1.21, lastDividendDate: '2025-10-24', payoutFrequency: 'Quarterly' },
  IBM:   { annualDividend: 6.68,  dividendYield: 3.15, lastDividendDate: '2025-12-10', payoutFrequency: 'Quarterly' },
  CSCO:  { annualDividend: 1.60,  dividendYield: 3.01, lastDividendDate: '2025-10-22', payoutFrequency: 'Quarterly' },
  NKE:   { annualDividend: 1.48,  dividendYield: 2.05, lastDividendDate: '2025-10-01', payoutFrequency: 'Quarterly' },
  MCD:   { annualDividend: 7.28,  dividendYield: 2.38, lastDividendDate: '2025-12-17', payoutFrequency: 'Quarterly' },
  SBUX:  { annualDividend: 2.36,  dividendYield: 2.98, lastDividendDate: '2025-11-28', payoutFrequency: 'Quarterly' },
  PEP:   { annualDividend: 5.42,  dividendYield: 3.61, lastDividendDate: '2026-01-07', payoutFrequency: 'Quarterly' },
  PFE:   { annualDividend: 1.68,  dividendYield: 6.46, lastDividendDate: '2025-12-03', payoutFrequency: 'Quarterly' },
  JNJ:   { annualDividend: 4.96,  dividendYield: 3.17, lastDividendDate: '2025-12-03', payoutFrequency: 'Quarterly' },
  UNH:   { annualDividend: 8.00,  dividendYield: 1.55, lastDividendDate: '2025-12-17', payoutFrequency: 'Quarterly' },
  ABBV:  { annualDividend: 6.32,  dividendYield: 3.61, lastDividendDate: '2025-11-14', payoutFrequency: 'Quarterly' },
  BABA:  { annualDividend: 1.04,  dividendYield: 2.15, lastDividendDate: '2025-04-04', payoutFrequency: 'Annual'    },
  NIO:   { annualDividend: null,  dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None'      },
  TMC:   { annualDividend: null,  dividendYield: null,  lastDividendDate: null,         payoutFrequency: 'None'      },
  TSM:   { annualDividend: 2.28,  dividendYield: 1.97, lastDividendDate: '2025-10-17', payoutFrequency: 'Quarterly' },
  SONY:  { annualDividend: 0.92,  dividendYield: 0.53, lastDividendDate: '2025-09-30', payoutFrequency: 'Semi-Annual' },
  HMC:   { annualDividend: 1.62,  dividendYield: 3.50, lastDividendDate: '2025-09-30', payoutFrequency: 'Semi-Annual' },
  SIEGY: { annualDividend: 2.52,  dividendYield: 3.02, lastDividendDate: '2025-02-05', payoutFrequency: 'Annual'    },
  UL:    { annualDividend: 2.00,  dividendYield: 3.72, lastDividendDate: '2025-09-10', payoutFrequency: 'Quarterly' },
  ENB:   { annualDividend: 3.55,  dividendYield: 6.63, lastDividendDate: '2025-12-01', payoutFrequency: 'Quarterly' },
  STLA:  { annualDividend: 1.10,  dividendYield: 8.30, lastDividendDate: '2025-04-30', payoutFrequency: 'Annual'    },
  BMWYY: { annualDividend: 4.10,  dividendYield: 6.15, lastDividendDate: '2025-05-15', payoutFrequency: 'Annual'    },
  INFY:  { annualDividend: 0.62,  dividendYield: 2.88, lastDividendDate: '2025-10-31', payoutFrequency: 'Semi-Annual' },
  RIO:   { annualDividend: 5.12,  dividendYield: 6.85, lastDividendDate: '2025-09-17', payoutFrequency: 'Semi-Annual' },
  BHP:   { annualDividend: 3.04,  dividendYield: 5.40, lastDividendDate: '2025-09-30', payoutFrequency: 'Semi-Annual' },
  'Z74.SI': { annualDividend: 0.11, dividendYield: 4.52, lastDividendDate: '2025-11-27', payoutFrequency: 'Semi-Annual' },
};

async function main() {
  let updated = 0;
  for (const [ticker, data] of Object.entries(DIVIDENDS)) {
    const company = await prisma.company.findUnique({ where: { ticker } });
    if (!company) {
      console.log(`  [SKIP] ${ticker} not found`);
      continue;
    }
    await prisma.company.update({
      where: { ticker },
      data: {
        annualDividend: data.annualDividend,
        dividendYield: data.dividendYield,
        lastDividendDate: data.lastDividendDate,
        payoutFrequency: data.payoutFrequency,
      },
    });
    updated++;
  }
  console.log(`\n✅ Dividend data patched for ${updated} companies.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
