import { query } from '@lib/db';
import { fetchLargeTransactions, saveWhaleTx } from './helius.tracker';
import { calculateWhaleScore } from './whale.scorer';
import { refreshSmartWallets, applySmartMoneyBoosts } from './smart.money';

const POLL_INTERVAL_MS = Number(process.env.WHALE_POLL_SECONDS || '60') * 1000;

async function runWhaleCycle(): Promise<void> {
  // 1. Fetch large transactions from Helius
  const txs = await fetchLargeTransactions();
  for (const tx of txs) {
    try {
      await saveWhaleTx(tx);
    } catch (err: any) {
      console.warn('[whale-tracker] save tx error:', err.message);
    }
  }
  if (txs.length) console.info(`[whale-tracker] Saved ${txs.length} whale transactions.`);

  // 2. Recalculate whale scores for wallets with recent activity
  const { rows: activeWallets } = await query<{ id: string; wallet_id: string }>(`
    SELECT DISTINCT w.id
    FROM wallets w
    JOIN wallet_trades wt ON wt.wallet_id = w.id
    WHERE wt.executed_at > now() - interval '2 hours'
  `);

  for (const { id: walletId } of activeWallets) {
    try {
      await recalcWhaleScore(walletId);
    } catch (err: any) {
      console.warn('[whale-tracker] score error:', err.message);
    }
  }

  // 3. Update wallet performance table
  await updateWalletPerformance();

  // 4. Refresh smart money qualifications
  await refreshSmartWallets();

  // 5. Apply smart money boosts to AI scores
  await applySmartMoneyBoosts();
}

async function recalcWhaleScore(walletId: string): Promise<void> {
  const { rows: stats } = await query<{
    buy_count: number; sell_count: number; win_count: number;
    total_trades: number; total_usd: number; max_usd: number;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE side = 'buy')  AS buy_count,
      COUNT(*) FILTER (WHERE side = 'sell') AS sell_count,
      COUNT(*) FILTER (WHERE side = 'sell' AND usd_value > 0) AS win_count,
      COUNT(*)                               AS total_trades,
      COALESCE(SUM(usd_value), 0)            AS total_usd,
      COALESCE(MAX(usd_value), 0)            AS max_usd
    FROM wallet_trades
    WHERE wallet_id = $1
  `, [walletId]);

  if (!stats.length) return;
  const s = stats[0];
  const totalTrades = Number(s.total_trades);
  if (totalTrades < 3) return;

  const buyCount  = Number(s.buy_count);
  const sellCount = Number(s.sell_count);
  const winRate   = totalTrades > 0 ? (Number(s.win_count) / totalTrades) * 100 : 0;

  // Very rough ROI estimate: average profitable sell vs buy ratio
  const roi = winRate > 50 ? (winRate - 50) * 1.5 : 0;

  const whaleScore = calculateWhaleScore({
    buyCount,
    sellCount,
    winRate,
    roi,
    avgHoldSeconds: 1800,      // placeholder; real hold time needs entry/exit matching
    largestTrade: Number(s.max_usd),
    totalVolume: Number(s.total_usd)
  });

  await query(
    `INSERT INTO whale_scores (wallet_id, whale_score, buy_count, sell_count, win_rate, roi, pnl, largest_trade, last_scored)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
     ON CONFLICT (wallet_id) DO UPDATE
       SET whale_score = $2, buy_count = $3, sell_count = $4, win_rate = $5,
           roi = $6, pnl = $7, largest_trade = $8, last_scored = now()`,
    [walletId, whaleScore, buyCount, sellCount,
     Math.round(winRate * 100) / 100, roi,
     Number(s.total_usd) * (winRate / 100 - 0.4),
     Number(s.max_usd)]
  );
}

async function updateWalletPerformance(): Promise<void> {
  await query(`
    INSERT INTO wallet_performance (wallet_id, total_trades, winning_trades, losing_trades,
                                    total_volume, total_pnl, avg_roi, best_trade, worst_trade, updated_at)
    SELECT
      wallet_id,
      COUNT(*)                                            AS total_trades,
      COUNT(*) FILTER (WHERE side = 'sell' AND usd_value > 0) AS winning_trades,
      COUNT(*) FILTER (WHERE side = 'sell' AND usd_value <= 0) AS losing_trades,
      COALESCE(SUM(usd_value), 0)                         AS total_volume,
      0                                                   AS total_pnl,
      0                                                   AS avg_roi,
      COALESCE(MAX(usd_value), 0)                         AS best_trade,
      COALESCE(MIN(usd_value), 0)                         AS worst_trade,
      now()
    FROM wallet_trades
    GROUP BY wallet_id
    ON CONFLICT (wallet_id) DO UPDATE
      SET total_trades   = EXCLUDED.total_trades,
          winning_trades = EXCLUDED.winning_trades,
          losing_trades  = EXCLUDED.losing_trades,
          total_volume   = EXCLUDED.total_volume,
          best_trade     = EXCLUDED.best_trade,
          worst_trade    = EXCLUDED.worst_trade,
          updated_at     = now()
  `);
}

export async function startWhaleTracker(): Promise<void> {
  console.info(`[whale-tracker] Started. Polling every ${POLL_INTERVAL_MS / 1000}s`);

  let shouldStop = false;
  process.on('SIGINT',  () => { shouldStop = true; });
  process.on('SIGTERM', () => { shouldStop = true; });

  while (!shouldStop) {
    try {
      await runWhaleCycle();
    } catch (err) {
      console.error('[whale-tracker] Cycle error:', err);
    }
    if (shouldStop) break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.info('[whale-tracker] Stopped.');
}
