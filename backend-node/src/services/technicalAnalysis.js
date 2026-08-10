'use strict';

const prisma = require('../database');
const marketData = require('./marketData');
const scoringService = require('./scoring');
const { notifyWatchersOfSignal } = require('./watchlistSignalNotifications');

const SOURCE = 'Yahoo Finance Technical Analysis';

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sma(values, period) {
  return values.map((_, index) => index < period - 1 ? null : average(values.slice(index - period + 1, index + 1)));
}

function ema(values, period) {
  const result = Array(values.length).fill(null);
  if (values.length < period) return result;
  const multiplier = 2 / (period + 1);
  result[period - 1] = average(values.slice(0, period));
  for (let index = period; index < values.length; index += 1) {
    result[index] = (values[index] - result[index - 1]) * multiplier + result[index - 1];
  }
  return result;
}

function rsi(values, period = 14) {
  const result = Array(values.length).fill(null);
  if (values.length <= period) return result;

  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }
  let averageGain = gains / period;
  let averageLoss = losses / period;
  result[period] = averageLoss === 0 ? 100 : 100 - (100 / (1 + averageGain / averageLoss));

  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
    result[index] = averageLoss === 0 ? 100 : 100 - (100 / (1 + averageGain / averageLoss));
  }
  return result;
}

function analyzePriceHistory(prices) {
  const closes = prices.map(point => point.close).filter(value => Number.isFinite(value));
  const volumes = prices.map(point => point.volume).filter(value => Number.isFinite(value));
  if (closes.length < 60) return { indicators: null, events: [] };

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const rsi14 = rsi(closes, 14);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macd = closes.map((_, index) => ema12[index] != null && ema26[index] != null ? ema12[index] - ema26[index] : null);
  const macdValues = macd.filter(value => value != null);
  const macdSignalValues = ema(macdValues, 9);
  const macdSignal = Array(closes.length).fill(null);
  let macdIndex = 0;
  for (let index = 0; index < macd.length; index += 1) {
    if (macd[index] != null) macdSignal[index] = macdSignalValues[macdIndex++];
  }

  const latest = closes.length - 1;
  const previous = latest - 1;
  const lastPrice = closes[latest];
  const priceChangePercent = ((lastPrice - closes[previous]) / closes[previous]) * 100;
  const latestVolume = prices[prices.length - 1]?.volume ?? null;
  const priorVolumes = prices.slice(-21, -1).map(point => point.volume).filter(value => Number.isFinite(value));
  const averageVolume20 = priorVolumes.length ? average(priorVolumes) : null;
  const events = [];

  if (sma20[previous] != null && sma50[previous] != null && sma20[latest] != null && sma50[latest] != null) {
    if (sma20[previous] <= sma50[previous] && sma20[latest] > sma50[latest]) {
      events.push({ key: 'golden_cross', title: 'Golden cross confirmed', sentiment: 'positive', severity: 0, explanation: 'The 20-day moving average crossed above the 50-day moving average, confirming improving medium-term price momentum.' });
    }
    if (sma20[previous] >= sma50[previous] && sma20[latest] < sma50[latest]) {
      events.push({ key: 'death_cross', title: 'Death cross confirmed', sentiment: 'negative', severity: 5, explanation: 'The 20-day moving average crossed below the 50-day moving average, indicating weakening medium-term price momentum.' });
    }
  }

  if (macd[previous] != null && macdSignal[previous] != null && macd[latest] != null && macdSignal[latest] != null) {
    if (macd[previous] <= macdSignal[previous] && macd[latest] > macdSignal[latest]) {
      events.push({ key: 'macd_bullish_cross', title: 'MACD bullish crossover', sentiment: 'positive', severity: 0, explanation: 'MACD crossed above its signal line, indicating positive short-term price momentum.' });
    }
    if (macd[previous] >= macdSignal[previous] && macd[latest] < macdSignal[latest]) {
      events.push({ key: 'macd_bearish_cross', title: 'MACD bearish crossover', sentiment: 'negative', severity: 4, explanation: 'MACD crossed below its signal line, indicating deteriorating short-term price momentum.' });
    }
  }

  if (rsi14[previous] != null && rsi14[latest] != null) {
    if (rsi14[previous] < 30 && rsi14[latest] >= 30) {
      events.push({ key: 'rsi_oversold_recovery', title: 'RSI recovered from oversold', sentiment: 'positive', severity: 0, explanation: `RSI(14) recovered above 30 to ${rsi14[latest].toFixed(1)}, signaling a potential reversal from oversold conditions.` });
    }
    if (rsi14[previous] > 70 && rsi14[latest] <= 70) {
      events.push({ key: 'rsi_overbought_reversal', title: 'RSI reversed from overbought', sentiment: 'negative', severity: 3, explanation: `RSI(14) fell below 70 to ${rsi14[latest].toFixed(1)}, signaling fading momentum after overbought conditions.` });
    }
  }

  if (latestVolume != null && averageVolume20 != null && latestVolume >= averageVolume20 * 1.5 && Math.abs(priceChangePercent) >= 2) {
    const bullish = priceChangePercent > 0;
    events.push({
      key: bullish ? 'high_volume_breakout' : 'high_volume_selloff',
      title: bullish ? 'High-volume upside breakout' : 'High-volume downside break',
      sentiment: bullish ? 'positive' : 'negative',
      severity: bullish ? 0 : 5,
      explanation: `Price moved ${priceChangePercent.toFixed(2)}% on volume ${(latestVolume / averageVolume20).toFixed(1)}x its prior 20-session average.`,
    });
  }

  return {
    indicators: {
      lastPrice,
      sma20: sma20[latest],
      sma50: sma50[latest],
      rsi14: rsi14[latest],
      macd: macd[latest],
      macdSignal: macdSignal[latest],
      priceChangePercent,
      averageVolume20,
      latestVolume,
    },
    events,
  };
}

async function scanCompanyTechnical(company) {
  if (!company.ticker) return { companyId: company.id, indicators: null, createdSignals: [] };
  const market = await marketData.fetchStockData(company.ticker, '1y');
  const analysis = analyzePriceHistory(market.prices);
  const latestDate = market.prices.at(-1)?.timestamp ?? new Date().toISOString();
  const createdSignals = [];

  for (const event of analysis.events) {
    const existing = await prisma.signal.findFirst({
      where: { companyId: company.id, title: event.title, source: SOURCE, date: latestDate },
      select: { id: true },
    });
    if (existing) continue;

    const signal = await prisma.signal.create({
      data: {
        companyId: company.id,
        title: event.title,
        category: 'technical',
        sentiment: event.sentiment,
        severity: event.severity,
        date: latestDate,
        source: SOURCE,
        explanation: event.explanation,
        confidenceScore: 0.9,
      },
    });
    createdSignals.push(signal);
    await notifyWatchersOfSignal({ company, signal }).catch(error => {
      console.warn(`[Notifications] Technical signal ${signal.id}: ${error.message}`);
    });
  }

  if (createdSignals.length) await scoringService.calculateScores(company.id);
  return { companyId: company.id, indicators: analysis.indicators, createdSignals };
}

async function scanWatchedCompanies(limit = 15) {
  const watched = await prisma.userWatchlistItem.findMany({
    distinct: ['companyId'],
    select: { company: { select: { id: true, name: true, ticker: true } } },
    take: Math.min(Math.max(Number(limit) || 15, 1), 25),
  });
  const results = [];
  for (const { company } of watched) {
    try {
      results.push(await scanCompanyTechnical(company));
    } catch (error) {
      console.warn(`[Technical] ${company.ticker || company.id}: ${error.message}`);
    }
  }
  return results;
}

module.exports = { analyzePriceHistory, scanCompanyTechnical, scanWatchedCompanies };