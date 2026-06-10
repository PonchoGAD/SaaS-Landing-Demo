/**
 * WalletIntel — tracks "smart wallets" and provides copy-trade signals.
 * Scans recent Helius transactions for a token mint to see if known
 * smart wallets (win rate > 65%, 20+ trades) recently bought.
 */

import axios from 'axios';

export interface SmartWalletSignal {
  mint:              string;
  smart_wallets_in:  string[];   // wallets that recently bought
  confidence:        number;     // 0-1
  copy_buy:          boolean;    // recommend copying
  reason:            string;
}

export interface WalletStats {
  address:   string;
  win_rate:  number;
  avg_roi:   number;
  trades:    number;
  score:     number;
}

// ── Smart wallet registry: query from DB ──────────────────────────────────────

export async function getSmartWallets(
  db: { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> }
): Promise<WalletStats[]> {
  const { rows } = await db.query(`
    SELECT address, win_rate, roi as avg_roi, total_trades as trades,
      (win_rate * 0.5 + LEAST(roi, 200) / 200 * 0.5) as score
    FROM whale_scores
    WHERE win_rate >= 65 AND total_trades >= 20
    ORDER BY (win_rate * 0.5 + LEAST(roi, 200) / 200 * 0.5) DESC
    LIMIT 50
  `);
  return rows.map(r => ({
    address:  r.address,
    win_rate: Number(r.win_rate),
    avg_roi:  Number(r.avg_roi),
    trades:   Number(r.trades),
    score:    Number(r.score),
  }));
}

// ── Check if smart wallets recently bought a mint ────────────────────────────

export async function checkSmartWalletActivity(
  mint: string,
  smartWallets: WalletStats[],
  heliusApiKey: string,
  lookbackMinutes = 30
): Promise<SmartWalletSignal> {
  if (!smartWallets.length || !heliusApiKey) {
    return { mint, smart_wallets_in: [], confidence: 0, copy_buy: false, reason: 'no smart wallets configured' };
  }

  try {
    const since = Math.floor((Date.now() - lookbackMinutes * 60 * 1000) / 1000);
    const url   = `https://api.helius.xyz/v0/addresses/${mint}/transactions?api-key=${heliusApiKey}&limit=50&type=SWAP`;
    const res   = await axios.get(url, { timeout: 8_000 });
    const txs: any[] = res.data ?? [];

    const smartSet = new Set(smartWallets.map(w => w.address));
    const foundWallets: string[] = [];

    for (const tx of txs) {
      if (tx.timestamp < since) continue;
      const signer = tx.feePayer ?? tx.accountData?.[0]?.account;
      if (signer && smartSet.has(signer)) {
        // Verify it's a BUY (SOL → token swap)
        const isSwapIn = tx.tokenTransfers?.some((t: any) =>
          t.mint === mint && t.toUserAccount === signer
        );
        if (isSwapIn && !foundWallets.includes(signer)) {
          foundWallets.push(signer);
        }
      }
    }

    if (!foundWallets.length) {
      return { mint, smart_wallets_in: [], confidence: 0, copy_buy: false, reason: 'no smart wallet activity' };
    }

    const avgScore = foundWallets.reduce((sum, addr) => {
      const w = smartWallets.find(x => x.address === addr);
      return sum + (w?.score ?? 0.5);
    }, 0) / foundWallets.length;

    const confidence = Math.min(1, avgScore * foundWallets.length * 0.5);
    const copy_buy   = confidence >= 0.4 && foundWallets.length >= 1;
    const reason     = `${foundWallets.length} smart wallet(s) bought in last ${lookbackMinutes}min`;

    return { mint, smart_wallets_in: foundWallets, confidence, copy_buy, reason };
  } catch {
    return { mint, smart_wallets_in: [], confidence: 0, copy_buy: false, reason: 'helius error' };
  }
}
