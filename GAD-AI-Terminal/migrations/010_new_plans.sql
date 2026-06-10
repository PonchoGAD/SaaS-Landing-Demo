-- Migration 010: Update subscription pricing + add 3-day trial plan
-- New pricing: 1d=0.05 SOL, 3d=0.1 SOL, 30d=1.0 SOL

-- Update existing trial_1d price
UPDATE subscription_plans
SET price_sol = 0.05, name = '1-Day Trial'
WHERE slug = 'trial_1d';

-- Add 3-day trial plan (idempotent)
INSERT INTO subscription_plans (slug, name, price_sol, duration_hours, features, active)
VALUES (
  'trial_3d',
  '3-Day Access',
  0.1,
  72,
  '["everything_in_trial", "wallet_reputation", "social_monitor", "portfolio_pnl", "smart_money", "realtime_scanner"]',
  true
)
ON CONFLICT (slug) DO UPDATE
  SET price_sol      = EXCLUDED.price_sol,
      duration_hours = EXCLUDED.duration_hours,
      name           = EXCLUDED.name,
      features       = EXCLUDED.features,
      active         = true;

-- Ensure monthly plan price is correct
UPDATE subscription_plans
SET price_sol = 1.0, duration_hours = 720
WHERE slug = 'monthly';

-- Unique constraint on slug if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'subscription_plans' AND indexname = 'subscription_plans_slug_key'
  ) THEN
    ALTER TABLE subscription_plans ADD CONSTRAINT subscription_plans_slug_key UNIQUE (slug);
  END IF;
END
$$;
