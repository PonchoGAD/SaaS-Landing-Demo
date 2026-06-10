CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Whale tracker ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS whale_scores (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id    UUID REFERENCES wallets(id) ON DELETE CASCADE,
  whale_score  INTEGER NOT NULL DEFAULT 0 CHECK (whale_score BETWEEN 0 AND 100),
  buy_count    INTEGER NOT NULL DEFAULT 0,
  sell_count   INTEGER NOT NULL DEFAULT 0,
  avg_hold_sec INTEGER NOT NULL DEFAULT 0,
  win_rate     NUMERIC NOT NULL DEFAULT 0,
  roi          NUMERIC NOT NULL DEFAULT 0,
  pnl          NUMERIC NOT NULL DEFAULT 0,
  largest_trade NUMERIC,
  last_scored  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whale_scores_wallet ON whale_scores (wallet_id);

CREATE TABLE IF NOT EXISTS wallet_positions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id       UUID REFERENCES wallets(id) ON DELETE CASCADE,
  token_id        UUID REFERENCES tokens(id) ON DELETE SET NULL,
  side            TEXT NOT NULL,
  amount          NUMERIC NOT NULL,
  entry_price     NUMERIC,
  exit_price      NUMERIC,
  pnl             NUMERIC,
  opened_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at       TIMESTAMP WITH TIME ZONE,
  status          TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS wallet_performance (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id     UUID REFERENCES wallets(id) ON DELETE CASCADE UNIQUE,
  total_trades  INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades  INTEGER NOT NULL DEFAULT 0,
  total_volume  NUMERIC NOT NULL DEFAULT 0,
  total_pnl     NUMERIC NOT NULL DEFAULT 0,
  avg_roi       NUMERIC NOT NULL DEFAULT 0,
  best_trade    NUMERIC,
  worst_trade   NUMERIC,
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─── Smart Money ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS smart_wallets (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id         UUID REFERENCES wallets(id) ON DELETE CASCADE UNIQUE,
  smart_money_score INTEGER NOT NULL DEFAULT 0 CHECK (smart_money_score BETWEEN 0 AND 100),
  roi               NUMERIC NOT NULL DEFAULT 0,
  win_rate          NUMERIC NOT NULL DEFAULT 0,
  total_trades      INTEGER NOT NULL DEFAULT 0,
  explanation       TEXT,
  qualified_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smart_wallet_trades (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  smart_wallet_id UUID REFERENCES smart_wallets(id) ON DELETE CASCADE,
  token_id        UUID REFERENCES tokens(id) ON DELETE SET NULL,
  side            TEXT NOT NULL,
  amount          NUMERIC NOT NULL,
  price           NUMERIC,
  usd_value       NUMERIC,
  executed_at     TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smart_wallet_trades_token ON smart_wallet_trades (token_id);
CREATE INDEX IF NOT EXISTS idx_smart_wallet_trades_wallet ON smart_wallet_trades (smart_wallet_id);

-- Track when smart money bought a specific token (for AI score boost)
CREATE TABLE IF NOT EXISTS smart_money_token_signals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id        UUID REFERENCES tokens(id) ON DELETE CASCADE,
  smart_wallet_id UUID REFERENCES smart_wallets(id) ON DELETE CASCADE,
  signal_type     TEXT NOT NULL DEFAULT 'BUY',
  boost_applied   INTEGER NOT NULL DEFAULT 0,
  explanation     TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smart_signals_token ON smart_money_token_signals (token_id);

-- Terminal payment sessions (Sprint 10)
CREATE TABLE IF NOT EXISTS terminal_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payer_wallet    TEXT NOT NULL,
  tx_signature    TEXT UNIQUE,
  amount_sol      NUMERIC NOT NULL DEFAULT 0.01,
  verified        BOOLEAN NOT NULL DEFAULT false,
  analyzed_mint   TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + interval '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_terminal_sessions_payer ON terminal_sessions (payer_wallet);
