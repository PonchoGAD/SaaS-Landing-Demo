CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- SPRINT 13: GAD ALPHA ENGINE
-- Lifecycle · Opportunity · Memory · Reputation · Regime · Feed · Replay
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Multi-chain support: add chain_id to tokens ─────────────────────────────
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS chain_id TEXT NOT NULL DEFAULT 'sol';
CREATE INDEX IF NOT EXISTS idx_tokens_chain ON tokens (chain_id);

-- ─── Market Regime ────────────────────────────────────────────────────────────
-- Captures the overall Solana/crypto market state
CREATE TABLE IF NOT EXISTS market_regime (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  regime      TEXT NOT NULL,   -- 'BULL' | 'BEAR' | 'SIDEWAYS' | 'EUPHORIA' | 'PANIC'
  confidence  NUMERIC NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
  sol_price   NUMERIC,
  btc_dominance NUMERIC,
  total_volume_24h NUMERIC,
  fear_greed_index INTEGER,    -- 0-100
  explanation TEXT,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_regime_time ON market_regime (computed_at DESC);

-- ─── Meme Lifecycle ───────────────────────────────────────────────────────────
-- Tracks lifecycle stage of each token
CREATE TABLE IF NOT EXISTS token_lifecycle (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id    UUID REFERENCES tokens(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL,   -- 'BIRTH' | 'ACCUMULATION' | 'BREAKOUT' | 'HYPE' | 'DISTRIBUTION' | 'DEATH'
  stage_score INTEGER NOT NULL DEFAULT 0 CHECK (stage_score BETWEEN 0 AND 100),
  -- Factor scores that determine stage
  volume_acceleration   NUMERIC NOT NULL DEFAULT 0,  -- volume growth rate
  holder_growth_rate    NUMERIC NOT NULL DEFAULT 0,  -- new holders per hour
  price_momentum        NUMERIC NOT NULL DEFAULT 0,  -- price trend strength
  whale_accumulation    NUMERIC NOT NULL DEFAULT 0,  -- net whale buying
  social_acceleration   NUMERIC NOT NULL DEFAULT 0,  -- social mention velocity
  liquidity_depth       NUMERIC NOT NULL DEFAULT 0,  -- $USD liquidity
  sell_pressure         NUMERIC NOT NULL DEFAULT 0,  -- sell/buy ratio
  explanation           TEXT,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lifecycle_token ON token_lifecycle (token_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_stage ON token_lifecycle (stage);

-- Stage transition history
CREATE TABLE IF NOT EXISTS lifecycle_transitions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id    UUID REFERENCES tokens(id) ON DELETE CASCADE,
  from_stage  TEXT,
  to_stage    TEXT NOT NULL,
  transitioned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lifecycle_trans_token ON lifecycle_transitions (token_id);

-- ─── Opportunity Engine ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opportunities (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id          UUID REFERENCES tokens(id) ON DELETE CASCADE,
  opportunity_score INTEGER NOT NULL DEFAULT 0 CHECK (opportunity_score BETWEEN 0 AND 100),
  confidence        NUMERIC NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
  -- Component scores
  narrative_momentum  INTEGER NOT NULL DEFAULT 0,  -- narrative trending up
  whale_accumulation  INTEGER NOT NULL DEFAULT 0,  -- smart whales buying early
  volume_breakout     INTEGER NOT NULL DEFAULT 0,  -- volume spike before price
  social_velocity     INTEGER NOT NULL DEFAULT 0,  -- mentions accelerating
  lifecycle_stage_bonus INTEGER NOT NULL DEFAULT 0, -- BIRTH or ACCUMULATION = bonus
  alpha_similarity    INTEGER NOT NULL DEFAULT 0,  -- similarity to past winners
  -- Risk penalty
  risk_penalty        INTEGER NOT NULL DEFAULT 0,
  reason              TEXT,
  regime_adjusted     BOOLEAN NOT NULL DEFAULT false,  -- was score adjusted for market regime?
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + interval '4 hours'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_opp_token ON opportunities (token_id);
CREATE INDEX IF NOT EXISTS idx_opp_score ON opportunities (opportunity_score DESC);

-- ─── Alpha Memory Engine ──────────────────────────────────────────────────────
-- Stores snapshots of tokens at early stage for ML similarity
CREATE TABLE IF NOT EXISTS token_memory (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id          UUID REFERENCES tokens(id) ON DELETE CASCADE,
  -- Snapshot at time of recording (early stage)
  snapshot_ai_score       INTEGER NOT NULL DEFAULT 0,
  snapshot_risk_score     INTEGER NOT NULL DEFAULT 0,
  snapshot_gad_score      INTEGER NOT NULL DEFAULT 0,
  snapshot_rug_probability INTEGER NOT NULL DEFAULT 0,
  snapshot_narrative_tag  TEXT,
  snapshot_hype_score     INTEGER NOT NULL DEFAULT 0,
  snapshot_whale_score    INTEGER NOT NULL DEFAULT 0,
  snapshot_holder_count   INTEGER NOT NULL DEFAULT 0,
  snapshot_liquidity_usd  NUMERIC NOT NULL DEFAULT 0,
  snapshot_volume_24h     NUMERIC NOT NULL DEFAULT 0,
  snapshot_age_hours      NUMERIC NOT NULL DEFAULT 0,
  snapshot_lifecycle_stage TEXT,
  -- Outcome (filled in later)
  outcome               TEXT,        -- 'WINNER_10X' | 'WINNER_50X' | 'WINNER_100X' | 'NEUTRAL' | 'RUG' | 'DEAD'
  peak_gain_x           NUMERIC,     -- e.g. 47.3 for 47x
  peak_gain_at          TIMESTAMP WITH TIME ZONE,
  outcome_confirmed_at  TIMESTAMP WITH TIME ZONE,
  -- Meta
  recorded_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memory_token ON token_memory (token_id);
CREATE INDEX IF NOT EXISTS idx_memory_outcome ON token_memory (outcome);
CREATE INDEX IF NOT EXISTS idx_memory_tag ON token_memory (snapshot_narrative_tag);

-- Alpha Similarity cache (pre-computed for performance)
CREATE TABLE IF NOT EXISTS alpha_similarity_cache (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id            UUID REFERENCES tokens(id) ON DELETE CASCADE,
  similarity_score    INTEGER NOT NULL DEFAULT 0 CHECK (similarity_score BETWEEN 0 AND 100),
  matched_winners     INTEGER NOT NULL DEFAULT 0,   -- how many winners it matches
  avg_winner_gain_x   NUMERIC NOT NULL DEFAULT 0,
  top_match_outcome   TEXT,
  explanation         TEXT,
  computed_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alpha_sim_token ON alpha_similarity_cache (token_id);

-- ─── Wallet Reputation ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_reputation (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id       UUID REFERENCES wallets(id) ON DELETE CASCADE UNIQUE,
  reputation_tier TEXT NOT NULL DEFAULT 'TOURIST',
  -- Tiers: 'LEGEND' | 'SMART' | 'AVERAGE' | 'TOURIST' | 'EXIT_LIQUIDITY'
  reputation_score INTEGER NOT NULL DEFAULT 0 CHECK (reputation_score BETWEEN 0 AND 100),
  -- Component scores
  win_rate_score      INTEGER NOT NULL DEFAULT 0,
  early_entry_score   INTEGER NOT NULL DEFAULT 0,  -- how often buys at BIRTH/ACCUMULATION
  conviction_score    INTEGER NOT NULL DEFAULT 0,  -- how long holds winners
  exit_quality_score  INTEGER NOT NULL DEFAULT 0,  -- exits before dump or after?
  total_return_score  INTEGER NOT NULL DEFAULT 0,
  -- Stats
  verified_wins       INTEGER NOT NULL DEFAULT 0,   -- 5x+ wins
  verified_rugs       INTEGER NOT NULL DEFAULT 0,
  avg_hold_hours      NUMERIC NOT NULL DEFAULT 0,
  explanation         TEXT,
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rep_tier ON wallet_reputation (reputation_tier);
CREATE INDEX IF NOT EXISTS idx_rep_score ON wallet_reputation (reputation_score DESC);

-- Conviction Tracking: track open positions with time context
CREATE TABLE IF NOT EXISTS conviction_tracking (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id       UUID REFERENCES wallets(id) ON DELETE CASCADE,
  token_id        UUID REFERENCES tokens(id) ON DELETE CASCADE,
  opened_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  hold_hours      NUMERIC NOT NULL DEFAULT 0,  -- updated periodically
  entry_price     NUMERIC,
  current_price   NUMERIC,
  unrealized_x    NUMERIC,   -- current multiplier vs entry
  status          TEXT NOT NULL DEFAULT 'HOLDING',  -- 'HOLDING' | 'EXITED_WIN' | 'EXITED_LOSS' | 'RUGGED'
  closed_at       TIMESTAMP WITH TIME ZONE,
  final_gain_x    NUMERIC
);
CREATE INDEX IF NOT EXISTS idx_conviction_wallet ON conviction_tracking (wallet_id);
CREATE INDEX IF NOT EXISTS idx_conviction_token ON conviction_tracking (token_id);
CREATE INDEX IF NOT EXISTS idx_conviction_status ON conviction_tracking (status);

-- ─── Narrative Rotation ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS narrative_rotation (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  narrative_tag   TEXT NOT NULL UNIQUE,
  current_rank    INTEGER NOT NULL DEFAULT 0,   -- 1 = hottest right now
  prev_rank       INTEGER,
  momentum        TEXT NOT NULL DEFAULT 'STABLE', -- 'RISING' | 'FALLING' | 'STABLE' | 'PEAK' | 'DEAD'
  token_count     INTEGER NOT NULL DEFAULT 0,    -- tokens with this narrative
  avg_gad_score   NUMERIC NOT NULL DEFAULT 0,
  avg_opportunity INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_narr_rot_rank ON narrative_rotation (current_rank);

-- ─── Signal History (for Replay Engine) ──────────────────────────────────────
-- Every generated signal is stored here for historical replay
CREATE TABLE IF NOT EXISTS signal_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id        UUID REFERENCES tokens(id) ON DELETE CASCADE,
  signal_type     TEXT NOT NULL,  -- 'GAD_HIGH' | 'OPPORTUNITY' | 'LIFECYCLE_BREAKOUT' | 'WHALE_ENTER' | 'REGIME_SHIFT'
  signal_score    INTEGER NOT NULL DEFAULT 0,
  gad_score       INTEGER,
  opportunity_score INTEGER,
  lifecycle_stage TEXT,
  recommendation  TEXT,           -- 'STRONG_BUY' | 'BUY' | 'WATCH' | 'AVOID'
  -- Outcome (filled in retrospectively)
  outcome_1h_pct  NUMERIC,        -- price change 1h after signal
  outcome_24h_pct NUMERIC,        -- price change 24h after signal
  outcome_7d_pct  NUMERIC,        -- price change 7d after signal
  outcome_confirmed BOOLEAN NOT NULL DEFAULT false,
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_signal_type ON signal_history (signal_type);
CREATE INDEX IF NOT EXISTS idx_signal_time ON signal_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_token ON signal_history (token_id);
CREATE INDEX IF NOT EXISTS idx_signal_recommendation ON signal_history (recommendation);

-- ─── User Preferences (Personal AI Feed) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_key        TEXT NOT NULL UNIQUE,  -- telegram_id or wallet_address
  -- Narrative preferences
  preferred_narratives TEXT[] NOT NULL DEFAULT '{}',   -- ['AI_AGENT', 'DOG']
  excluded_narratives  TEXT[] NOT NULL DEFAULT '{}',
  -- Score thresholds
  min_gad_score       INTEGER NOT NULL DEFAULT 60,
  max_risk_score      INTEGER NOT NULL DEFAULT 70,
  min_opportunity_score INTEGER NOT NULL DEFAULT 50,
  -- Lifecycle preferences
  preferred_stages    TEXT[] NOT NULL DEFAULT '{}',    -- ['BIRTH', 'ACCUMULATION']
  -- Market cap range
  min_market_cap      NUMERIC,
  max_market_cap      NUMERIC,
  -- Feed settings
  feed_frequency      TEXT NOT NULL DEFAULT 'realtime', -- 'realtime' | 'hourly' | 'daily'
  push_alerts         BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─── Social Monitor ───────────────────────────────────────────────────────────
-- Stores raw social signals from X/Twitter, Telegram channels
CREATE TABLE IF NOT EXISTS social_signals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source          TEXT NOT NULL,      -- 'twitter' | 'telegram_channel' | 'discord'
  source_id       TEXT,               -- tweet_id, message_id
  author          TEXT,               -- @handle or channel name
  content         TEXT NOT NULL,
  detected_tokens TEXT[] DEFAULT '{}', -- mint addresses mentioned
  sentiment       NUMERIC DEFAULT 0.5,  -- 0-1
  engagement      INTEGER DEFAULT 0,    -- likes + retweets + replies
  influence_score INTEGER DEFAULT 0,   -- author importance 0-100
  processed       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_social_sig_source ON social_signals (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_sig_tokens ON social_signals USING gin (detected_tokens);

-- Monitored accounts (Twitter/X, Telegram channels)
CREATE TABLE IF NOT EXISTS monitored_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform        TEXT NOT NULL,    -- 'twitter' | 'telegram'
  handle          TEXT NOT NULL,    -- @handle or @channel
  display_name    TEXT,
  influence_score INTEGER NOT NULL DEFAULT 50 CHECK (influence_score BETWEEN 0 AND 100),
  category        TEXT NOT NULL DEFAULT 'kol', -- 'kol' | 'project' | 'news' | 'alpha'
  active          BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (platform, handle)
);

-- Pre-populate known KOLs
INSERT INTO monitored_accounts (platform, handle, display_name, influence_score, category)
VALUES
  ('twitter', 'ansemtrades',   'Ansem',         90, 'kol'),
  ('twitter', 'blknoiz06',     'Murad',         88, 'kol'),
  ('twitter', 'inversebrah',   'InverseBrah',   82, 'kol'),
  ('twitter', 'cobie',         'Cobie',         95, 'kol'),
  ('twitter', 'solana',        'Solana',        85, 'news'),
  ('twitter', 'pumpdotfun',    'pump.fun',      80, 'project')
ON CONFLICT (platform, handle) DO NOTHING;

-- ─── Backtest Results ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS backtest_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_days     INTEGER NOT NULL,   -- 30 | 90 | 180
  strategy        TEXT NOT NULL DEFAULT 'gad_score', -- which signal was used
  min_score       INTEGER NOT NULL DEFAULT 70,
  total_signals   INTEGER NOT NULL DEFAULT 0,
  winning_signals INTEGER NOT NULL DEFAULT 0,
  win_rate        NUMERIC NOT NULL DEFAULT 0,
  avg_gain_pct    NUMERIC NOT NULL DEFAULT 0,
  max_gain_pct    NUMERIC NOT NULL DEFAULT 0,
  max_loss_pct    NUMERIC NOT NULL DEFAULT 0,
  sharpe_ratio    NUMERIC,
  explanation     TEXT,
  run_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─── Indexes on existing tables for new query patterns ───────────────────────
CREATE INDEX IF NOT EXISTS idx_score_hist_created ON score_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_first_seen ON tokens (first_seen DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_market_cap ON tokens (market_cap DESC NULLS LAST);
