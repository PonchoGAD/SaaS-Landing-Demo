CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mint_address TEXT NOT NULL UNIQUE,
  symbol TEXT,
  name TEXT,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_supply NUMERIC,
  market_cap NUMERIC,
  liquidity NUMERIC,
  holder_count INTEGER,
  token_age_hours INTEGER
);

CREATE TABLE IF NOT EXISTS token_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  volume_5m NUMERIC DEFAULT 0,
  volume_1h NUMERIC DEFAULT 0,
  volume_24h NUMERIC DEFAULT 0,
  tx_count_5m INTEGER DEFAULT 0,
  tx_count_1h INTEGER DEFAULT 0,
  tx_count_24h INTEGER DEFAULT 0,
  liquidity_change NUMERIC DEFAULT 0,
  price_change_1h NUMERIC DEFAULT 0,
  price_change_24h NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT NOT NULL UNIQUE,
  label TEXT,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pnl NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  average_hold_time_seconds INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  roi NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wallet_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  token_id UUID REFERENCES tokens(id) ON DELETE SET NULL,
  signature TEXT NOT NULL UNIQUE,
  side TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC,
  usd_value NUMERIC,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  strategy TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  added_by TEXT,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  added_by TEXT,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  subject TEXT,
  payload JSONB,
  score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS portfolio_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID REFERENCES tokens(id) ON DELETE SET NULL,
  entry_price NUMERIC NOT NULL,
  take_profit_1 NUMERIC,
  take_profit_2 NUMERIC,
  stop_loss NUMERIC,
  position_size NUMERIC NOT NULL,
  current_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS portfolio_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID REFERENCES portfolio_positions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS score_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  growth_score INTEGER,
  liquidity_score INTEGER,
  volume_score INTEGER,
  holder_score INTEGER,
  momentum_score INTEGER,
  risk_score INTEGER,
  ai_score INTEGER,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
