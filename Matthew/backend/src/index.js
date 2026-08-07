'use strict';

const { Dispatcher } = require('./core/dispatcher');
const { InMemoryCooldownStore } = require('./core/cooldown');
const { createPgLogger } = require('./core/pgLogger');
const { createLinking } = require('./telegram/linking');
const { createDiscordLinking } = require('./discord/linking');
const { startPolling } = require('./telegram/poller');
const { notificationRoutes } = require('./api/notifications');
const { telegramRoutes } = require('./api/telegram');
const { discordRoutes } = require('./api/discord');
const { TriggerType, Channel, availableChannels } = require('./config');

module.exports = {
  Dispatcher,
  InMemoryCooldownStore,
  createPgLogger,
  createLinking,
  createDiscordLinking,
  startPolling,
  notificationRoutes,
  telegramRoutes,
  discordRoutes,
  TriggerType,
  Channel,
  availableChannels,
};
