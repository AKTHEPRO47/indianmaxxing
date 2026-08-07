CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  token      VARCHAR(64) PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_telegram_links (
  user_id   INTEGER PRIMARY KEY REFERENCES users(id),
  chat_id   VARCHAR(32) NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
