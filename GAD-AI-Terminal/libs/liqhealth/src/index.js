"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessLiquidity = assessLiquidity;
function assessLiquidity(pair, solPriceUsd = 60, positionSol = 0.02) {
  const liqUsd    = Number(pair.liquidity?.usd ?? 0);
  const vol5m     = Number(pair.volume?.m5  ?? 0);
  const vol1h     = Number(pair.volume?.h1  ?? 0);
  const pc5m      = Number(pair.priceChange?.m5 ?? 0);
  const createdAt = pair.pairCreatedAt ?? 0;
  const ageSec    = createdAt > 0 ? (Date.now() - createdAt) / 1000 : 999999;
  const buys5m    = pair.txns?.m5?.buys  ?? 0;
  const sells5m   = pair.txns?.m5?.sells ?? 0;
  let rug_risk = 0;
  const warnings = [];
  if (liqUsd < 5000)  { rug_risk += 40; warnings.push(`low liq $${liqUsd.toFixed(0)}`); }
  else if (liqUsd < 15000) rug_risk += 20;
  if (ageSec < 3600)  { rug_risk += 25; warnings.push('LP age < 1h'); }
  else if (ageSec < 7200) rug_risk += 10;
  const volPace = vol1h > 0 ? (vol5m * 12) / vol1h : 0;
  if (volPace < 0.1 && vol1h > 1000) { rug_risk += 20; warnings.push('volume collapsing'); }
  const delta5m = buys5m + sells5m > 0 ? (buys5m - sells5m) / (buys5m + sells5m) : 0;
  if (delta5m < -0.5 && sells5m > 5) { rug_risk += 15; warnings.push('heavy sell pressure'); }
  if (pc5m < -15) { rug_risk += 30; warnings.push(`price -${Math.abs(pc5m).toFixed(0)}% in 5m`); }
  else if (pc5m < -8) { rug_risk += 15; warnings.push(`price -${Math.abs(pc5m).toFixed(0)}% in 5m`); }
  const liquidity_score = Math.max(0, Math.min(100, 100 - rug_risk + Math.min(liqUsd / 5000, 10) + Math.min(ageSec / 3600, 5)));
  const safe_exit_sol = (liqUsd * 0.02) / solPriceUsd;
  const exit_too_risky = (positionSol * solPriceUsd) > liqUsd * 0.05;
  rug_risk = Math.min(100, rug_risk);
  return {
    liquidity_score: Math.round(liquidity_score),
    rug_risk: Math.round(rug_risk),
    safe_exit_sol: parseFloat(safe_exit_sol.toFixed(4)),
    warning: warnings.length > 0 ? warnings.join('; ') : null,
    auto_exit: rug_risk >= 70 || (pc5m < -15 && liqUsd < 10000) || exit_too_risky,
  };
}
