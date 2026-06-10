CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Narrative Scores ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS narrative_scores (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id         UUID REFERENCES tokens(id) ON DELETE CASCADE,
  narrative_tag    TEXT NOT NULL,          -- 'AI_AGENT', 'DOG', 'CAT', etc.
  narrative_score  INTEGER NOT NULL DEFAULT 0 CHECK (narrative_score BETWEEN 0 AND 100),
  trend_boost      INTEGER NOT NULL DEFAULT 0, -- extra pts when this narrative is trending
  raw_score        INTEGER NOT NULL DEFAULT 0,
  explanation      TEXT,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_narrative_token ON narrative_scores (token_id);

-- Trending narratives (updated externally or by scanner)
CREATE TABLE IF NOT EXISTS trending_narratives (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag         TEXT NOT NULL UNIQUE,
  strength    INTEGER NOT NULL DEFAULT 50 CHECK (strength BETWEEN 0 AND 100),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─── Social Metrics ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id        UUID REFERENCES tokens(id) ON DELETE CASCADE,
  hype_score      INTEGER NOT NULL DEFAULT 0 CHECK (hype_score BETWEEN 0 AND 100),
  mention_count   INTEGER NOT NULL DEFAULT 0,
  mention_velocity NUMERIC NOT NULL DEFAULT 0,  -- mentions per hour
  engagement_rate  NUMERIC NOT NULL DEFAULT 0,
  sentiment        NUMERIC NOT NULL DEFAULT 0.5, -- 0=negative 1=positive
  sources          JSONB NOT NULL DEFAULT '{}',
  snapshot_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_token ON social_metrics (token_id);

-- ─── Rug Probability ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rug_scores (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id               UUID REFERENCES tokens(id) ON DELETE CASCADE,
  rug_probability        INTEGER NOT NULL DEFAULT 0 CHECK (rug_probability BETWEEN 0 AND 100),
  liquidity_locked       BOOLEAN NOT NULL DEFAULT false,
  mint_authority_revoked BOOLEAN NOT NULL DEFAULT false,
  freeze_authority_revoked BOOLEAN NOT NULL DEFAULT false,
  top10_holder_pct       NUMERIC NOT NULL DEFAULT 0,
  bundled_wallets        INTEGER NOT NULL DEFAULT 0,
  sniper_count           INTEGER NOT NULL DEFAULT 0,
  dev_sold_pct           NUMERIC NOT NULL DEFAULT 0,
  flags                  JSONB NOT NULL DEFAULT '[]',
  checked_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rug_token ON rug_scores (token_id);

-- ─── Wallet DNA ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_dna (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id        UUID REFERENCES wallets(id) ON DELETE CASCADE UNIQUE,
  dna_type         TEXT NOT NULL DEFAULT 'UNKNOWN',
  -- type: SNIPER | WHALE | INSIDER | HOLDER | SCALPER | SWING | DEGENERATE
  sniper_score     INTEGER NOT NULL DEFAULT 0,
  whale_score      INTEGER NOT NULL DEFAULT 0,
  insider_score    INTEGER NOT NULL DEFAULT 0,
  holder_score     INTEGER NOT NULL DEFAULT 0,
  scalper_score    INTEGER NOT NULL DEFAULT 0,
  swing_score      INTEGER NOT NULL DEFAULT 0,
  confidence       NUMERIC NOT NULL DEFAULT 0,
  trade_count      INTEGER NOT NULL DEFAULT 0,
  avg_hold_minutes INTEGER NOT NULL DEFAULT 0,
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Token buyer DNA breakdown
CREATE TABLE IF NOT EXISTS token_dna_breakdown (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id   UUID REFERENCES tokens(id) ON DELETE CASCADE,
  dna_type   TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  pct        NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_token_dna ON token_dna_breakdown (token_id, dna_type);

-- ─── Survival Scores ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS survival_scores (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id     UUID REFERENCES tokens(id) ON DELETE CASCADE,
  survival_1h  INTEGER NOT NULL DEFAULT 50 CHECK (survival_1h  BETWEEN 0 AND 100),
  survival_6h  INTEGER NOT NULL DEFAULT 50 CHECK (survival_6h  BETWEEN 0 AND 100),
  survival_24h INTEGER NOT NULL DEFAULT 50 CHECK (survival_24h BETWEEN 0 AND 100),
  survival_7d  INTEGER NOT NULL DEFAULT 50 CHECK (survival_7d  BETWEEN 0 AND 100),
  overall      INTEGER NOT NULL DEFAULT 50 CHECK (overall BETWEEN 0 AND 100),
  explanation  TEXT,
  computed_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_survival_token ON survival_scores (token_id);

-- ─── GAD Score (unified) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gad_scores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id        UUID REFERENCES tokens(id) ON DELETE CASCADE,
  gad_score       INTEGER NOT NULL DEFAULT 0 CHECK (gad_score BETWEEN 0 AND 100),
  ai_score        INTEGER NOT NULL DEFAULT 0,
  narrative_score INTEGER NOT NULL DEFAULT 0,
  hype_score      INTEGER NOT NULL DEFAULT 0,
  whale_score     INTEGER NOT NULL DEFAULT 0,
  risk_score      INTEGER NOT NULL DEFAULT 0,
  survival_score  INTEGER NOT NULL DEFAULT 0,
  rug_probability INTEGER NOT NULL DEFAULT 0,
  explanation     TEXT,
  computed_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gad_token ON gad_scores (token_id);
CREATE INDEX IF NOT EXISTS idx_gad_score_desc ON gad_scores (gad_score DESC);

-- ─── Wallet Clusters ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_clusters (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_id  TEXT NOT NULL,               -- e.g. 'GROUP_7'
  wallet_id   UUID REFERENCES wallets(id) ON DELETE CASCADE,
  similarity  NUMERIC NOT NULL DEFAULT 0,  -- 0-1
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cluster_id ON wallet_clusters (cluster_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cluster_wallet ON wallet_clusters (cluster_id, wallet_id);

-- Early Conviction — tracking "early" buyers of successful tokens
CREATE TABLE IF NOT EXISTS early_conviction_wallets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id       UUID REFERENCES wallets(id) ON DELETE CASCADE,
  token_id        UUID REFERENCES tokens(id) ON DELETE CASCADE,
  buy_position    INTEGER NOT NULL DEFAULT 0,   -- nth buyer
  price_at_buy    NUMERIC,
  peak_gain_x     NUMERIC,                      -- e.g. 50.0 = 50x
  confirmed_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_early_wallet ON early_conviction_wallets (wallet_id);
