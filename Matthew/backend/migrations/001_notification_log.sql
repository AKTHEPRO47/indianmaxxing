CREATE TABLE IF NOT EXISTS notification_log (
  id            BIGSERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  ticker        VARCHAR(20) NOT NULL,
  trigger_type  VARCHAR(30) NOT NULL,
  status        VARCHAR(20) NOT NULL,      -- delivered / failed / suppressed / skipped
  delivery_mode VARCHAR(10),
  delivered_via JSONB,
  attempts      JSONB,
  reason        VARCHAR(50),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_log_user_time
  ON notification_log (user_id, created_at DESC);
