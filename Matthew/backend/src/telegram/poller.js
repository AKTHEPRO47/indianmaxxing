'use strict';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Dev-mode alternative to webhooks (no public HTTPS URL needed).
// Don't run this while a webhook is set — Telegram allows only one.
function startPolling({ botToken, onUpdate, errorBackoffMs = 3000 }) {
  let offset = 0;
  let running = true;

  (async () => {
    while (running) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/getUpdates?timeout=25&offset=${offset}`
        );
        const json = await res.json();
        for (const u of json.result || []) {
          offset = u.update_id + 1;
          await onUpdate(u).catch(() => {});
        }
      } catch {
        await sleep(errorBackoffMs);
      }
    }
  })();

  return () => { running = false; };
}

module.exports = { startPolling };
