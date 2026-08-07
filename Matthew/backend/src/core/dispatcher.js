'use strict';

const { config, Channel, FALLBACK_ORDER, availableChannels } = require('../config');
const { InMemoryCooldownStore } = require('./cooldown');
const { labelFor } = require('./composer');

const channelSenders = {
  [Channel.DISCORD]: require('../channels/discord').send,
  [Channel.TELEGRAM]: require('../channels/telegram').send,
  [Channel.EMAIL]: require('../channels/email').send,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Settings shape per user:
// { channelByTrigger: {TRIGGER: [CHANNEL,...]}, recipient: {...},
//   deliveryMode?: 'failover' | 'broadcast', perStockOverrides?: {ticker: {...}} }
class Dispatcher {
  constructor({ userSettingsProvider, cooldownStore, logger } = {}) {
    if (!userSettingsProvider) throw new Error('userSettingsProvider is required');
    this.userSettings = userSettingsProvider;
    this.cooldown = cooldownStore || new InMemoryCooldownStore();
    this.log = logger || ((rec) => console.log('[notify]', JSON.stringify(rec)));
    this.queues = new Map();
  }

  _channelsFor(settings, event) {
    const override = settings.perStockOverrides?.[event.ticker]?.channelByTrigger;
    const map = override || settings.channelByTrigger || {};
    const chosen = map[event.triggerType];
    if (!chosen || chosen.length === 0) return [];
    return FALLBACK_ORDER.filter((c) => chosen.includes(c));
  }

  async _sendWithRetries(channel, event, recipient) {
    const send = channelSenders[channel];
    let lastErr;
    for (let attempt = 1; attempt <= config.rules.maxRetriesPerChannel; attempt++) {
      try {
        const result = await send(event, recipient);
        return { ok: true, attempts: attempt, providerMessageId: result.providerMessageId };
      } catch (err) {
        lastErr = err;
        if (attempt < config.rules.maxRetriesPerChannel) {
          await sleep(config.rules.retryBackoffMs * attempt);
        }
      }
    }
    return { ok: false, attempts: config.rules.maxRetriesPerChannel, error: lastErr?.message };
  }

  async dispatch(event, now = Date.now()) {
    const settings = await this.userSettings.getSettings(event.userId);
    if (!settings) {
      return this._record(event, { status: 'skipped', reason: 'no_user_settings' });
    }

    // Digests bypass their own cooldown check; constituents were filtered
    // at flush time and each enters cooldown on delivery.
    const isDigest = event._isDigest === true;
    if (!isDigest && this.cooldown.isCoolingDown(event.userId, event.ticker, event.triggerType, now)) {
      return this._record(event, { status: 'suppressed', reason: 'cooldown' });
    }

    let channels = this._channelsFor(settings, event);
    if (channels.length === 0) {
      return this._record(event, { status: 'skipped', reason: 'no_channel_for_trigger' });
    }

    const usable = new Set(availableChannels());
    channels = channels.filter((c) => usable.has(c));
    if (channels.length === 0) {
      return this._record(event, { status: 'skipped', reason: 'no_configured_channel' });
    }

    // 'failover': stop at first success. 'broadcast': send to every selected channel.
    const mode = settings.deliveryMode === 'broadcast' ? 'broadcast' : 'failover';

    const attempts = [];
    const deliveredVia = [];

    for (const channel of channels) {
      const outcome = await this._sendWithRetries(channel, event, settings.recipient);
      attempts.push({ channel, ...outcome });
      if (outcome.ok) {
        deliveredVia.push({ channel, providerMessageId: outcome.providerMessageId });
        if (mode === 'failover') break;
      }
    }

    if (deliveredVia.length > 0) {
      if (isDigest) {
        for (const c of event._constituents || []) {
          this.cooldown.markSent(c.userId, c.ticker, c.triggerType, now);
        }
      } else {
        this.cooldown.markSent(event.userId, event.ticker, event.triggerType, now);
      }
      return this._record(event, {
        status: 'delivered',
        mode,
        channel: deliveredVia[0].channel,
        deliveredVia,
        providerMessageId: deliveredVia[0].providerMessageId,
        attempts,
      });
    }

    return this._record(event, { status: 'failed', mode, reason: 'all_channels_failed', attempts });
  }

  enqueue(event, windowMs = 3000) {
    if (!this.queues.has(event.userId)) {
      this.queues.set(event.userId, { events: [], timer: null });
    }
    const q = this.queues.get(event.userId);
    q.events.push(event);
    if (!q.timer) {
      q.timer = setTimeout(() => {
        this._flush(event.userId).catch((err) =>
          this.log({
            ts: new Date().toISOString(),
            userId: event.userId,
            status: 'error',
            reason: 'flush_failed',
            error: err?.message,
          })
        );
      }, windowMs);
    }
  }

  async _flush(userId) {
    const q = this.queues.get(userId);
    if (!q) return;
    this.queues.delete(userId);

    const now = Date.now();
    const fresh = [];
    for (const e of q.events) {
      if (this.cooldown.isCoolingDown(e.userId, e.ticker, e.triggerType, now)) {
        this._record(e, { status: 'suppressed', reason: 'cooldown' });
      } else {
        fresh.push(e);
      }
    }

    if (fresh.length === 0) return;
    if (fresh.length === 1) return this.dispatch(fresh[0], now);
    return this.dispatch(this._buildDigest(fresh), now);
  }

  _buildDigest(events) {
    const first = events[0];
    const lines = events.map(
      (e) => `• ${labelFor(e.triggerType)}: ${e.stockName} (${e.ticker})`
    );
    return {
      userId: first.userId,
      ticker: 'DIGEST',
      stockName: `${events.length} alerts`,
      triggerType: first.triggerType,
      data: {},
      aiContext: lines.join('\n'),
      deepLink: first.deepLink,
      _isDigest: true,
      _constituents: events,
    };
  }

  _record(event, outcome) {
    const record = {
      ts: new Date().toISOString(),
      userId: event.userId,
      ticker: event.ticker,
      triggerType: event.triggerType,
      ...outcome,
    };
    this.log(record);
    return record;
  }
}

module.exports = { Dispatcher };
