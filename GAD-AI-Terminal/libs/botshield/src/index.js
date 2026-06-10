"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectBotActivity = detectBotActivity;
exports.getRandomizedSlippage = getRandomizedSlippage;
exports.randomTradeDelay = randomTradeDelay;
function detectBotActivity(pair) {
  const buys5m  = pair.txns?.m5?.buys  ?? 0;
  const sells5m = pair.txns?.m5?.sells ?? 0;
  const vol5m   = Number(pair.volume?.m5 ?? 0);
  const pc5m    = Number(pair.priceChange?.m5 ?? 0);
  const total_txs = buys5m + sells5m;
  const avg_usd_per_tx = total_txs > 0 ? vol5m / total_txs : 0;
  let threat = 'NONE';
  let bot_type = 'none';
  const issues = [];
  if (total_txs > 0 && total_txs <= 3 && Math.abs(pc5m) > 5) {
    threat = 'HIGH'; bot_type = 'sandwich';
    issues.push(`${total_txs} txns moved price ${pc5m.toFixed(1)}%`);
  }
  if (total_txs > 20 && avg_usd_per_tx < 5 && Math.abs(pc5m) < 0.5) {
    threat = threat === 'HIGH' ? 'HIGH' : 'LOW';
    bot_type = bot_type !== 'none' ? bot_type : 'wash_trade';
    issues.push(`${total_txs} micro-txns`);
  }
  const buy_ratio = total_txs > 0 ? buys5m / total_txs : 0;
  if (buy_ratio > 0.9 && total_txs > 5 && pc5m > 15) {
    threat = threat === 'HIGH' ? 'HIGH' : 'LOW';
    bot_type = bot_type !== 'none' ? bot_type : 'sniper_exit';
  }
  const delay = threat === 'HIGH' ? 5 : threat === 'LOW' ? 2 : 0;
  return { threat_level: threat, bot_type, recommended_delay: delay, safe_to_trade: threat !== 'HIGH', slippage_bps: getRandomizedSlippage(threat) };
}
function getRandomizedSlippage(threat = 'NONE') {
  const base = threat === 'HIGH' ? 150 : threat === 'LOW' ? 120 : 100;
  return base + Math.floor(Math.random() * 30);
}
async function randomTradeDelay(minMs = 0, maxMs = 2000) {
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs));
  if (ms > 0) await new Promise(r => setTimeout(r, ms));
}
