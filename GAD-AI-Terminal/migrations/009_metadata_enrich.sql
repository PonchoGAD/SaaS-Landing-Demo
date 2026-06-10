-- Migration 009: Token metadata enrichment columns
-- Adds tracking fields for metadata source and sync state

ALTER TABLE tokens ADD COLUMN IF NOT EXISTS source              TEXT;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS metadata_source     TEXT;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS last_metadata_sync  TIMESTAMPTZ;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS metadata_json       JSONB NOT NULL DEFAULT '{}';

-- Safety: ensure autosell_stages exists even if earlier migrations were skipped
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'autosell_stages') THEN
    CREATE TABLE autosell_stages (
      id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      autobuy_job_id   UUID REFERENCES autobuy_jobs(id) ON DELETE CASCADE,
      wallet_address   TEXT NOT NULL,
      mint_address     TEXT NOT NULL,
      stage_number     INTEGER NOT NULL,
      trigger_mult     NUMERIC NOT NULL,
      sell_percent     NUMERIC NOT NULL,
      status           TEXT NOT NULL DEFAULT 'pending',
      tokens_at_stage  NUMERIC,
      tokens_sold      NUMERIC,
      sol_received     NUMERIC,
      sell_price_sol   NUMERIC,
      tx_signature     TEXT,
      executed_at      TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_autosell_status    ON autosell_stages (status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_autosell_mint      ON autosell_stages (mint_address);
CREATE INDEX IF NOT EXISTS idx_autosell_job       ON autosell_stages (autobuy_job_id);
CREATE INDEX IF NOT EXISTS idx_tokens_source      ON tokens (source);
CREATE INDEX IF NOT EXISTS idx_tokens_no_meta     ON tokens (mint_address) WHERE symbol IS NULL;
