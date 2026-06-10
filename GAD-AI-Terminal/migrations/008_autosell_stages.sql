-- ─── Staged Auto-Sell System ─────────────────────────────────────────────────
-- Adds staged take-profit columns to autobuy_jobs
-- and creates autosell_stages table for 6-stage sell ladder

ALTER TABLE autobuy_jobs ADD COLUMN IF NOT EXISTS entry_price_sol    NUMERIC;
ALTER TABLE autobuy_jobs ADD COLUMN IF NOT EXISTS token_amount_bought NUMERIC;
ALTER TABLE autobuy_jobs ADD COLUMN IF NOT EXISTS autosell_enabled   BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE autobuy_jobs ADD COLUMN IF NOT EXISTS total_sold_sol     NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE autobuy_jobs ADD COLUMN IF NOT EXISTS sell_stage_reached INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS autosell_stages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  autobuy_job_id  UUID NOT NULL REFERENCES autobuy_jobs(id) ON DELETE CASCADE,
  wallet_address  TEXT NOT NULL,
  mint_address    TEXT NOT NULL,
  stage_number    INTEGER NOT NULL,         -- 1-6
  trigger_mult    NUMERIC NOT NULL,         -- 4x / 7x / 11x / 16x / 21x / 31x
  sell_percent    NUMERIC NOT NULL,         -- 75 for stages 1-5, 100 for stage 6
  status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'executed' | 'skipped'
  tokens_at_stage NUMERIC,
  tokens_sold     NUMERIC,
  sol_received    NUMERIC,
  sell_price_sol  NUMERIC,
  tx_signature    TEXT,
  executed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autosell_job   ON autosell_stages (autobuy_job_id);
CREATE INDEX IF NOT EXISTS idx_autosell_mint  ON autosell_stages (mint_address);
CREATE INDEX IF NOT EXISTS idx_autosell_status ON autosell_stages (status) WHERE status = 'pending';
