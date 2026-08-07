ALTER TABLE users
  ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;
