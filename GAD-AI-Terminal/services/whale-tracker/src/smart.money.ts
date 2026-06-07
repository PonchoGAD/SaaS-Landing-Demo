import { query } from '@lib/db';
import { calculateSmartMoneyScore } from './whale.scorer';

const SMART_MONEY_ROI_MIN      = Number(process.env.SMART_MONEY_ROI_MIN      || '50');
const SMART_MONEY_WIN_RATE_MIN = Number(process.env.SMART_MONEY_WIN_RATE_MIN || '55');
const SMART_MONEY_TRADES_MIN   = Number(process.env.SMART_MONEY_TRADES_MIN   || '30');
const SMART_MONEY_AI_BOOST     = Number(process.env.SMART_MONEY_AI_BOOST     || '10');

/** Scan all wallets and qualify / update smart_wallets */
export async function refreshSmartWallets(): Promise<void> {
  const { rows: wallets } = await query<{
    wallet_id: string; roi: number; win_rate: number; total_trades: number;
  }>(`
    SELECT wallet_id,
           avg_roi AS roi,
           CASE WHEN total_trades > 0
                THEN ROUND(winning_trades::numeric / total_trades * 100, 2)
                ELSE 0 END AS win_rate,
           total_trades
    FROM wallet_performance
    WHERE total_trades >= $1
      AND CASE WHEN total_trades > 0
               THEN winning_trades::numeric / total_trades * 100
               ELSE 0 END >= $2
      AND avg_roi >= $3
  `, [SMART_MONEY_TRADES_MIN, SMART_MONEY_WIN_RATE_MIN, SMART_MONEY_ROI_MIN]);

  for (const w of wallets) {
    const score = calculateSmartMoneyScore({
      roi: Number(w.roi),
      winRate: Number(w.win_rate),
      totalTrades: Number(w.total_trades)
    });

    const explanation =
      `ROI ${Number(w.roi).toFixed(0)}% | Win rate ${Number(w.win_rate).toFixed(0)}% | ` +
      `${w.total_trades} trades | Smart Money Score: ${score}`;

    await query(
      `INSERT INTO smart_wallets (wallet_id, smart_money_score, roi, win_rate, total_trades, explanation, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,now())
       ON CONFLICT (wallet_id)
       DO UPDATE SET smart_money_score = $2, roi = $3, win_rate = $4, total_trades = $5,
                     explanation = $6, updated_at = now()`,
      [w.wallet_id, score, w.roi, w.win_rate, w.total_trades, explanation]
    );
  }

  console.info(`[smart-money] Qualified ${wallets.length} smart wallets.`);
}

/** Check if any smart wallets bought a token recently; apply AI score boost */
export async function applySmartMoneyBoosts(): Promise<void> {
  // Find recent smart_wallet buys (last 1h)
  const { rows: signals } = await query<{
    smart_wallet_id: string; wallet_id: string; token_id: string; smart_money_score: number
  }>(`
    SELECT sw.id AS smart_wallet_id, sw.wallet_id, wt.token_id, sw.smart_money_score
    FROM smart_wallets sw
    JOIN wallet_trades wt ON wt.wallet_id = sw.wallet_id
    WHERE wt.side = 'buy'
      AND wt.token_id IS NOT NULL
      AND wt.executed_at > now() - interval '1 hour'
      AND NOT EXISTS (
        SELECT 1 FROM smart_money_token_signals sms
        WHERE sms.smart_wallet_id = sw.id
          AND sms.token_id = wt.token_id
          AND sms.created_at > now() - interval '1 hour'
      )
  `);

  for (const sig of signals) {
    const boostPct = Math.min(SMART_MONEY_AI_BOOST, Math.round(sig.smart_money_score * 0.1));
    const explanation = `Smart Money wallet (score ${sig.smart_money_score}) bought this token.`;

    await query(
      `INSERT INTO smart_money_token_signals (token_id, smart_wallet_id, signal_type, boost_applied, explanation)
       VALUES ($1,$2,'BUY',$3,$4)`,
      [sig.token_id, sig.smart_wallet_id, boostPct, explanation]
    );

    // Boost the latest ai_score for this token
    await query(
      `UPDATE score_history
       SET ai_score = LEAST(100, ai_score + $1),
           explanation = explanation || ' [+SM boost]'
       WHERE token_id = $2
         AND id = (SELECT id FROM score_history WHERE token_id = $2 ORDER BY created_at DESC LIMIT 1)`,
      [boostPct, sig.token_id]
    );

    console.info(`[smart-money] Boost +${boostPct} applied to token ${sig.token_id}`);
  }
}
