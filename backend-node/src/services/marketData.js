'use strict';

const axios = require('axios');

const STOCK_RANGE_MAP = {
  '1m':  { period: '5d',  interval: '1m'  },
  '5m':  { period: '5d',  interval: '5m'  },
  '1d':  { period: '1mo', interval: '1d'  },
  '1w':  { period: '3mo', interval: '1d'  },
  '1mo': { period: '6mo', interval: '1d'  },
  '1y':  { period: '1y',  interval: '1d'  },
  'max': { period: 'max', interval: '1wk' },
};

function cleanNumber(value) {
  if (value == null) return null;
  const n = parseFloat(value);
  return isNaN(n) || !isFinite(n) ? null : n;
}

function normalizeYahooTicker(symbol) {
  const ticker = symbol.toUpperCase();
  return /\.(SI|AX|TO|L|HK|NS|BO|DE|PA|AS|SW|MI|MC|BR|SA|T|KS|KQ|SS|SZ)$/.test(ticker)
    ? ticker
    : ticker.replace('.', '-');
}

/**
 * Fetch OHLCV stock data from Yahoo Finance v8 API.
 */
async function fetchStockData(symbol, rangeKey = '1mo') {
  const config = STOCK_RANGE_MAP[rangeKey] || STOCK_RANGE_MAP['1mo'];
  const ticker = normalizeYahooTicker(symbol);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;

  try {
    const response = await axios.get(url, {
      params: {
        range: config.period,
        interval: config.interval,
      },
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    const result = response.data?.chart?.result?.[0];
    if (!result) return { symbol: ticker, prices: [], error: 'No data returned' };

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};

    const prices = timestamps.map((t, i) => ({
      timestamp: new Date(t * 1000).toISOString(),
      open: cleanNumber(quotes.open?.[i]),
      high: cleanNumber(quotes.high?.[i]),
      low: cleanNumber(quotes.low?.[i]),
      close: cleanNumber(quotes.close?.[i]),
      volume: cleanNumber(quotes.volume?.[i]),
    })).filter(p => p.close != null);

    const meta = result.meta || {};
    return {
      symbol: ticker,
      currency: meta.currency,
      exchangeName: meta.exchangeName,
      currentPrice: cleanNumber(meta.regularMarketPrice),
      previousClose: cleanNumber(meta.chartPreviousClose),
      range: rangeKey,
      interval: config.interval,
      prices,
    };
  } catch (err) {
    // Return empty data rather than crashing
    return { symbol: ticker, prices: [], error: err.message };
  }
}

/**
 * Fetch financial profile (PE, market cap, etc.) from Yahoo Finance.
 */
async function fetchFinancialProfile(symbol) {
  const ticker = normalizeYahooTicker(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;

  try {
    const response = await axios.get(url, {
      params: { interval: '1d', range: '5d' },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    const meta = response.data?.chart?.result?.[0]?.meta || {};
    return {
      marketCap: cleanNumber(meta.marketCap),
      currentPrice: cleanNumber(meta.regularMarketPrice),
      previousClose: cleanNumber(meta.chartPreviousClose),
      currency: meta.currency || 'USD',
      exchangeName: meta.exchangeName || '',
    };
  } catch {
    return { marketCap: null, currentPrice: null, previousClose: null };
  }
}

module.exports = { fetchStockData, fetchFinancialProfile };
