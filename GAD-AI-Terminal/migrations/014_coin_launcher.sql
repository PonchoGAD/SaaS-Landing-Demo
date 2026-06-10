-- CoinLauncher: track tokens deployed by the owner via pump.fun
CREATE TABLE IF NOT EXISTS launched_tokens (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  mint_address     TEXT        UNIQUE NOT NULL,
  name             TEXT        NOT NULL,
  ticker           TEXT        NOT NULL,
  description      TEXT,
  logo_url         TEXT,
  website          TEXT,
  telegram_link    TEXT,
  twitter_link     TEXT,
  launch_tx        TEXT,
  sol_invested     NUMERIC     NOT NULL DEFAULT 0,
  initial_price_sol NUMERIC,
  current_price_sol NUMERIC,
  peak_price_sol   NUMERIC,
  total_sold_sol   NUMERIC     NOT NULL DEFAULT 0,
  holder_count     INTEGER     DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'LIVE',
  launched_at      TIMESTAMPTZ DEFAULT now(),
  sold_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Events log per token (price updates, sells, milestones)
CREATE TABLE IF NOT EXISTS launcher_events (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  mint       TEXT        NOT NULL REFERENCES launched_tokens(mint_address) ON DELETE CASCADE,
  event_type TEXT        NOT NULL,  -- 'LAUNCH' | 'PRICE_UPDATE' | 'SELL' | 'MILESTONE' | 'NOTE'
  message    TEXT        NOT NULL,
  price_sol  NUMERIC,
  sol_amount NUMERIC,
  tx         TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_launched_tokens_status ON launched_tokens(status);
CREATE INDEX IF NOT EXISTS idx_launcher_events_mint ON launcher_events(mint, created_at DESC);
