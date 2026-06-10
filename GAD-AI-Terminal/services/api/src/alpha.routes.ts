/**
 * Sprint 13 — GAD Alpha Engine API Routes
 * Opportunity · Lifecycle · Regime · Replay · Feed · Memory · Reputation
 */
import { Application, Request, Response } from 'express';
import { query } from '@lib/db';

async function safeRes<T>(res: Response, fn: () => Promise<T>) {
  try { await fn(); }
  catch (err: any) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

export function registerAlphaRoutes(app: Application) {

  // ═══════════════════════════════════════════════════════════════════════════
  // OPPORTUNITY ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /opportunity — top early opportunity tokens right now */
  app.get('/opportunity', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const limit = Math.min(Number(req.query.limit ?? 20), 100);
      const minScore = Number(req.query.min_score ?? 50);

      const { rows } = await query(`
        SELECT
          t.mint_address, t.symbol, t.name, t.market_cap, t.holder_count,
          t.chain_id,
          o.opportunity_score, o.confidence, o.reason, o.regime_adjusted,
          o.narrative_momentum, o.whale_accumulation, o.volume_breakout,
          o.social_velocity, o.alpha_similarity,
          o.lifecycle_stage_bonus, o.risk_penalty,
          o.expires_at, o.created_at,
          tl.stage AS lifecycle_stage,
          gs.gad_score, gs.ai_score, gs.risk_score, gs.rug_probability
        FROM opportunities o
        JOIN tokens t ON t.id = o.token_id
        LEFT JOIN token_lifecycle tl ON tl.token_id = o.token_id
        LEFT JOIN gad_scores gs ON gs.token_id = o.token_id
        WHERE o.opportunity_score >= $1
          AND o.expires_at > now()
        ORDER BY o.opportunity_score DESC
        LIMIT $2
      `, [minScore, limit]);

      res.json({
        opportunities: rows,
        count: rows.length,
        timestamp: new Date().toISOString()
      });
    });
  });

  /** GET /opportunity/:mint — opportunity details for a specific token */
  app.get('/opportunity/:mint', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const { mint } = req.params;
      const { rows } = await query(`
        SELECT o.*, t.symbol, t.name, t.market_cap, t.chain_id,
               tl.stage, tl.explanation AS lifecycle_explanation,
               asc2.explanation AS alpha_explanation,
               asc2.matched_winners, asc2.avg_winner_gain_x
        FROM opportunities o
        JOIN tokens t ON t.id = o.token_id
        LEFT JOIN token_lifecycle tl ON tl.token_id = o.token_id
        LEFT JOIN alpha_similarity_cache asc2 ON asc2.token_id = o.token_id
        WHERE t.mint_address = $1
      `, [mint]);
      if (!rows.length) return res.status(404).json({ error: 'No opportunity data' });
      res.json({ opportunity: rows[0] });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /lifecycle/:mint — current lifecycle stage of a token */
  app.get('/lifecycle/:mint', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const { mint } = req.params;
      const [lifecycle, transitions] = await Promise.all([
        query(`
          SELECT tl.*, t.symbol, t.name
          FROM token_lifecycle tl
          JOIN tokens t ON t.id = tl.token_id
          WHERE t.mint_address = $1
        `, [mint]),
        query(`
          SELECT lt.*, t.mint_address
          FROM lifecycle_transitions lt
          JOIN tokens t ON t.id = lt.token_id
          WHERE t.mint_address = $1
          ORDER BY lt.transitioned_at DESC LIMIT 10
        `, [mint])
      ]);
      if (!lifecycle.rows.length) return res.status(404).json({ error: 'No lifecycle data yet' });
      res.json({ lifecycle: lifecycle.rows[0], transitions: transitions.rows });
    });
  });

  /** GET /lifecycle/stage/:stage — all tokens in a specific stage */
  app.get('/lifecycle/stage/:stage', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const { stage } = req.params;
      const limit = Math.min(Number(req.query.limit ?? 20), 100);
      const { rows } = await query(`
        SELECT t.mint_address, t.symbol, t.name, t.market_cap,
               tl.stage, tl.stage_score, tl.explanation, tl.computed_at,
               gs.gad_score, gs.ai_score, gs.risk_score
        FROM token_lifecycle tl
        JOIN tokens t ON t.id = tl.token_id
        LEFT JOIN gad_scores gs ON gs.token_id = t.id
        WHERE tl.stage = $1
        ORDER BY tl.stage_score DESC
        LIMIT $2
      `, [stage.toUpperCase(), limit]);
      res.json({ stage, tokens: rows, count: rows.length });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MARKET REGIME
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /regime — current market regime */
  app.get('/regime', async (_req, res: Response) => {
    await safeRes(res, async () => {
      const { rows } = await query(`
        SELECT * FROM market_regime ORDER BY computed_at DESC LIMIT 1
      `);
      const regime = rows[0] ?? {
        regime: 'SIDEWAYS', confidence: 0.5, explanation: 'No regime data yet. Default to SIDEWAYS.',
        sol_price: null, fear_greed_index: 50
      };
      res.json({ regime });
    });
  });

  /** GET /regime/history — regime history (last 30 entries) */
  app.get('/regime/history', async (_req, res: Response) => {
    await safeRes(res, async () => {
      const { rows } = await query(`
        SELECT regime, confidence, sol_price, fear_greed_index, computed_at
        FROM market_regime ORDER BY computed_at DESC LIMIT 30
      `);
      res.json({ history: rows });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REPLAY ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /replay?date=YYYY-MM-DD&hours=24
   * "What signals would GAD AI have given yesterday?"
   * Shows historical signals with their outcomes.
   */
  app.get('/replay', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const hoursBack = Math.min(Number(req.query.hours ?? 24), 168); // max 7 days
      const dateParam = req.query.date as string | undefined;

      let startTime: Date;
      let endTime: Date;

      if (dateParam) {
        startTime = new Date(dateParam);
        endTime   = new Date(startTime.getTime() + 24 * 3_600_000);
      } else {
        endTime   = new Date(Date.now() - hoursBack * 3_600_000);
        startTime = new Date(endTime.getTime() - 24 * 3_600_000);
      }

      const { rows } = await query(`
        SELECT
          sh.signal_type, sh.signal_score, sh.gad_score, sh.opportunity_score,
          sh.lifecycle_stage, sh.recommendation,
          sh.outcome_1h_pct, sh.outcome_24h_pct, sh.outcome_7d_pct,
          sh.outcome_confirmed, sh.created_at,
          t.mint_address, t.symbol, t.name, t.market_cap
        FROM signal_history sh
        JOIN tokens t ON t.id = sh.token_id
        WHERE sh.created_at BETWEEN $1 AND $2
        ORDER BY sh.signal_score DESC
        LIMIT 50
      `, [startTime.toISOString(), endTime.toISOString()]);

      // Summary stats
      const confirmed = rows.filter((r: any) => r.outcome_confirmed);
      const winners   = confirmed.filter((r: any) => (r.outcome_24h_pct ?? 0) > 10);
      const avgGain   = confirmed.length > 0
        ? confirmed.reduce((s: number, r: any) => s + (r.outcome_24h_pct ?? 0), 0) / confirmed.length
        : null;

      res.json({
        period: { start: startTime, end: endTime, hoursBack },
        signals: rows,
        summary: {
          totalSignals:     rows.length,
          confirmedOutcomes: confirmed.length,
          winners:          winners.length,
          winRate:          confirmed.length > 0 ? Math.round(winners.length / confirmed.length * 100) : null,
          avgGain24h:       avgGain != null ? Math.round(avgGain * 10) / 10 : null
        }
      });
    });
  });

  /** GET /replay/backtest?days=30&min_score=70 — backtest results */
  app.get('/replay/backtest', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const days     = Math.min(Number(req.query.days ?? 30), 180);
      const minScore = Number(req.query.min_score ?? 70);

      // Pull stored backtest or compute live from signal_history
      const stored = await query(`
        SELECT * FROM backtest_runs
        WHERE period_days = $1 AND min_score = $2
        ORDER BY run_at DESC LIMIT 1
      `, [days, minScore]);

      if (stored.rows.length) {
        return res.json({ backtest: stored.rows[0], source: 'cached' });
      }

      // Live computation from signal_history
      const { rows } = await query(`
        SELECT
          sh.signal_score, sh.recommendation,
          sh.outcome_24h_pct, sh.outcome_7d_pct, sh.outcome_confirmed
        FROM signal_history sh
        WHERE sh.created_at > now() - ($1 || ' days')::interval
          AND sh.signal_score >= $2
          AND sh.outcome_confirmed = true
      `, [String(days), minScore]);

      if (!rows.length) {
        return res.json({ backtest: null, message: 'Insufficient historical data. Run the system for more time.' });
      }

      const wins   = rows.filter((r: any) => (r.outcome_24h_pct ?? 0) > 10);
      const losses = rows.filter((r: any) => (r.outcome_24h_pct ?? 0) <= 0);
      const allGains = rows.map((r: any) => r.outcome_24h_pct ?? 0);
      const avgGain = allGains.reduce((a: number, b: number) => a + b, 0) / allGains.length;
      const maxGain = Math.max(...allGains);
      const maxLoss = Math.min(...allGains);

      res.json({
        backtest: {
          period_days: days, strategy: 'gad_score', min_score: minScore,
          total_signals: rows.length, winning_signals: wins.length,
          win_rate: Math.round(wins.length / rows.length * 100),
          avg_gain_pct: Math.round(avgGain * 10) / 10,
          max_gain_pct: Math.round(maxGain * 10) / 10,
          max_loss_pct: Math.round(maxLoss * 10) / 10,
          run_at: new Date()
        },
        source: 'live'
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ALPHA MEMORY
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /memory/:mint — alpha similarity for a token */
  app.get('/memory/:mint', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const { mint } = req.params;
      const { rows } = await query(`
        SELECT asc2.*, t.symbol, t.name
        FROM alpha_similarity_cache asc2
        JOIN tokens t ON t.id = asc2.token_id
        WHERE t.mint_address = $1
      `, [mint]);
      if (!rows.length) return res.status(404).json({ error: 'No alpha similarity data yet' });
      res.json({ alphaSimilarity: rows[0] });
    });
  });

  /** GET /memory/winners — top historical winners in memory */
  app.get('/memory/winners', async (_req, res: Response) => {
    await safeRes(res, async () => {
      const { rows } = await query(`
        SELECT tm.*, t.symbol, t.name, t.mint_address
        FROM token_memory tm
        JOIN tokens t ON t.id = tm.token_id
        WHERE tm.outcome IN ('WINNER_10X', 'WINNER_50X', 'WINNER_100X')
        ORDER BY tm.peak_gain_x DESC NULLS LAST
        LIMIT 50
      `);
      res.json({ winners: rows, count: rows.length });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WALLET REPUTATION
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /reputation/:address — wallet reputation */
  app.get('/reputation/:address', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const { address } = req.params;
      const { rows } = await query(`
        SELECT wr.*, w.address, w.label
        FROM wallet_reputation wr
        JOIN wallets w ON w.id = wr.wallet_id
        WHERE w.address = $1
      `, [address]);
      if (!rows.length) return res.status(404).json({ error: 'No reputation data for this wallet' });
      res.json({ reputation: rows[0] });
    });
  });

  /** GET /reputation/legends — top LEGEND tier wallets */
  app.get('/reputation/legends', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const limit = Math.min(Number(req.query.limit ?? 20), 100);
      const tier  = (req.query.tier as string ?? 'LEGEND').toUpperCase();
      const { rows } = await query(`
        SELECT wr.reputation_score, wr.reputation_tier, wr.badge, wr.verified_wins,
               wr.avg_hold_hours, w.address, w.label
        FROM wallet_reputation wr
        JOIN wallets w ON w.id = wr.wallet_id
        WHERE wr.reputation_tier = $1
        ORDER BY wr.reputation_score DESC
        LIMIT $2
      `, [tier, limit]);
      res.json({ wallets: rows, tier, count: rows.length });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NARRATIVE ROTATION
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /narratives/rotation — current narrative rotation ranking */
  app.get('/narratives/rotation', async (_req, res: Response) => {
    await safeRes(res, async () => {
      const { rows } = await query(`
        SELECT * FROM narrative_rotation ORDER BY current_rank ASC
      `);
      res.json({ rotation: rows, updatedAt: rows[0]?.updated_at ?? null });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSONAL AI FEED
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /feed/:user_key — personalized token feed */
  app.get('/feed/:user_key', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const { user_key } = req.params;

      // Load preferences
      const prefQ = await query(`
        SELECT * FROM user_preferences WHERE user_key = $1
      `, [user_key]);

      const prefs = prefQ.rows[0] ?? {
        min_gad_score: 60,
        max_risk_score: 70,
        min_opportunity_score: 40,
        preferred_narratives: [],
        excluded_narratives: [],
        preferred_stages: []
      };

      // Build dynamic feed query
      const conditions: string[] = [
        `gs.gad_score >= ${Number(prefs.min_gad_score)}`,
        `gs.risk_score <= ${Number(prefs.max_risk_score)}`
      ];

      if (prefs.min_opportunity_score > 0) {
        conditions.push(`COALESCE(o.opportunity_score, 0) >= ${Number(prefs.min_opportunity_score)}`);
      }
      if (prefs.preferred_narratives?.length) {
        const tags = prefs.preferred_narratives.map((t: string) => `'${t}'`).join(',');
        conditions.push(`ns.narrative_tag IN (${tags})`);
      }
      if (prefs.excluded_narratives?.length) {
        const tags = prefs.excluded_narratives.map((t: string) => `'${t}'`).join(',');
        conditions.push(`ns.narrative_tag NOT IN (${tags})`);
      }
      if (prefs.preferred_stages?.length) {
        const stages = prefs.preferred_stages.map((s: string) => `'${s}'`).join(',');
        conditions.push(`tl.stage IN (${stages})`);
      }

      const { rows } = await query(`
        SELECT
          t.mint_address, t.symbol, t.name, t.market_cap, t.holder_count,
          gs.gad_score, gs.ai_score, gs.risk_score, gs.rug_probability,
          ns.narrative_tag, ns.narrative_score,
          tl.stage AS lifecycle_stage,
          o.opportunity_score, o.reason AS opportunity_reason
        FROM tokens t
        JOIN gad_scores gs ON gs.token_id = t.id
        LEFT JOIN narrative_scores ns ON ns.token_id = t.id
        LEFT JOIN token_lifecycle tl ON tl.token_id = t.id
        LEFT JOIN opportunities o ON o.token_id = t.id AND o.expires_at > now()
        WHERE ${conditions.join(' AND ')}
        ORDER BY COALESCE(o.opportunity_score, gs.gad_score) DESC
        LIMIT 30
      `);

      res.json({
        feed: rows,
        preferences: prefs,
        count: rows.length,
        generatedAt: new Date().toISOString()
      });
    });
  });

  /** POST /feed/preferences — set user feed preferences */
  app.post('/feed/preferences', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const {
        user_key, preferred_narratives, excluded_narratives,
        min_gad_score, max_risk_score, min_opportunity_score,
        preferred_stages, min_market_cap, max_market_cap,
        feed_frequency, push_alerts
      } = req.body;

      if (!user_key) return res.status(400).json({ error: 'user_key is required' });

      const { rows } = await query(`
        INSERT INTO user_preferences
          (user_key, preferred_narratives, excluded_narratives, min_gad_score,
           max_risk_score, min_opportunity_score, preferred_stages,
           min_market_cap, max_market_cap, feed_frequency, push_alerts)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (user_key) DO UPDATE SET
          preferred_narratives = EXCLUDED.preferred_narratives,
          excluded_narratives  = EXCLUDED.excluded_narratives,
          min_gad_score        = EXCLUDED.min_gad_score,
          max_risk_score       = EXCLUDED.max_risk_score,
          min_opportunity_score = EXCLUDED.min_opportunity_score,
          preferred_stages     = EXCLUDED.preferred_stages,
          min_market_cap       = EXCLUDED.min_market_cap,
          max_market_cap       = EXCLUDED.max_market_cap,
          feed_frequency       = EXCLUDED.feed_frequency,
          push_alerts          = EXCLUDED.push_alerts,
          updated_at           = now()
        RETURNING *
      `, [
        user_key,
        preferred_narratives ?? [],
        excluded_narratives  ?? [],
        min_gad_score        ?? 60,
        max_risk_score       ?? 70,
        min_opportunity_score ?? 40,
        preferred_stages     ?? [],
        min_market_cap       ?? null,
        max_market_cap       ?? null,
        feed_frequency       ?? 'realtime',
        push_alerts          ?? true
      ]);

      res.json({ preferences: rows[0] });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SOCIAL SIGNALS (Twitter/X Monitor)
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /social/signals — recent social signals */
  app.get('/social/signals', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const limit  = Math.min(Number(req.query.limit ?? 20), 100);
      const source = req.query.source as string | undefined;
      const params: unknown[] = [limit];
      const where  = source ? `WHERE source = $2` : '';
      if (source) params.push(source);

      const { rows } = await query(`
        SELECT * FROM social_signals
        ${where}
        ORDER BY created_at DESC LIMIT $1
      `, params);
      res.json({ signals: rows, count: rows.length });
    });
  });

  /** GET /social/monitors — list monitored accounts */
  app.get('/social/monitors', async (_req, res: Response) => {
    await safeRes(res, async () => {
      const { rows } = await query(`
        SELECT * FROM monitored_accounts WHERE active = true
        ORDER BY influence_score DESC
      `);
      res.json({ accounts: rows });
    });
  });

  /** POST /social/monitors — add account to monitor */
  app.post('/social/monitors', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const { platform, handle, display_name, influence_score, category } = req.body;
      if (!platform || !handle) return res.status(400).json({ error: 'platform and handle required' });
      const { rows } = await query(`
        INSERT INTO monitored_accounts (platform, handle, display_name, influence_score, category)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (platform, handle) DO UPDATE SET
          display_name    = EXCLUDED.display_name,
          influence_score = EXCLUDED.influence_score,
          active          = true
        RETURNING *
      `, [platform, handle, display_name ?? null, influence_score ?? 50, category ?? 'kol']);
      res.json({ account: rows[0] });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVICTION TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /conviction/top — wallets with highest conviction (holding winners) */
  app.get('/conviction/top', async (req: Request, res: Response) => {
    await safeRes(res, async () => {
      const limit = Math.min(Number(req.query.limit ?? 20), 50);
      const { rows } = await query(`
        SELECT
          ct.*, w.address, w.label, t.symbol, t.mint_address,
          wr.reputation_tier, wr.reputation_score
        FROM conviction_tracking ct
        JOIN wallets w ON w.id = ct.wallet_id
        JOIN tokens t ON t.id = ct.token_id
        LEFT JOIN wallet_reputation wr ON wr.wallet_id = ct.wallet_id
        WHERE ct.status = 'HOLDING' AND ct.hold_hours > 6
        ORDER BY ct.unrealized_x DESC NULLS LAST
        LIMIT $1
      `, [limit]);
      res.json({ convictions: rows, count: rows.length });
    });
  });
}
