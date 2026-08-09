'use strict';

require('dotenv').config();

const prisma = require('../database');
const { calculateScores } = require('../services/scoring');
const { hashPassword } = require('../utils/security');
const { applyNewCompanies } = require('./patch_new_companies');

// ── All 71 companies, IDs exactly match frontend COMPANY_CATALOG index+1 ────
const CATALOG_COMPANIES = [
  { id: 1,  ticker: 'AAPL',   name: 'Apple Inc.',                               exchange: 'NASDAQ',   industry: 'Technology / Consumer Electronics', country: 'United States',  marketCap: '$3.4T',  logoUrl: 'https://logo.clearbit.com/apple.com?size=128' },
  { id: 2,  ticker: 'MSFT',   name: 'Microsoft Corporation',                    exchange: 'NASDAQ',   industry: 'Technology',                        country: 'United States',  marketCap: '$3.1T',  logoUrl: 'https://logo.clearbit.com/microsoft.com?size=128' },
  { id: 3,  ticker: 'NVDA',   name: 'NVIDIA Corporation',                       exchange: 'NASDAQ',   industry: 'Semiconductors / AI',               country: 'United States',  marketCap: '$2.8T',  logoUrl: 'https://logo.clearbit.com/nvidia.com?size=128' },
  { id: 4,  ticker: 'AMZN',   name: 'Amazon.com Inc.',                          exchange: 'NASDAQ',   industry: 'Technology / E-Commerce',           country: 'United States',  marketCap: '$1.9T',  logoUrl: 'https://logo.clearbit.com/amazon.com?size=128' },
  { id: 5,  ticker: 'META',   name: 'Meta Platforms Inc.',                      exchange: 'NASDAQ',   industry: 'Technology / Social Media',         country: 'United States',  marketCap: '$1.4T',  logoUrl: 'https://logo.clearbit.com/meta.com?size=128' },
  { id: 6,  ticker: 'GOOGL',  name: 'Alphabet Inc. Class A',                    exchange: 'NASDAQ',   industry: 'Technology / Internet',             country: 'United States',  marketCap: '$2.2T',  logoUrl: 'https://logo.clearbit.com/google.com?size=128' },
  { id: 7,  ticker: 'SPACEX', name: 'SpaceX',                                   exchange: 'PRIVATE',  industry: 'Aerospace / Space Transportation',  country: 'United States',  marketCap: '$180B',  logoUrl: 'https://logo.clearbit.com/spacex.com?size=128' },
  { id: 8,  ticker: 'SPCX',   name: 'SPAC and New Issue ETF',                   exchange: 'NYSEARCA', industry: 'ETF',                               country: 'United States',  marketCap: '$0.3B',  logoUrl: 'https://logo.clearbit.com/simplify.us?size=128' },
  { id: 9,  ticker: 'MU',     name: 'Micron Technology, Inc.',                  exchange: 'NASDAQ',   industry: 'Semiconductors',                    country: 'United States',  marketCap: '$170B',  logoUrl: 'https://www.google.com/s2/favicons?domain=micron.com&sz=128' },
  { id: 10, ticker: 'QCOM',   name: 'QUALCOMM Incorporated',                    exchange: 'NASDAQ',   industry: 'Semiconductors / Wireless',         country: 'United States',  marketCap: '$210B',  logoUrl: 'https://www.google.com/s2/favicons?domain=qualcomm.com&sz=128' },
  { id: 11, ticker: 'INTC',   name: 'Intel Corporation',                        exchange: 'NASDAQ',   industry: 'Semiconductors',                    country: 'United States',  marketCap: '$180B',  logoUrl: 'https://www.google.com/s2/favicons?domain=intel.com&sz=128' },
  { id: 12, ticker: 'TXN',    name: 'Texas Instruments Incorporated',           exchange: 'NASDAQ',   industry: 'Semiconductors',                    country: 'United States',  marketCap: '$170B',  logoUrl: 'https://www.google.com/s2/favicons?domain=ti.com&sz=128' },
  { id: 13, ticker: 'ADI',    name: 'Analog Devices, Inc.',                     exchange: 'NASDAQ',   industry: 'Semiconductors',                    country: 'United States',  marketCap: '$110B',  logoUrl: 'https://www.google.com/s2/favicons?domain=analog.com&sz=128' },
  { id: 14, ticker: 'AMAT',   name: 'Applied Materials, Inc.',                  exchange: 'NASDAQ',   industry: 'Semiconductor Equipment',           country: 'United States',  marketCap: '$180B',  logoUrl: 'https://www.google.com/s2/favicons?domain=appliedmaterials.com&sz=128' },
  { id: 15, ticker: 'LRCX',   name: 'Lam Research Corporation',                 exchange: 'NASDAQ',   industry: 'Semiconductor Equipment',           country: 'United States',  marketCap: '$140B',  logoUrl: 'https://www.google.com/s2/favicons?domain=lamresearch.com&sz=128' },
  { id: 16, ticker: 'KLAC',   name: 'KLA Corporation',                          exchange: 'NASDAQ',   industry: 'Semiconductor Equipment',           country: 'United States',  marketCap: '$100B',  logoUrl: 'https://www.google.com/s2/favicons?domain=kla.com&sz=128' },
  { id: 17, ticker: 'PANW',   name: 'Palo Alto Networks, Inc.',                 exchange: 'NASDAQ',   industry: 'Cybersecurity',                     country: 'United States',  marketCap: '$120B',  logoUrl: 'https://www.google.com/s2/favicons?domain=paloaltonetworks.com&sz=128' },
  { id: 18, ticker: 'SNPS',   name: 'Synopsys, Inc.',                           exchange: 'NASDAQ',   industry: 'Semiconductor Software',            country: 'United States',  marketCap: '$90B',   logoUrl: 'https://www.google.com/s2/favicons?domain=synopsys.com&sz=128' },
  { id: 19, ticker: 'CDNS',   name: 'Cadence Design Systems, Inc.',             exchange: 'NASDAQ',   industry: 'Semiconductor Software',            country: 'United States',  marketCap: '$80B',   logoUrl: 'https://www.google.com/s2/favicons?domain=cadence.com&sz=128' },
  { id: 20, ticker: 'NOW',    name: 'ServiceNow, Inc.',                         exchange: 'NYSE',     industry: 'Enterprise Software',               country: 'United States',  marketCap: '$170B',  logoUrl: 'https://www.google.com/s2/favicons?domain=servicenow.com&sz=128' },
  { id: 21, ticker: 'CRWD',   name: 'CrowdStrike Holdings, Inc.',               exchange: 'NASDAQ',   industry: 'Cybersecurity',                     country: 'United States',  marketCap: '$110B',  logoUrl: 'https://www.google.com/s2/favicons?domain=crowdstrike.com&sz=128' },
  { id: 22, ticker: 'ARM',    name: 'Arm Holdings plc',                         exchange: 'NASDAQ',   industry: 'Semiconductors / IP',               country: 'United Kingdom', marketCap: '$150B',  logoUrl: 'https://www.google.com/s2/favicons?domain=arm.com&sz=128' },
  { id: 23, ticker: 'DELL',   name: 'Dell Technologies Inc.',                   exchange: 'NYSE',     industry: 'Technology Hardware',               country: 'United States',  marketCap: '$90B',   logoUrl: 'https://www.google.com/s2/favicons?domain=dell.com&sz=128' },
  { id: 24, ticker: 'HPE',    name: 'Hewlett Packard Enterprise Company',       exchange: 'NYSE',     industry: 'Technology Hardware',               country: 'United States',  marketCap: '$25B',   logoUrl: 'https://www.google.com/s2/favicons?domain=hpe.com&sz=128' },
  { id: 25, ticker: 'TSLA',   name: 'Tesla, Inc.',                              exchange: 'NASDAQ',   industry: 'Automotive / Clean Energy',         country: 'United States',  marketCap: '$780B',  logoUrl: 'https://logo.clearbit.com/tesla.com?size=128' },
  { id: 26, ticker: 'AVGO',   name: 'Broadcom Inc.',                            exchange: 'NASDAQ',   industry: 'Semiconductors',                    country: 'United States',  marketCap: '$800B',  logoUrl: 'https://logo.clearbit.com/broadcom.com?size=128' },
  { id: 27, ticker: 'AMD',    name: 'Advanced Micro Devices, Inc.',             exchange: 'NASDAQ',   industry: 'Semiconductors',                    country: 'United States',  marketCap: '$350B',  logoUrl: 'https://logo.clearbit.com/amd.com?size=128' },
  { id: 28, ticker: 'NFLX',   name: 'Netflix, Inc.',                            exchange: 'NASDAQ',   industry: 'Media / Streaming',                 country: 'United States',  marketCap: '$300B',  logoUrl: 'https://logo.clearbit.com/netflix.com?size=128' },
  { id: 29, ticker: 'JPM',    name: 'JPMorgan Chase & Co.',                     exchange: 'NYSE',     industry: 'Financial Services',                country: 'United States',  marketCap: '$650B',  logoUrl: 'https://logo.clearbit.com/jpmorganchase.com?size=128' },
  { id: 30, ticker: 'V',      name: 'Visa Inc.',                                exchange: 'NYSE',     industry: 'Financial Services',                country: 'United States',  marketCap: '$600B',  logoUrl: 'https://logo.clearbit.com/visa.com?size=128' },
  { id: 31, ticker: 'MA',     name: 'Mastercard Incorporated',                  exchange: 'NYSE',     industry: 'Financial Services',                country: 'United States',  marketCap: '$500B',  logoUrl: 'https://logo.clearbit.com/mastercard.com?size=128' },
  { id: 32, ticker: 'WMT',    name: 'Walmart Inc.',                             exchange: 'NYSE',     industry: 'Retail',                            country: 'United States',  marketCap: '$550B',  logoUrl: 'https://logo.clearbit.com/walmart.com?size=128' },
  { id: 33, ticker: 'PG',     name: 'Procter & Gamble Company',                 exchange: 'NYSE',     industry: 'Consumer Goods',                    country: 'United States',  marketCap: '$380B',  logoUrl: 'https://logo.clearbit.com/pg.com?size=128' },
  { id: 34, ticker: 'KO',     name: 'Coca-Cola Company',                        exchange: 'NYSE',     industry: 'Consumer Goods',                    country: 'United States',  marketCap: '$300B',  logoUrl: 'https://logo.clearbit.com/coca-cola.com?size=128' },
  { id: 35, ticker: 'XOM',    name: 'ExxonMobil Corporation',                   exchange: 'NYSE',     industry: 'Oil & Gas',                         country: 'United States',  marketCap: '$460B',  logoUrl: 'https://logo.clearbit.com/exxonmobil.com?size=128' },
  { id: 36, ticker: 'CVX',    name: 'Chevron Corporation',                      exchange: 'NYSE',     industry: 'Oil & Gas',                         country: 'United States',  marketCap: '$310B',  logoUrl: 'https://logo.clearbit.com/chevron.com?size=128' },
  { id: 37, ticker: 'SHEL',   name: 'Shell plc',                                exchange: 'NYSE',     industry: 'Oil & Gas',                         country: 'United Kingdom', marketCap: '$210B',  logoUrl: 'https://logo.clearbit.com/shell.com?size=128' },
  { id: 38, ticker: 'TM',     name: 'Toyota Motor Corporation',                 exchange: 'NYSE',     industry: 'Automotive',                        country: 'Japan',          marketCap: '$230B',  logoUrl: 'https://logo.clearbit.com/toyota.com?size=128' },
  { id: 39, ticker: 'BYDDF',  name: 'BYD Company Limited',                      exchange: 'OTC',      industry: 'Automotive / Clean Energy',         country: 'China',          marketCap: '$95B',   logoUrl: 'https://logo.clearbit.com/byd.com?size=128' },
  { id: 40, ticker: 'VWAGY',  name: 'Volkswagen AG',                            exchange: 'OTC',      industry: 'Automotive',                        country: 'Germany',        marketCap: '$60B',   logoUrl: 'https://logo.clearbit.com/volkswagen.com?size=128' },
  { id: 41, ticker: 'NSRGY',  name: 'Nestle SA',                                exchange: 'OTC',      industry: 'Consumer Goods',                    country: 'Switzerland',    marketCap: '$320B',  logoUrl: 'https://logo.clearbit.com/nestle.com?size=128' },
  { id: 42, ticker: 'TTE',    name: 'TotalEnergies SE',                         exchange: 'NYSE',     industry: 'Oil & Gas',                         country: 'France',         marketCap: '$170B',  logoUrl: 'https://logo.clearbit.com/totalenergies.com?size=128' },
  { id: 43, ticker: 'BP',     name: 'BP p.l.c.',                                exchange: 'NYSE',     industry: 'Oil & Gas',                         country: 'United Kingdom', marketCap: '$115B',  logoUrl: 'https://logo.clearbit.com/bp.com?size=128' },
  { id: 44, ticker: 'ASML',   name: 'ASML Holding N.V.',                        exchange: 'NASDAQ',   industry: 'Semiconductors',                    country: 'Netherlands',    marketCap: '$500B',  logoUrl: 'https://logo.clearbit.com/asml.com?size=128' },
  { id: 45, ticker: 'SAP',    name: 'SAP SE',                                   exchange: 'NYSE',     industry: 'Enterprise Software',               country: 'Germany',        marketCap: '$250B',  logoUrl: 'https://logo.clearbit.com/sap.com?size=128' },
  { id: 46, ticker: 'ORCL',   name: 'Oracle Corporation',                       exchange: 'NYSE',     industry: 'Enterprise Software',               country: 'United States',  marketCap: '$420B',  logoUrl: 'https://logo.clearbit.com/oracle.com?size=128' },
  { id: 47, ticker: 'IBM',    name: 'International Business Machines Corp.',    exchange: 'NYSE',     industry: 'Technology',                        country: 'United States',  marketCap: '$220B',  logoUrl: 'https://logo.clearbit.com/ibm.com?size=128' },
  { id: 48, ticker: 'CSCO',   name: 'Cisco Systems, Inc.',                      exchange: 'NASDAQ',   industry: 'Networking',                        country: 'United States',  marketCap: '$280B',  logoUrl: 'https://logo.clearbit.com/cisco.com?size=128' },
  { id: 49, ticker: 'NKE',    name: 'NIKE, Inc.',                               exchange: 'NYSE',     industry: 'Consumer Goods',                    country: 'United States',  marketCap: '$170B',  logoUrl: 'https://logo.clearbit.com/nike.com?size=128' },
  { id: 50, ticker: 'MCD',    name: "McDonald's Corporation",                   exchange: 'NYSE',     industry: 'Consumer Services',                 country: 'United States',  marketCap: '$210B',  logoUrl: 'https://logo.clearbit.com/mcdonalds.com?size=128' },
  { id: 51, ticker: 'SBUX',   name: 'Starbucks Corporation',                    exchange: 'NASDAQ',   industry: 'Consumer Services',                 country: 'United States',  marketCap: '$130B',  logoUrl: 'https://logo.clearbit.com/starbucks.com?size=128' },
  { id: 52, ticker: 'PEP',    name: 'PepsiCo, Inc.',                            exchange: 'NASDAQ',   industry: 'Consumer Goods',                    country: 'United States',  marketCap: '$250B',  logoUrl: 'https://logo.clearbit.com/pepsico.com?size=128' },
  { id: 53, ticker: 'PFE',    name: 'Pfizer Inc.',                              exchange: 'NYSE',     industry: 'Healthcare',                        country: 'United States',  marketCap: '$170B',  logoUrl: 'https://logo.clearbit.com/pfizer.com?size=128' },
  { id: 54, ticker: 'JNJ',    name: 'Johnson & Johnson',                        exchange: 'NYSE',     industry: 'Healthcare',                        country: 'United States',  marketCap: '$420B',  logoUrl: 'https://logo.clearbit.com/jnj.com?size=128' },
  { id: 55, ticker: 'UNH',    name: 'UnitedHealth Group Incorporated',          exchange: 'NYSE',     industry: 'Healthcare',                        country: 'United States',  marketCap: '$520B',  logoUrl: 'https://logo.clearbit.com/unitedhealthgroup.com?size=128' },
  { id: 56, ticker: 'ABBV',   name: 'AbbVie Inc.',                              exchange: 'NYSE',     industry: 'Healthcare',                        country: 'United States',  marketCap: '$320B',  logoUrl: 'https://logo.clearbit.com/abbvie.com?size=128' },
  { id: 57, ticker: 'BABA',   name: 'Alibaba Group Holding Limited',            exchange: 'NYSE',     industry: 'Technology / E-Commerce',           country: 'China',          marketCap: '$210B',  logoUrl: 'https://logo.clearbit.com/alibaba.com?size=128' },
  { id: 58, ticker: 'NIO',    name: 'NIO Inc.',                                 exchange: 'NYSE',     industry: 'Automotive / EV',                   country: 'China',          marketCap: '$12B',   logoUrl: null },
  { id: 59, ticker: 'TMC',    name: 'TMC The Metals Company Inc.',              exchange: 'NASDAQ',   industry: 'Materials / Deep Sea Metals',       country: 'Canada',         marketCap: '$0.6B',  logoUrl: null },
  { id: 60, ticker: 'TSM',    name: 'Taiwan Semiconductor Mfg. Company',       exchange: 'NYSE',     industry: 'Semiconductors',                    country: 'Taiwan',         marketCap: '$1.0T',  logoUrl: 'https://logo.clearbit.com/tsmc.com?size=128' },
  { id: 61, ticker: 'SONY',   name: 'Sony Group Corporation',                   exchange: 'NYSE',     industry: 'Technology / Media',                country: 'Japan',          marketCap: '$150B',  logoUrl: 'https://logo.clearbit.com/sony.com?size=128' },
  { id: 62, ticker: 'HMC',    name: 'Honda Motor Co., Ltd.',                   exchange: 'NYSE',     industry: 'Automotive',                        country: 'Japan',          marketCap: '$80B',   logoUrl: 'https://logo.clearbit.com/honda.com?size=128' },
  { id: 63, ticker: 'SIEGY',  name: 'Siemens AG',                               exchange: 'OTC',      industry: 'Industrial Technology',             country: 'Germany',        marketCap: '$170B',  logoUrl: 'https://logo.clearbit.com/siemens.com?size=128' },
  { id: 64, ticker: 'UL',     name: 'Unilever PLC',                             exchange: 'NYSE',     industry: 'Consumer Goods',                    country: 'United Kingdom', marketCap: '$140B',  logoUrl: 'https://logo.clearbit.com/unilever.com?size=128' },
  { id: 65, ticker: 'ENB',    name: 'Enbridge Inc.',                            exchange: 'NYSE',     industry: 'Energy Infrastructure',             country: 'Canada',         marketCap: '$85B',   logoUrl: 'https://logo.clearbit.com/enbridge.com?size=128' },
  { id: 66, ticker: 'STLA',   name: 'Stellantis N.V.',                          exchange: 'NYSE',     industry: 'Automotive',                        country: 'Netherlands',    marketCap: '$60B',   logoUrl: 'https://logo.clearbit.com/stellantis.com?size=128' },
  { id: 67, ticker: 'BMWYY',  name: 'BMW AG',                                   exchange: 'OTC',      industry: 'Automotive',                        country: 'Germany',        marketCap: '$65B',   logoUrl: 'https://logo.clearbit.com/bmwgroup.com?size=128' },
  { id: 68, ticker: 'INFY',   name: 'Infosys Limited',                          exchange: 'NYSE',     industry: 'Technology Services',               country: 'India',          marketCap: '$80B',   logoUrl: 'https://logo.clearbit.com/infosys.com?size=128' },
  { id: 69, ticker: 'RIO',    name: 'Rio Tinto Group',                          exchange: 'NYSE',     industry: 'Materials / Mining',                country: 'United Kingdom', marketCap: '$120B',  logoUrl: 'https://logo.clearbit.com/riotinto.com?size=128' },
  { id: 70, ticker: 'BHP',    name: 'BHP Group Limited',                        exchange: 'NYSE',     industry: 'Materials / Mining',                country: 'Australia',      marketCap: '$150B',  logoUrl: 'https://logo.clearbit.com/bhp.com?size=128' },
  { id: 71, ticker: 'Z74.SI', name: 'Singapore Telecommunications Limited',    exchange: 'SGX',      industry: 'Telecommunications',                country: 'Singapore',      marketCap: '$28B',   logoUrl: 'https://logo.clearbit.com/singtel.com?size=128' },
];

// ESG signals per key ticker (others get the default set)
const SIGNALS_BY_TICKER = {
  AAPL: [
    { title: 'Apple supplier audit reveals labor violations in Vietnam', category: 'social', sentiment: 'negative', severity: 5.5, source: 'NYT' },
    { title: 'Apple carbon neutral products by 2030 pledge on track', category: 'environmental', sentiment: 'positive', severity: 0, source: 'Apple ESG' },
    { title: 'Apple Intelligence AI features launch across all devices', category: 'ai_adoption', sentiment: 'positive', severity: 0, source: 'Apple' },
    { title: 'Apple pays $490M to settle shareholder lawsuit on diversity', category: 'controversy', sentiment: 'negative', severity: 5.0, source: 'WSJ' },
  ],
  MSFT: [
    { title: 'Microsoft achieves carbon neutral operations globally', category: 'environmental', sentiment: 'positive', severity: 0, source: 'Microsoft Blog' },
    { title: 'Azure AI platform adds 10M enterprise users', category: 'ai_adoption', sentiment: 'positive', severity: 0, source: 'Microsoft Investor' },
    { title: 'Microsoft invests $3.3B in Wisconsin AI data center', category: 'ai_adoption', sentiment: 'positive', severity: 0, source: 'Bloomberg' },
    { title: 'Employee concerns raised over AI ethics guidelines', category: 'governance', sentiment: 'negative', severity: 2.5, source: 'LinkedIn' },
  ],
  NVDA: [
    { title: 'NVIDIA reports 200% YoY revenue growth on AI demand', category: 'ai_adoption', sentiment: 'positive', severity: 0, source: 'Earnings Call' },
    { title: 'NVIDIA joins RE100 renewable electricity initiative', category: 'environmental', sentiment: 'positive', severity: 0, source: 'NVIDIA CSR' },
    { title: 'US export controls limit NVIDIA China revenue', category: 'governance', sentiment: 'negative', severity: 3.5, source: 'Reuters' },
  ],
  TSLA: [
    { title: 'Tesla cuts 10% of global workforce amid restructuring', category: 'social', sentiment: 'negative', severity: 5.0, source: 'Reuters' },
    { title: 'Tesla deploys 1GWh of Megapack storage in Texas', category: 'environmental', sentiment: 'positive', severity: 0, source: 'Tesla Blog' },
    { title: 'Elon Musk compensation package draws shareholder opposition', category: 'governance', sentiment: 'negative', severity: 4.0, source: 'FT' },
    { title: 'NHTSA investigates Tesla Autopilot fatality', category: 'controversy', sentiment: 'negative', severity: 8.0, source: 'WSJ' },
  ],
  SHEL: [
    { title: 'Shell abandons 2035 Scope 3 emissions target', category: 'environmental', sentiment: 'negative', severity: 7.0, source: 'FT' },
    { title: 'NGO files greenwashing complaint against Shell marketing', category: 'controversy', sentiment: 'negative', severity: 6.5, source: 'Guardian' },
    { title: 'Shell invests $1.5B in offshore wind in North Sea', category: 'environmental', sentiment: 'positive', severity: 0, source: 'Shell IR' },
  ],
  XOM: [
    { title: 'ExxonMobil faces shareholder resolution on emissions targets', category: 'controversy', sentiment: 'negative', severity: 6.0, source: 'Reuters' },
    { title: 'Exxon expands carbon capture project in Wyoming', category: 'environmental', sentiment: 'positive', severity: 0, source: 'Bloomberg' },
  ],
  JPM: [
    { title: 'JPMorgan commits $2.5T to sustainable development financing', category: 'environmental', sentiment: 'positive', severity: 0, source: 'JPM IR' },
    { title: 'JPMorgan under scrutiny for fossil fuel lending', category: 'controversy', sentiment: 'negative', severity: 5.5, source: 'Guardian' },
  ],
  AMZN: [
    { title: 'Amazon reaches 100% renewable energy target ahead of schedule', category: 'environmental', sentiment: 'positive', severity: 0, source: 'Amazon Sustainability' },
    { title: 'Amazon workers strike over warehouse safety conditions', category: 'social', sentiment: 'negative', severity: 5.0, source: 'BBC' },
    { title: 'AWS launches new AI sustainability toolkit for enterprises', category: 'ai_adoption', sentiment: 'positive', severity: 0, source: 'AWS Blog' },
  ],
  default: [
    { title: 'Company commits to science-based emissions targets', category: 'environmental', sentiment: 'positive', severity: 0, source: 'Press Release' },
    { title: 'Board approves new ESG governance framework', category: 'governance', sentiment: 'positive', severity: 0, source: 'IR Website' },
    { title: 'Digital transformation strategy announced with AI focus', category: 'ai_adoption', sentiment: 'positive', severity: 0, source: 'Tech Blog' },
    { title: 'Regulatory investigation opened into business practices', category: 'controversy', sentiment: 'negative', severity: 4.0, source: 'Regulator' },
    { title: 'Diversity and inclusion report shows workforce progress', category: 'social', sentiment: 'positive', severity: 0, source: 'Company' },
  ],
};

const ESG_METRICS_TEMPLATE = [
  { metricName: 'Scope 1 Emissions', pillar: 'environmental', unit: 'tCO2e' },
  { metricName: 'Scope 2 Emissions', pillar: 'environmental', unit: 'tCO2e' },
  { metricName: 'Renewable Energy Share', pillar: 'environmental', unit: '%' },
  { metricName: 'Women in Leadership', pillar: 'social', unit: '%' },
  { metricName: 'Employee Turnover', pillar: 'social', unit: '%' },
  { metricName: 'Board Independence', pillar: 'governance', unit: '%' },
];

function randBetween(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

function metricValuesFor(ticker) {
  const MAP = {
    MSFT:  [120000, 800000,  60, 32,  8, 82],
    AAPL:  [ 90000, 250000, 100, 35,  7, 78],
    NVDA:  [ 45000, 180000,  40, 28,  9, 85],
    TSLA:  [ 80000, 120000,  70, 25, 12, 55],
    SHEL:  [5500000, 3200000, 8, 22, 15, 65],
    AMZN:  [200000, 900000,  85, 30, 10, 76],
    GOOGL: [110000, 700000,  72, 33,  9, 84],
    META:  [ 65000, 350000,  55, 27, 11, 74],
    JPM:   [ 95000, 400000,  30, 36,  8, 88],
    V:     [ 25000,  80000,  45, 40,  6, 90],
    XOM:   [4200000, 2800000, 12, 20, 14, 62],
    TM:    [900000, 600000,  25, 29, 10, 80],
    BYDDF: [300000, 150000,  80, 22, 13, 68],
    TSMC:  [500000, 300000,  35, 24, 11, 82],
  };
  if (MAP[ticker]) return MAP[ticker];
  return [
    randBetween(50000, 800000),
    randBetween(100000, 2000000),
    randBetween(10, 80),
    randBetween(20, 45),
    randBetween(5, 20),
    randBetween(55, 90),
  ];
}

async function clearData() {
  // Delete in reverse FK order
  await prisma.userWatchlistItem.deleteMany();
  await prisma.userFavoriteItem.deleteMany();
  await prisma.userCompanyTag.deleteMany();
  await prisma.peerGroupMember.deleteMany();
  await prisma.peerGroup.deleteMany();
  await prisma.portfolioItem.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.alertRule.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.eSGMetric.deleteMany();
  await prisma.scoreSnapshot.deleteMany();
  await prisma.report.deleteMany();
  await prisma.company.deleteMany();
  console.log('[Seed] Cleared existing company data.');
}

async function seed(force = false) {
  console.log('[Seed] Starting seed...');

  const existingCount = await prisma.company.count();

  if (!force && existingCount >= 71) {
    console.log(`[Seed] Already seeded (${existingCount} companies). Skipping.`);
    await applyNewCompanies();
    return;
  }

  if (force || existingCount > 0) {
    await clearData();
  }

  // Create all 71 catalog companies with explicit IDs
  for (const co of CATALOG_COMPANIES) {
    try {
      const company = await prisma.company.create({
        data: {
          id: co.id,
          name: co.name,
          ticker: co.ticker,
          exchange: co.exchange || null,
          industry: co.industry || null,
          country: co.country || null,
          marketCap: co.marketCap || null,
          logoUrl: co.logoUrl || null,
          websiteUrl: co.websiteUrl || null,
          description: co.description || null,
        },
      });

      // Add ESG signals
      const signals = SIGNALS_BY_TICKER[co.ticker] || SIGNALS_BY_TICKER.default;
      for (const s of signals) {
        await prisma.signal.create({
          data: {
            companyId: company.id,
            title: s.title,
            category: s.category,
            sentiment: s.sentiment,
            severity: s.severity || 0,
            source: s.source || null,
            confidenceScore: 0.75,
            date: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString().split('T')[0],
          },
        });
      }

      // Add ESG metrics
      const values = metricValuesFor(co.ticker);
      for (let i = 0; i < ESG_METRICS_TEMPLATE.length; i++) {
        const t = ESG_METRICS_TEMPLATE[i];
        await prisma.eSGMetric.create({
          data: {
            companyId: company.id,
            metricName: t.metricName,
            pillar: t.pillar,
            value: values[i],
            unit: t.unit,
            year: 2024,
            confidenceScore: 0.80,
          },
        });
      }

      // Calculate initial ESG score snapshot
      await calculateScores(company.id);
      console.log(`[Seed] ✓ [${company.id.toString().padStart(2, '0')}] ${company.ticker} – ${company.name}`);
    } catch (err) {
      console.error(`[Seed] ✗ ${co.name} (id=${co.id}):`, err.message);
    }
  }

  // Create default admin user
  try {
    await prisma.user.upsert({
      where: { email: 'admin@tricard.local' },
      update: {},
      create: {
        email: 'admin@tricard.local',
        passwordHash: hashPassword('admin123!'),
        fullName: 'Admin User',
        isAdmin: true,
        emailVerified: true,
        investingStyle: 'growth',
      },
    });
    console.log('[Seed] ✓ Admin user (admin@tricard.local / admin123!)');
  } catch (err) {
    console.error('[Seed] Admin user:', err.message);
  }

  await applyNewCompanies();
  console.log('[Seed] Complete!');
}

module.exports = { seed };

// Allow running directly: node src/seed/seed.js [--force]
if (require.main === module) {
  const force = process.argv.includes('--force');
  seed(force)
    .then(() => prisma.$disconnect())
    .catch(err => { console.error(err); process.exit(1); });
}
