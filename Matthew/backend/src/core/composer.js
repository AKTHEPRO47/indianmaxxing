'use strict';

const { TriggerType } = require('../config');

// Event shape (the data contract with the AI model / market feed):
// { userId, ticker, stockName, triggerType, data, aiContext, deepLink }

const HUMAN_LABEL = {
  [TriggerType.PRICE_ALERT]: 'Price Alert',
  [TriggerType.VOLUME_ALERT]: 'Volume Alert',
  [TriggerType.EARNINGS_ALERT]: 'Earnings Alert',
  [TriggerType.TREND_BREAK_ALERT]: 'Trend Break Alert',
  [TriggerType.REVERSAL_SIGNAL]: 'Reversal Signal',
  [TriggerType.AI_STOCK_SUGGESTION]: 'AI Stock Suggestion',
};

function labelFor(triggerType) {
  return HUMAN_LABEL[triggerType] || 'Alert';
}

function dataFields(data = {}) {
  const fields = [];
  if (data.currentPrice != null) fields.push({ name: 'Price', value: String(data.currentPrice), inline: true });
  if (data.changePct != null) {
    fields.push({ name: 'Move', value: `${data.changePct > 0 ? '+' : ''}${data.changePct}%`, inline: true });
  }
  if (data.volumeVsAvg != null) fields.push({ name: 'Volume', value: `${data.volumeVsAvg}× avg`, inline: true });
  if (data.earningsResult) fields.push({ name: 'Earnings', value: String(data.earningsResult), inline: true });
  if (data.level) fields.push({ name: 'Level', value: String(data.level), inline: true });
  return fields;
}

function renderData(data = {}) {
  return dataFields(data).map((f) => `${f.name}: ${f.value}`).join(' · ');
}

function composePlainText(event) {
  const lines = [
    `${labelFor(event.triggerType)}: ${event.stockName} (${event.ticker})`,
    renderData(event.data),
    event.aiContext ? `\n${event.aiContext}` : '',
    event.deepLink ? `\nView analysis: ${event.deepLink}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function composeHtml(event) {
  const label = escapeHtml(labelFor(event.triggerType));
  const dataLine = escapeHtml(renderData(event.data));
  const context = event.aiContext
    ? escapeHtml(event.aiContext).replace(/\n/g, '<br>')
    : '';
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px">
      <h2 style="margin:0 0 4px">${label}</h2>
      <p style="margin:0 0 8px"><strong>${escapeHtml(event.stockName)}</strong> (${escapeHtml(event.ticker)})</p>
      ${dataLine ? `<p style="margin:0 0 8px;color:#444">${dataLine}</p>` : ''}
      ${context ? `<p style="margin:0 0 12px">${context}</p>` : ''}
      ${event.deepLink ? `<a href="${escapeHtml(event.deepLink)}"
          style="display:inline-block;padding:8px 14px;background:#1a73e8;color:#fff;
                 text-decoration:none;border-radius:6px">View analysis</a>` : ''}
    </div>`.trim();
}

const GREEN = 0x2ecc71;
const RED = 0xe74c3c;
const BLUE = 0x3498db;

function embedColour(event) {
  const pct = event.data?.changePct;
  if (typeof pct === 'number') return pct >= 0 ? GREEN : RED;
  return BLUE;
}

// Discord embed limits: title 256, description 4096, 25 fields.
function composeDiscordEmbed(event) {
  const embed = {
    title: `${labelFor(event.triggerType)}: ${event.stockName} (${event.ticker})`.slice(0, 256),
    color: embedColour(event),
    fields: dataFields(event.data).slice(0, 25),
    timestamp: new Date().toISOString(),
    footer: { text: 'SGX Stock Tool' },
  };
  if (event.aiContext) embed.description = String(event.aiContext).slice(0, 4096);
  if (event.deepLink) embed.url = event.deepLink;
  return embed;
}

function subjectFor(event) {
  return `${labelFor(event.triggerType)}: ${event.stockName} (${event.ticker})`;
}

module.exports = {
  labelFor,
  composePlainText,
  composeHtml,
  composeDiscordEmbed,
  subjectFor,
};
