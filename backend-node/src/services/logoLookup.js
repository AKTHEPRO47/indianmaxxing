'use strict';

/**
 * Returns a Clearbit-based logo URL for a stock ticker.
 * Falls back gracefully if ticker or domain is not found.
 */

const TICKER_DOMAIN_MAP = {
  AAPL: 'apple.com', MSFT: 'microsoft.com', GOOGL: 'google.com',
  AMZN: 'amazon.com', TSLA: 'tesla.com', META: 'meta.com',
  NVDA: 'nvidia.com', BRK: 'berkshirehathaway.com', JPM: 'jpmorgan.com',
  JNJ: 'jnj.com', V: 'visa.com', PG: 'pg.com', MA: 'mastercard.com',
  UNH: 'unitedhealthgroup.com', HD: 'homedepot.com', CVX: 'chevron.com',
  XOM: 'exxonmobil.com', ABBV: 'abbvie.com', PFE: 'pfizer.com',
  MRK: 'merck.com', KO: 'coca-cola.com', PEP: 'pepsico.com',
  COST: 'costco.com', TMO: 'thermofisher.com', AVGO: 'broadcom.com',
  SHEL: 'shell.com', TM: 'toyota.com', BYDDF: 'byd.com',
  SPACEX: 'spacex.com', NFLX: 'netflix.com', DIS: 'disney.com',
  UBER: 'uber.com', LYFT: 'lyft.com', SNAP: 'snapchat.com',
  TWTR: 'twitter.com', SPOT: 'spotify.com', SHOP: 'shopify.com',
};

function logoUrlForTicker(ticker) {
  if (!ticker) return null;
  const domain = TICKER_DOMAIN_MAP[ticker.toUpperCase()];
  if (!domain) {
    // Best-effort: lowercase ticker as domain
    return `https://logo.clearbit.com/${ticker.toLowerCase()}.com?size=128`;
  }
  return `https://logo.clearbit.com/${domain}?size=128`;
}

module.exports = { logoUrlForTicker };
