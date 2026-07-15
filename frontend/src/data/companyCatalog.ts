import type { Company } from '../types'

export interface CatalogCompany {
  ticker: string
  name: string
  exchange: string
  industry: string
  country: string
  market_cap?: string
  logo_url?: string
}

const c = (
  ticker: string,
  name: string,
  exchange: string,
  industry: string,
  country: string,
  market_cap?: string,
  logo_url?: string,
): CatalogCompany => ({ ticker, name, exchange, industry, country, market_cap, logo_url })

export const COMPANY_CATALOG: CatalogCompany[] = [
  c('AAPL', 'Apple Inc.', 'NASDAQ', 'Technology / Consumer Electronics', 'United States', '$3.4T', 'https://logo.clearbit.com/apple.com?size=128'),
  c('MSFT', 'Microsoft Corporation', 'NASDAQ', 'Technology', 'United States', '$3.1T', 'https://logo.clearbit.com/microsoft.com?size=128'),
  c('NVDA', 'NVIDIA Corporation', 'NASDAQ', 'Semiconductors / AI', 'United States', '$2.8T', 'https://logo.clearbit.com/nvidia.com?size=128'),
  c('AMZN', 'Amazon.com Inc.', 'NASDAQ', 'Technology / E-Commerce', 'United States', '$1.9T', 'https://logo.clearbit.com/amazon.com?size=128'),
  c('META', 'Meta Platforms Inc.', 'NASDAQ', 'Technology / Social Media', 'United States', '$1.4T', 'https://logo.clearbit.com/meta.com?size=128'),
  c('GOOGL', 'Alphabet Inc. Class A', 'NASDAQ', 'Technology / Internet', 'United States', '$2.2T', 'https://logo.clearbit.com/google.com?size=128'),
  c('SPCX', 'SPAC and New Issue ETF', 'NYSEARCA', 'ETF', 'United States', '$0.3B', 'https://logo.clearbit.com/simplify.us?size=128'),
  c('MU', 'Micron Technology, Inc.', 'NASDAQ', 'Semiconductors', 'United States', '$170B', 'https://logo.clearbit.com/micron.com?size=128'),
  c('QCOM', 'QUALCOMM Incorporated', 'NASDAQ', 'Semiconductors / Wireless', 'United States', '$210B', 'https://www.google.com/s2/favicons?domain=qualcomm.com&sz=128'),
  c('INTC', 'Intel Corporation', 'NASDAQ', 'Semiconductors', 'United States', '$180B', 'https://www.google.com/s2/favicons?domain=intel.com&sz=128'),
  c('TXN', 'Texas Instruments Incorporated', 'NASDAQ', 'Semiconductors', 'United States', '$170B', 'https://www.google.com/s2/favicons?domain=ti.com&sz=128'),
  c('ADI', 'Analog Devices, Inc.', 'NASDAQ', 'Semiconductors', 'United States', '$110B', 'https://www.google.com/s2/favicons?domain=analog.com&sz=128'),
  c('AMAT', 'Applied Materials, Inc.', 'NASDAQ', 'Semiconductor Equipment', 'United States', '$180B', 'https://www.google.com/s2/favicons?domain=appliedmaterials.com&sz=128'),
  c('LRCX', 'Lam Research Corporation', 'NASDAQ', 'Semiconductor Equipment', 'United States', '$140B', 'https://www.google.com/s2/favicons?domain=lamresearch.com&sz=128'),
  c('KLAC', 'KLA Corporation', 'NASDAQ', 'Semiconductor Equipment', 'United States', '$100B', 'https://www.google.com/s2/favicons?domain=kla.com&sz=128'),
  c('PANW', 'Palo Alto Networks, Inc.', 'NASDAQ', 'Cybersecurity', 'United States', '$120B', 'https://www.google.com/s2/favicons?domain=paloaltonetworks.com&sz=128'),
  c('SNPS', 'Synopsys, Inc.', 'NASDAQ', 'Semiconductor Software', 'United States', '$90B', 'https://www.google.com/s2/favicons?domain=synopsys.com&sz=128'),
  c('CDNS', 'Cadence Design Systems, Inc.', 'NASDAQ', 'Semiconductor Software', 'United States', '$80B', 'https://www.google.com/s2/favicons?domain=cadence.com&sz=128'),
  c('NOW', 'ServiceNow, Inc.', 'NYSE', 'Enterprise Software', 'United States', '$170B', 'https://www.google.com/s2/favicons?domain=servicenow.com&sz=128'),
  c('CRWD', 'CrowdStrike Holdings, Inc.', 'NASDAQ', 'Cybersecurity', 'United States', '$110B', 'https://www.google.com/s2/favicons?domain=crowdstrike.com&sz=128'),
  c('ARM', 'Arm Holdings plc', 'NASDAQ', 'Semiconductors / IP', 'United Kingdom', '$150B', 'https://www.google.com/s2/favicons?domain=arm.com&sz=128'),
  c('DELL', 'Dell Technologies Inc.', 'NYSE', 'Technology Hardware', 'United States', '$90B', 'https://www.google.com/s2/favicons?domain=dell.com&sz=128'),
  c('HPE', 'Hewlett Packard Enterprise Company', 'NYSE', 'Technology Hardware', 'United States', '$25B', 'https://www.google.com/s2/favicons?domain=hpe.com&sz=128'),
  c('TSLA', 'Tesla, Inc.', 'NASDAQ', 'Automotive / Clean Energy', 'United States', '$780B', 'https://logo.clearbit.com/tesla.com?size=128'),
  c('AVGO', 'Broadcom Inc.', 'NASDAQ', 'Semiconductors', 'United States', '$800B', 'https://logo.clearbit.com/broadcom.com?size=128'),
  c('AMD', 'Advanced Micro Devices, Inc.', 'NASDAQ', 'Semiconductors', 'United States', '$350B', 'https://logo.clearbit.com/amd.com?size=128'),
  c('NFLX', 'Netflix, Inc.', 'NASDAQ', 'Media / Streaming', 'United States', '$300B', 'https://logo.clearbit.com/netflix.com?size=128'),

  c('JPM', 'JPMorgan Chase & Co.', 'NYSE', 'Financial Services', 'United States', '$650B', 'https://logo.clearbit.com/jpmorganchase.com?size=128'),
  c('V', 'Visa Inc.', 'NYSE', 'Financial Services', 'United States', '$600B', 'https://logo.clearbit.com/visa.com?size=128'),
  c('MA', 'Mastercard Incorporated', 'NYSE', 'Financial Services', 'United States', '$500B', 'https://logo.clearbit.com/mastercard.com?size=128'),
  c('WMT', 'Walmart Inc.', 'NYSE', 'Retail', 'United States', '$550B', 'https://logo.clearbit.com/walmart.com?size=128'),
  c('PG', 'Procter & Gamble Company', 'NYSE', 'Consumer Goods', 'United States', '$380B', 'https://logo.clearbit.com/pg.com?size=128'),
  c('KO', 'Coca-Cola Company', 'NYSE', 'Consumer Goods', 'United States', '$300B', 'https://logo.clearbit.com/coca-cola.com?size=128'),
  c('XOM', 'ExxonMobil Corporation', 'NYSE', 'Oil & Gas', 'United States', '$460B', 'https://logo.clearbit.com/exxonmobil.com?size=128'),
  c('CVX', 'Chevron Corporation', 'NYSE', 'Oil & Gas', 'United States', '$310B', 'https://logo.clearbit.com/chevron.com?size=128'),
  c('SHEL', 'Shell plc', 'NYSE', 'Oil & Gas', 'United Kingdom', '$210B', 'https://logo.clearbit.com/shell.com?size=128'),
  c('TM', 'Toyota Motor Corporation', 'NYSE', 'Automotive', 'Japan', '$230B', 'https://logo.clearbit.com/toyota.com?size=128'),

  c('BYDDF', 'BYD Company Limited', 'OTC', 'Automotive / Clean Energy', 'China', '$95B', 'https://logo.clearbit.com/byd.com?size=128'),
  c('VWAGY', 'Volkswagen AG', 'OTC', 'Automotive', 'Germany', '$60B', 'https://logo.clearbit.com/volkswagen.com?size=128'),
  c('NSRGY', 'Nestle SA', 'OTC', 'Consumer Goods', 'Switzerland', '$320B', 'https://logo.clearbit.com/nestle.com?size=128'),
  c('TTE', 'TotalEnergies SE', 'NYSE', 'Oil & Gas', 'France', '$170B', 'https://logo.clearbit.com/totalenergies.com?size=128'),
  c('BP', 'BP p.l.c.', 'NYSE', 'Oil & Gas', 'United Kingdom', '$115B', 'https://logo.clearbit.com/bp.com?size=128'),

  c('ASML', 'ASML Holding N.V.', 'NASDAQ', 'Semiconductors', 'Netherlands', '$500B', 'https://logo.clearbit.com/asml.com?size=128'),
  c('SAP', 'SAP SE', 'NYSE', 'Enterprise Software', 'Germany', '$250B', 'https://logo.clearbit.com/sap.com?size=128'),
  c('ORCL', 'Oracle Corporation', 'NYSE', 'Enterprise Software', 'United States', '$420B', 'https://logo.clearbit.com/oracle.com?size=128'),
  c('IBM', 'International Business Machines Corp.', 'NYSE', 'Technology', 'United States', '$220B', 'https://logo.clearbit.com/ibm.com?size=128'),
  c('CSCO', 'Cisco Systems, Inc.', 'NASDAQ', 'Networking', 'United States', '$280B', 'https://logo.clearbit.com/cisco.com?size=128'),

  c('NKE', 'NIKE, Inc.', 'NYSE', 'Consumer Goods', 'United States', '$170B', 'https://logo.clearbit.com/nike.com?size=128'),
  c('MCD', 'McDonald\'s Corporation', 'NYSE', 'Consumer Services', 'United States', '$210B', 'https://logo.clearbit.com/mcdonalds.com?size=128'),
  c('SBUX', 'Starbucks Corporation', 'NASDAQ', 'Consumer Services', 'United States', '$130B', 'https://logo.clearbit.com/starbucks.com?size=128'),
  c('PEP', 'PepsiCo, Inc.', 'NASDAQ', 'Consumer Goods', 'United States', '$250B', 'https://logo.clearbit.com/pepsico.com?size=128'),

  c('PFE', 'Pfizer Inc.', 'NYSE', 'Healthcare', 'United States', '$170B', 'https://logo.clearbit.com/pfizer.com?size=128'),
  c('JNJ', 'Johnson & Johnson', 'NYSE', 'Healthcare', 'United States', '$420B', 'https://logo.clearbit.com/jnj.com?size=128'),
  c('UNH', 'UnitedHealth Group Incorporated', 'NYSE', 'Healthcare', 'United States', '$520B', 'https://logo.clearbit.com/unitedhealthgroup.com?size=128'),
  c('ABBV', 'AbbVie Inc.', 'NYSE', 'Healthcare', 'United States', '$320B', 'https://logo.clearbit.com/abbvie.com?size=128'),

  c('BABA', 'Alibaba Group Holding Limited', 'NYSE', 'Technology / E-Commerce', 'China', '$210B', 'https://logo.clearbit.com/alibaba.com?size=128'),
  c('NIO', 'NIO Inc.', 'NYSE', 'Automotive / EV', 'China', '$12B', 'https://logo.clearbit.com.nio.com?size=128'),
  c('TMC', 'TMC The Metals Company Inc.', 'NASDAQ', 'Materials / Deep Sea Metals', 'Canada', '$0.6B', 'https://logo.clearbit.com/metals.co?size=128'),
  c('TSM', 'Taiwan Semiconductor Manufacturing Company', 'NYSE', 'Semiconductors', 'Taiwan', '$1.0T', 'https://logo.clearbit.com/tsmc.com?size=128'),
  c('SONY', 'Sony Group Corporation', 'NYSE', 'Technology / Media', 'Japan', '$150B', 'https://logo.clearbit.com/sony.com?size=128'),
  c('HMC', 'Honda Motor Co., Ltd.', 'NYSE', 'Automotive', 'Japan', '$80B', 'https://logo.clearbit.com/honda.com?size=128'),

  c('SIEGY', 'Siemens AG', 'OTC', 'Industrial Technology', 'Germany', '$170B', 'https://logo.clearbit.com/siemens.com?size=128'),
  c('UL', 'Unilever PLC', 'NYSE', 'Consumer Goods', 'United Kingdom', '$140B', 'https://logo.clearbit.com/unilever.com?size=128'),
  c('ENB', 'Enbridge Inc.', 'NYSE', 'Energy Infrastructure', 'Canada', '$85B', 'https://logo.clearbit.com/enbridge.com?size=128'),
  c('STLA', 'Stellantis N.V.', 'NYSE', 'Automotive', 'Netherlands', '$60B', 'https://logo.clearbit.com/stellantis.com?size=128'),
  c('BMWYY', 'BMW AG', 'OTC', 'Automotive', 'Germany', '$65B', 'https://logo.clearbit.com/bmwgroup.com?size=128'),
  c('INFY', 'Infosys Limited', 'NYSE', 'Technology Services', 'India', '$80B', 'https://logo.clearbit.com/infosys.com?size=128'),
  c('RIO', 'Rio Tinto Group', 'NYSE', 'Materials / Mining', 'United Kingdom', '$120B', 'https://logo.clearbit.com/riotinto.com?size=128'),
  c('BHP', 'BHP Group Limited', 'NYSE', 'Materials / Mining', 'Australia', '$150B', 'https://logo.clearbit.com/bhp.com?size=128'),
  c('Z74.SI', 'Singapore Telecommunications Limited', 'SGX', 'Telecommunications', 'Singapore', '$28B', 'https://logo.clearbit.com/singtel.com?size=128'),
]

const byTicker = new Map(COMPANY_CATALOG.map(item => [item.ticker.toUpperCase(), item]))

export function findCatalogByTicker(ticker: string): CatalogCompany | undefined {
  return byTicker.get(ticker.trim().toUpperCase())
}

export function searchCatalog(query: string): CatalogCompany[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return COMPANY_CATALOG.filter(item =>
    item.ticker.toLowerCase().includes(q)
    || item.name.toLowerCase().includes(q)
    || item.exchange.toLowerCase().includes(q)
    || item.industry.toLowerCase().includes(q)
    || item.country.toLowerCase().includes(q)
  )
}

export function mergeCompanyPayload(base: Partial<Company>, fromCatalog?: CatalogCompany): Partial<Company> {
  if (!fromCatalog) return base
  return {
    ...base,
    name: base.name || fromCatalog.name,
    ticker: base.ticker || fromCatalog.ticker,
    exchange: (base as any).exchange || fromCatalog.exchange,
    industry: base.industry || fromCatalog.industry,
    country: base.country || fromCatalog.country,
    market_cap: base.market_cap || fromCatalog.market_cap || null,
    logo_url: base.logo_url || fromCatalog.logo_url || null,
  }
}
