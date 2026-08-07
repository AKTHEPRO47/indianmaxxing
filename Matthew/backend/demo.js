'use strict';

// Sends a real alert using your .env. Fill in RECIPIENT below first.

const { Dispatcher, TriggerType, Channel, availableChannels } = require('./src');

const RECIPIENT = {
  telegramChatId: '',       // message your bot first, then check getUpdates
  email: '',
  discordWebhookUrl: '',    // Discord: Channel Settings -> Integrations -> Webhooks
};

// 'broadcast' sends to every selected channel; 'failover' stops at first success.
const settings = {
  getSettings: async () => ({
    deliveryMode: 'broadcast',
    channelByTrigger: {
      [TriggerType.PRICE_ALERT]: [Channel.DISCORD, Channel.TELEGRAM, Channel.EMAIL],
    },
    recipient: RECIPIENT,
  }),
};

const sampleEvent = {
  userId: 1,
  ticker: 'D05.SI',
  stockName: 'DBS Group Holdings',
  triggerType: TriggerType.PRICE_ALERT,
  data: { currentPrice: 39.8, changePct: 6.4, timeframe: 'today' },
  aiContext: 'Up 6.4% today — near 52-week high',
  deepLink: 'https://app.example.com/stock/D05.SI',
};

(async () => {
  const configured = availableChannels();
  console.log('Configured channels:', configured.length ? configured.join(', ') : '(none — fill in .env)');

  const d = new Dispatcher({ userSettingsProvider: settings });
  const record = await d.dispatch(sampleEvent);
  console.log('\nDelivery record:');
  console.log(JSON.stringify(record, null, 2));

  if (record.status === 'delivered') {
    const via = (record.deliveredVia || []).map((x) => x.channel).join(', ') || record.channel;
    console.log(`\n✅ Sent via ${via}. Check those channel(s).`);
  } else {
    console.log(`\n⚠️  Not delivered (${record.reason || 'see attempts'}). ` +
      'Fill in .env credentials and the RECIPIENT block, then retry.');
  }
})();
