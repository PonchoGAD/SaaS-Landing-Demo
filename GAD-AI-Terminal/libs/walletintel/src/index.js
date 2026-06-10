"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSmartWallets = getSmartWallets;
exports.checkSmartWalletActivity = checkSmartWalletActivity;
const axios_1 = require("axios");
async function getSmartWallets(db) {
  try {
    const { rows } = await db.query(`
      SELECT address, win_rate, roi as avg_roi, total_trades as trades,
        (win_rate * 0.5 + LEAST(roi, 200) / 200.0 * 0.5) as score
      FROM whale_scores WHERE win_rate >= 65 AND total_trades >= 20
      ORDER BY score DESC LIMIT 50
    `);
    return rows.map(r => ({ address: r.address, win_rate: Number(r.win_rate), avg_roi: Number(r.avg_roi), trades: Number(r.trades), score: Number(r.score) }));
  } catch { return []; }
}
async function checkSmartWalletActivity(mint, smartWallets, heliusApiKey, lookbackMinutes = 30) {
  if (!smartWallets.length || !heliusApiKey) return { mint, smart_wallets_in: [], confidence: 0, copy_buy: false, reason: 'not configured' };
  try {
    const since = Math.floor((Date.now() - lookbackMinutes * 60 * 1000) / 1000);
    const url = `https://api.helius.xyz/v0/addresses/${mint}/transactions?api-key=${heliusApiKey}&limit=50&type=SWAP`;
    const res = await axios_1.default.get(url, { timeout: 8000 });
    const txs = res.data ?? [];
    const smartSet = new Set(smartWallets.map(w => w.address));
    const found = [];
    for (const tx of txs) {
      if (tx.timestamp < since) continue;
      const signer = tx.feePayer ?? tx.accountData?.[0]?.account;
      if (signer && smartSet.has(signer)) {
        const isIn = tx.tokenTransfers?.some(t => t.mint === mint && t.toUserAccount === signer);
        if (isIn && !found.includes(signer)) found.push(signer);
      }
    }
    if (!found.length) return { mint, smart_wallets_in: [], confidence: 0, copy_buy: false, reason: 'no smart wallet activity' };
    const avgScore = found.reduce((s, a) => s + (smartWallets.find(x => x.address === a)?.score ?? 0.5), 0) / found.length;
    const confidence = Math.min(1, avgScore * found.length * 0.5);
    return { mint, smart_wallets_in: found, confidence, copy_buy: confidence >= 0.4, reason: `${found.length} smart wallet(s) bought in last ${lookbackMinutes}min` };
  } catch { return { mint, smart_wallets_in: [], confidence: 0, copy_buy: false, reason: 'helius error' }; }
}
