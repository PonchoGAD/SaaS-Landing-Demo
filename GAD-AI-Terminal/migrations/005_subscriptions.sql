CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Subscription Plans ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT NOT NULL UNIQUE,       -- 'trial_1d' | 'monthly'
  name        TEXT NOT NULL,
  price_sol   NUMERIC NOT NULL,           -- 0.1 or 1.0
  duration_hours INTEGER NOT NULL,        -- 24 or 720
  features    JSONB NOT NULL DEFAULT '[]',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO subscription_plans (slug, name, price_sol, duration_hours, features) VALUES
  ('trial_1d', '1-Day Trial', 0.1, 24,
   '["trending","highscore","highrisk","alerts","token_analysis","rug_check","basic_whale"]'),
  ('monthly', 'Full Access — 1 Month', 1.0, 720,
   '["all_features","narrative","social","wallet_dna","survival","copy_intelligence","smart_money","early_conviction","unlimited_autobuy","portfolio_management"]')
ON CONFLICT (slug) DO NOTHING;

-- ─── User Subscriptions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address  TEXT NOT NULL,
  plan_slug       TEXT NOT NULL REFERENCES subscription_plans(slug),
  tx_signature    TEXT,                   -- Solana payment tx
  amount_sol      NUMERIC NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  -- pending | active | expired | cancelled
  started_at      TIMESTAMP WITH TIME ZONE,
  expires_at      TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at     TIMESTAMP WITH TIME ZONE,
  trial_used      BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_tx ON subscriptions (tx_signature) WHERE tx_signature IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sub_wallet ON subscriptions (wallet_address);
CREATE INDEX IF NOT EXISTS idx_sub_active ON subscriptions (wallet_address, status, expires_at)
  WHERE status = 'active';

-- One trial per wallet
CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_trial_once
  ON subscriptions (wallet_address)
  WHERE plan_slug = 'trial_1d';

-- ─── Subscription Access Checks ──────────────────────────────────────────────
-- View: current active subscription for each wallet
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT DISTINCT ON (wallet_address)
  wallet_address,
  plan_slug,
  expires_at,
  status,
  trial_used
FROM subscriptions
WHERE status = 'active'
  AND expires_at > now()
ORDER BY wallet_address, expires_at DESC;
