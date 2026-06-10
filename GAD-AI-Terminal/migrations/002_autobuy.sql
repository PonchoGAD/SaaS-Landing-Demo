-- Auto-buy jobs table
CREATE TABLE IF NOT EXISTS autobuy_jobs (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  mint_address      TEXT    NOT NULL,
  label             TEXT,
  amount_sol        NUMERIC NOT NULL CHECK (amount_sol > 0),
  slippage_bps      INTEGER NOT NULL DEFAULT 100,
  interval_seconds  INTEGER NOT NULL CHECK (interval_seconds >= 60),
  next_run_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- execution history
  last_run_at       TIMESTAMP WITH TIME ZONE,
  last_tx_signature TEXT,
  total_buys        INTEGER NOT NULL DEFAULT 0,
  total_spent_sol   NUMERIC NOT NULL DEFAULT 0,
  -- error tracking
  error_count       INTEGER NOT NULL DEFAULT 0,
  last_error        TEXT
);

CREATE INDEX IF NOT EXISTS idx_autobuy_jobs_active_next
  ON autobuy_jobs (active, next_run_at)
  WHERE active = true;
