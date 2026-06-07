-- Migration 007: Staged auto-sell system
-- Sell schedule: 75% at each of 6 price targets (4x, 7x, 11x, 16x, 21x, 31x)

-- Track entry data for each buy
ALTER TABLE autobuy_jobs ADD COLUMN IF NOT EXISTS entry_price_sol NUMERIC;
ALTER TABLE autobuy_jobs ADD COLUMN IF NOT EXISTS token_amount_bought NUMERIC;
ALTER TABLE autobuy_jobs ADD COLUMN IF NOT EXISTS autosell_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Staged take-profit sell orders
CREATE TABLE IF NOT EXISTS autosell_stages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  autobuy_job_id    UUID NOT NULL REFERENCES autobuy_jobs(id) ON DELETE CASCADE,
  wallet_address    TEXT NOT NULL,
  mint_address      TEXT NOT NULL,
  stage_number      INTEGER NOT NULL,      -- 1..6
  trigger_mult      NUMERIC NOT NULL,      -- entry × trigger_mult = sell price target
  sell_percent      NUMERIC NOT NULL,      -- % of tokens_remaining to sell at this stage
  status            TEXT NOT NULL DEFAULT 'pending',  -- pending | triggered | executed | skipped
  tokens_at_stage   NUMERIC,              -- tokens available when this stage fires
  tokens_sold       NUMERIC,
  sol_received      NUMERIC,
  sell_price_sol    NUMERIC,              -- actual price when sold
  tx_signature      TEXT,
  executed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autosell_pending
  ON autosell_stages (status, mint_address)
  WHERE status = 'pending';

-- Total SOL received per job (useful for P&L)
ALTER TABLE autobuy_jobs ADD COLUMN IF NOT EXISTS total_sold_sol NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE autobuy_jobs ADD COLUMN IF NOT EXISTS sell_stage_reached INTEGER NOT NULL DEFAULT 0;
