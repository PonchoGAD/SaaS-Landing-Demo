/**
 * LiquidityHealth — evaluates exit safety and rug risk from DexScreener pair data.
 * Prevents getting stuck in illiquid positions with high slippage.
 */

export interface LiqHealthResult {
  liquidity_score: number;  // 0-100, higher = safer
  rug_risk:        number;  // 0-100, higher = more dangerous
  safe_exit_sol:   number;  // SOL you can safely sell without >5% price impact
  warning:         string | null;
  auto_exit:       boolean; // true = bot should exit immediately
}

export interface LiqPairData {
  liquidity?: { usd?: number; base?: number; quote?: number };
  volume?:    { m5?: number; h1?: number; h24?: number };
  priceChange?: { m5?: number; h1?: number };
  pairCreatedAt?: number;
  fdv?: number;
  marketCap?: number;
  txns?: { m5?: { buys?: number; sells?: number } };
}

export function assessLiquidity(
  pair: LiqPairData,
  solPriceUsd: number = 60,
  positionSol: number = 0.02
): LiqHealthResult {
  const liqUsd    = Number(pair.liquidity?.usd ?? 0);
  const vol5m     = Number(pair.volume?.m5  ?? 0);
  const vol1h     = Number(pair.volume?.h1  ?? 0);
  const vol24h    = Number(pair.volume?.h24 ?? 0);
  const pc5m      = Number(pair.priceChange?.m5 ?? 0);
  const pc1h      = Number(pair.priceChange?.h1 ?? 0);
  const now       = Date.now();
  const createdAt = pair.pairCreatedAt ?? 0;
  const ageSec    = createdAt > 0 ? (now - createdAt) / 1000 : 999999;
  const buys5m    = pair.txns?.m5?.buys  ?? 0;
  const sells5m   = pair.txns?.m5?.sells ?? 0;

  let rug_risk = 0;
  const warnings: string[] = [];

  // ── Rug Risk Factors ──

  // Very low liquidity = can't exit cleanly
  if (liqUsd < 5000)  { rug_risk += 40; warnings.push(`low liq $${liqUsd.toFixed(0)}`); }
  else if (liqUsd < 15000) { rug_risk += 20; }

  // LP age < 1h = brand new = high rug risk
  if (ageSec < 3600)  { rug_risk += 25; warnings.push('LP age < 1h'); }
  else if (ageSec < 7200) { rug_risk += 10; }

  // Volume collapsing: current vol pace << historical average
  const volPace = vol1h > 0 ? (vol5m * 12) / vol1h : 0;
  if (volPace < 0.1 && vol1h > 1000) { rug_risk += 20; warnings.push('volume collapsing'); }

  // Sells dominating badly in 5m
  const delta5m = buys5m + sells5m > 0 ? (buys5m - sells5m) / (buys5m + sells5m) : 0;
  if (delta5m < -0.5 && sells5m > 5) { rug_risk += 15; warnings.push('heavy sell pressure'); }

  // Rapid price drop — possible rug in progress
  if (pc5m < -15) { rug_risk += 30; warnings.push(`price -${Math.abs(pc5m).toFixed(0)}% in 5m`); }
  else if (pc5m < -8) { rug_risk += 15; warnings.push(`price -${Math.abs(pc5m).toFixed(0)}% in 5m`); }

  // Liquidity score (inverse of rug risk, adjusted by depth)
  const liquidity_score = Math.max(0, Math.min(100,
    100 - rug_risk
    + Math.min(liqUsd / 5000, 10)       // bonus for deep liquidity
    + Math.min(ageSec / 3600, 5)        // bonus for age
  ));

  // Safe exit amount: assume we can trade ~2% of liquidity without >5% impact
  // This is a conservative estimate for memecoin pools
  const safe_exit_usd = liqUsd * 0.02;
  const safe_exit_sol = safe_exit_usd / solPriceUsd;

  const position_usd  = positionSol * solPriceUsd;
  const exit_too_risky = position_usd > liqUsd * 0.05;

  rug_risk = Math.min(100, rug_risk);

  return {
    liquidity_score: Math.round(liquidity_score),
    rug_risk:        Math.round(rug_risk),
    safe_exit_sol:   parseFloat(safe_exit_sol.toFixed(4)),
    warning:         warnings.length > 0 ? warnings.join('; ') : null,
    auto_exit:       rug_risk >= 70 || (pc5m < -15 && liqUsd < 10000) || exit_too_risky,
  };
}
