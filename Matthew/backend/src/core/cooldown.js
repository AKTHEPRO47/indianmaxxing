'use strict';

const { config } = require('../config');

// In-memory store. For production, back with a Postgres table keyed on
// (user_id, ticker, trigger_type) -> last_sent_at.
class InMemoryCooldownStore {
  constructor() {
    this.lastSent = new Map();
  }

  _key(userId, ticker, triggerType) {
    return `${userId}|${ticker}|${triggerType}`;
  }

  isCoolingDown(userId, ticker, triggerType, now = Date.now()) {
    const last = this.lastSent.get(this._key(userId, ticker, triggerType));
    if (last == null) return false;
    const windowMs = config.rules.cooldownHours * 60 * 60 * 1000;
    return now - last < windowMs;
  }

  markSent(userId, ticker, triggerType, now = Date.now()) {
    this.lastSent.set(this._key(userId, ticker, triggerType), now);
  }
}

module.exports = { InMemoryCooldownStore };
