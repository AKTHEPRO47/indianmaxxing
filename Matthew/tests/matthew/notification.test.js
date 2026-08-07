'use strict';

const path = require('path');
const BASE = path.join(__dirname, '..', '..', 'backend', 'src');
const load = (p) => require(path.join(BASE, p));


/**
 * Offline logic test — proves routing, retry/fallback, cooldown and
 * batching WITHOUT sending real messages. It monkey-patches the channel
 * senders with mocks so no credentials are needed.
 *
 * Run:  node test.js
 */

// Mocks channels so no credentials are needed.
const Module = require('module');
const origRequire = Module.prototype.require;

const calls = { DISCORD: 0, TELEGRAM: 0, EMAIL: 0 };
let discordShouldFail = false;

Module.prototype.require = function (id) {
  if (id === 'yahoo-finance2') {
    return { default: class { constructor() {} async quote(t) { return global.__quotes[t] ?? (() => { throw new Error('no quote'); })(); } } };
  }

  if (id.endsWith('channels/discord')) {
    return { send: async () => { calls.DISCORD++; if (discordShouldFail) throw new Error('mock Discord fail'); return { channel: 'DISCORD', providerMessageId: 'dc-1' }; } };
  }
  if (id.endsWith('channels/telegram')) {
    return { send: async () => { calls.TELEGRAM++; return { channel: 'TELEGRAM', providerMessageId: 'tg-1' }; } };
  }
  if (id.endsWith('channels/email')) {
    return { send: async () => { calls.EMAIL++; return { channel: 'EMAIL', providerMessageId: 'em-1' }; } };
  }
  return origRequire.call(this, id);
};



process.env.TELEGRAM_BOT_TOKEN = 'x';
process.env.GMAIL_USER = 'x@x.com';
process.env.GMAIL_APP_PASSWORD = 'x';

const { Dispatcher } = load('core/dispatcher');
const { TriggerType, Channel } = load('config');

const logs = [];
const settings = {
  getSettings: async () => ({
    channelByTrigger: {
      [TriggerType.PRICE_ALERT]: [Channel.DISCORD, Channel.TELEGRAM, Channel.EMAIL],
    },
    recipient: { discordWebhookUrl: 'https://discordapp.com/api/webhooks/1533702792345288875/v7My6hLaVdgRcyCLgw_72zoLQGOTulEKt_n3jhbWhvVTvPpao_GAlAXaWVuauOMIx3ai', telegramChatId: '123', email: 'u@x.com' },
  }),
};

function makeEvent(over = {}) {
  return {
    userId: 1, ticker: 'D05.SI', stockName: 'DBS Group', triggerType: TriggerType.PRICE_ALERT,
    data: { currentPrice: 39.8, changePct: 6.4 }, aiContext: 'Up 6.4% today', deepLink: 'https://x/y',
    ...over,
  };
}

let passed = 0, failed = 0;
function assert(name, cond) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}`); }
}

(async () => {
  console.log('\nTest 1: happy path routes to primary (Discord)');
  let d = new Dispatcher({ userSettingsProvider: settings, logger: (r) => logs.push(r) });
  let rec = await d.dispatch(makeEvent());
  assert('delivered', rec.status === 'delivered');
  assert('via Discord', rec.channel === Channel.DISCORD);

  console.log('\nTest 2: cooldown suppresses a repeat within 24h');
  rec = await d.dispatch(makeEvent());
  assert('suppressed by cooldown', rec.status === 'suppressed' && rec.reason === 'cooldown');

  console.log('\nTest 3: retry 3× then fall back to Telegram when Discord fails');
  discordShouldFail = true;
  d = new Dispatcher({ userSettingsProvider: settings, logger: () => {} });
  calls.DISCORD = calls.TELEGRAM = 0;
  rec = await d.dispatch(makeEvent({ userId: 2 }));
  assert('Discord tried 3 times', calls.DISCORD === 3);
  assert('fell back to Telegram', rec.channel === Channel.TELEGRAM && rec.status === 'delivered');
  discordShouldFail = false;

  console.log('\nTest 4: batching collapses 3 simultaneous events into 1 delivery');
  const delivered = [];
  d = new Dispatcher({ userSettingsProvider: settings, logger: (r) => delivered.push(r) });
  d.enqueue(makeEvent({ userId: 3, ticker: 'D05.SI' }), 100);
  d.enqueue(makeEvent({ userId: 3, ticker: 'U11.SI', stockName: 'UOB' }), 100);
  d.enqueue(makeEvent({ userId: 3, ticker: 'O39.SI', stockName: 'OCBC' }), 100);
  await new Promise((r) => setTimeout(r, 250));
  assert('single digest delivery for 3 events', delivered.length === 1);
  assert('digest marked as DIGEST ticker', delivered[0].ticker === 'DIGEST');

  console.log('\nTest 5: digest puts each constituent stock into cooldown');
  // Same dispatcher as Test 4 — U11.SI was in the digest, so an individual
  // event for it must now be suppressed.
  rec = await d.dispatch(makeEvent({ userId: 3, ticker: 'U11.SI', stockName: 'UOB' }));
  assert('constituent suppressed after digest', rec.status === 'suppressed' && rec.reason === 'cooldown');
  // ...and a NEW digest for the same user is NOT blocked by a phantom
  // 'DIGEST' cooldown entry (fresh tickers, so it must deliver).
  const delivered2 = [];
  const d2logs = (r) => delivered2.push(r);
  d.log = d2logs;
  d.enqueue(makeEvent({ userId: 3, ticker: 'C6L.SI', stockName: 'SIA' }), 100);
  d.enqueue(makeEvent({ userId: 3, ticker: 'Z74.SI', stockName: 'Singtel' }), 100);
  await new Promise((r) => setTimeout(r, 250));
  const secondDigest = delivered2.find((r) => r.status === 'delivered');
  assert('second digest still delivers (no phantom cooldown)', !!secondDigest);

  console.log('\nTest 6: Discord embed is well-formed');
  const { composeDiscordEmbed } = load('core/composer');
  const up = composeDiscordEmbed(makeEvent());
  const down = composeDiscordEmbed(makeEvent({ data: { currentPrice: 10, changePct: -3.2 } }));
  assert('title includes stock and ticker', /DBS Group \(D05\.SI\)/.test(up.title));
  assert('positive move is green', up.color === 0x2ecc71);
  assert('negative move is red', down.color === 0xe74c3c);
  assert('data rendered as fields', up.fields.some((f) => f.name === 'Price'));
  assert('deep link set as embed url', up.url === 'https://x/y');
  const longCtx = composeDiscordEmbed(makeEvent({ aiContext: 'x'.repeat(5000) }));
  assert('description truncated to 4096', longCtx.description.length === 4096);

  console.log('\nTest 7: broadcast mode delivers to ALL configured channels');
  const broadcastSettings = {
    getSettings: async () => ({
      deliveryMode: 'broadcast',
      channelByTrigger: {
        [TriggerType.PRICE_ALERT]: [Channel.DISCORD, Channel.TELEGRAM, Channel.EMAIL],
      },
      recipient: { discordWebhookUrl: 'https://discord.com/api/webhooks/1/x', telegramChatId: '123', email: 'u@x.com' },
    }),
  };
  d = new Dispatcher({ userSettingsProvider: broadcastSettings, logger: () => {} });
  calls.DISCORD = calls.TELEGRAM = calls.EMAIL = 0;
  rec = await d.dispatch(makeEvent({ userId: 10 }));
  assert('delivered', rec.status === 'delivered');
  assert('all three channels attempted', calls.DISCORD === 1 && calls.TELEGRAM === 1 && calls.EMAIL === 1);
  assert('deliveredVia lists all three', (rec.deliveredVia || []).length === 3);

  console.log('\nTest 8: broadcast still succeeds when one channel fails');
  discordShouldFail = true;
  d = new Dispatcher({ userSettingsProvider: broadcastSettings, logger: () => {} });
  calls.DISCORD = calls.TELEGRAM = calls.EMAIL = 0;
  rec = await d.dispatch(makeEvent({ userId: 11 }));
  assert('delivered despite Discord failing', rec.status === 'delivered');
  assert('Discord retried 3× then others delivered',
    calls.DISCORD === 3 && calls.TELEGRAM === 1 && calls.EMAIL === 1);
  assert('deliveredVia lists the two working channels', (rec.deliveredVia || []).length === 2);
  discordShouldFail = false;

  console.log('\nTest 9: pgLogger writes delivery records to notification_log');
  const { createPgLogger } = load('core/pgLogger');
  const inserts = [];
  const fakePool = { query: async (text, params) => { inserts.push({ text, params }); return { rowCount: 1, rows: [] }; } };
  const pgLog = createPgLogger(fakePool);
  pgLog({ userId: 1, ticker: 'D05.SI', triggerType: 'PRICE_ALERT', status: 'delivered', mode: 'broadcast', deliveredVia: [{ channel: 'EMAIL' }], attempts: [], reason: null });
  await new Promise((r) => setTimeout(r, 10));
  assert('insert issued', inserts.length === 1 && /INSERT INTO notification_log/.test(inserts[0].text));
  assert('params in order', inserts[0].params[0] === 1 && inserts[0].params[3] === 'delivered');

  console.log('\nTest 10: telegram deep-link flow');
  global.fetch = async () => ({ ok: true, json: async () => ({ ok: true }) });
  const { createLinking } = load('telegram/linking');
  const db = { tokens: new Map(), links: new Map() };
  const linkPool = {
    query: async (text, params) => {
      if (/INSERT INTO telegram_link_tokens/.test(text)) {
        db.tokens.set(params[0], { userId: params[1], used: false });
        return { rowCount: 1, rows: [] };
      }
      if (/UPDATE telegram_link_tokens/.test(text)) {
        const t = db.tokens.get(params[0]);
        if (!t || t.used) return { rowCount: 0, rows: [] };
        t.used = true;
        return { rowCount: 1, rows: [{ user_id: t.userId }] };
      }
      if (/INSERT INTO user_telegram_links/.test(text)) {
        db.links.set(params[0], params[1]);
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    },
  };
  const linking = createLinking(linkPool, { botUsername: 'MatthewIco_bot', botToken: 'x' });
  const { token, url } = await linking.createLinkToken(42);
  assert('deep link built', url === `https://t.me/MatthewIco_bot?start=${token}`);
  let out = await linking.handleUpdate({ message: { chat: { id: 8093346607 }, text: `/start ${token}` } });
  assert('valid token links user', out.linked === true && out.userId === 42);
  assert('chat id stored', db.links.get(42) === '8093346607');
  out = await linking.handleUpdate({ message: { chat: { id: 999 }, text: `/start ${token}` } });
  assert('token is single-use', out.linked === false && out.reason === 'bad_token');
  out = await linking.handleUpdate({ message: { chat: { id: 999 }, text: 'hello' } });
  assert('non-start messages ignored', out.handled === false);

  console.log('\nTest 11: discord webhook paste-linking');
  const { createDiscordLinking, parseWebhookUrl } = load('discord/linking');
  assert('valid url parses', parseWebhookUrl('https://discord.com/api/webhooks/123/AbC-dEf_9').ok === true);
  assert('discordapp.com accepted', parseWebhookUrl('https://discordapp.com/api/webhooks/1/x').ok === true);
  assert('versioned path accepted', parseWebhookUrl('https://discord.com/api/v10/webhooks/1/x').ok === true);
  assert('whitespace trimmed', parseWebhookUrl('  https://discord.com/api/webhooks/1/x  ').ok === true);
  assert('random url rejected', parseWebhookUrl('https://evil.com/api/webhooks/1/x').ok === false);
  assert('empty rejected', parseWebhookUrl('').ok === false);

  const users = new Map([[7, null]]);
  const dPool = { query: async (text, params) => {
    if (/SET discord_webhook_url = \$1/.test(text)) { users.set(params[1], params[0]); return { rowCount: 1, rows: [] }; }
    if (/SET discord_webhook_url = NULL/.test(text)) { users.set(params[0], null); return { rowCount: 1, rows: [] }; }
    if (/SELECT discord_webhook_url/.test(text)) return { rowCount: 1, rows: [{ discord_webhook_url: users.get(params[0]) }] };
    return { rowCount: 0, rows: [] };
  }};
  const dLink = createDiscordLinking(dPool);

  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ channel_id: '99', name: 'alerts' }) });
  let r = await dLink.link(7, 'https://discord.com/api/webhooks/123/AbC');
  assert('valid webhook stored', r.ok === true && users.get(7) === 'https://discord.com/api/webhooks/123/AbC');
  assert('status reports linked', (await dLink.status(7)).linked === true);

  r = await dLink.link(7, 'http://notdiscord.com/hook');
  assert('bad url rejected before db write', r.ok === false && r.error === 'not_a_discord_webhook_url');

  global.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
  r = await dLink.link(7, 'https://discord.com/api/webhooks/999/gone');
  assert('deleted webhook rejected', r.ok === false && r.error === 'webhook_not_found');

  await dLink.unlink(7);
  assert('unlink clears url', (await dLink.status(7)).linked === false);

  console.log('\nTest 12: price monitor auto-fires events past threshold');
  const { createPriceMonitor } = load('monitor/priceMonitor');
  global.__quotes = {
    'D05.SI': { regularMarketChangePercent: 6.4, regularMarketPrice: 39.8, shortName: 'DBS Group' },
    'O39.SI': { regularMarketChangePercent: 0.3, regularMarketPrice: 14.2, shortName: 'OCBC' },
  };
  const firedEvents = [];
  const mon = createPriceMonitor({ enqueue: (e) => firedEvents.push(e) }, {
    watchlistProvider: async () => [
      { userId: 1, ticker: 'D05.SI' },
      { userId: 1, ticker: 'O39.SI' },
      { userId: 1, ticker: 'BAD.SI' },
    ],
    thresholdPct: 5,
  });
  const checkResults = await mon.checkOnce();
  assert('big move fires event', firedEvents.length === 1 && firedEvents[0].ticker === 'D05.SI');
  assert('event shape matches contract', firedEvents[0].triggerType === TriggerType.PRICE_ALERT && firedEvents[0].data.changePct === 6.4);
  assert('small move does not fire', checkResults.find((r) => r.ticker === 'O39.SI').fired === false);
  assert('quote failure captured not thrown', !!checkResults.find((r) => r.ticker === 'BAD.SI').error);
  const perStock = createPriceMonitor({ enqueue: (e) => firedEvents.push(e) }, {
    watchlistProvider: async () => [{ userId: 1, ticker: 'O39.SI', thresholdPct: 0.1 }],
    thresholdPct: 5,
  });
  await perStock.checkOnce();
  assert('per-stock threshold override works', firedEvents.some((e) => e.ticker === 'O39.SI'));

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
