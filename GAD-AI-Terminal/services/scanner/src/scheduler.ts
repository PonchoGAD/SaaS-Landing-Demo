import { Collector, runCollectors } from './scanner';
import { discoverPumpTokens, fetchPumpMetrics } from './pump.collector';
import { discoverGmgnTokens, fetchGmgnMetrics } from './gmgn.collector';
import { discoverAxiomTokens, fetchAxiomMetrics } from './axiom.collector';
import { discoverHeliusTokens, fetchHeliusMetrics } from './helius.collector';
import { discoverDexScreenerTokens, fetchDexScreenerMetrics, searchDexScreenerTokens } from './dexscreener.collector';
import { updateMarketRegime } from './regime.updater';

const intervalMs = Number(process.env.SCANNER_INTERVAL_SECONDS || '30') * 1000;
const REGIME_INTERVAL_MS = 5 * 60 * 1000;

// DexScreener first — reliable from VPS, no auth, no IP blocks
const collectors: Collector[] = [
  {
    source: 'dexscreener',
    discoverNewTokens: discoverDexScreenerTokens,
    fetchTokenMetrics: fetchDexScreenerMetrics
  },
  {
    source: 'pump.fun',
    discoverNewTokens: discoverPumpTokens,
    fetchTokenMetrics: fetchPumpMetrics
  },
  {
    source: 'gmgn',
    discoverNewTokens: discoverGmgnTokens,
    fetchTokenMetrics: fetchGmgnMetrics
  },
  {
    source: 'axiom',
    discoverNewTokens: discoverAxiomTokens,
    fetchTokenMetrics: fetchAxiomMetrics
  },
  {
    source: 'helius',
    discoverNewTokens: discoverHeliusTokens,
    fetchTokenMetrics: fetchHeliusMetrics
  }
];

export async function startScanner() {
  console.info(`Scanner started. Running every ${intervalMs / 1000}s.`);

  let shouldStop = false;
  process.on('SIGINT', () => {
    console.info('Scanner sigint received, shutting down gracefully.');
    shouldStop = true;
  });
  process.on('SIGTERM', () => {
    console.info('Scanner sigterm received, shutting down gracefully.');
    shouldStop = true;
  });

  // Run regime update immediately on start, then every 5 minutes
  updateMarketRegime().catch(err => console.error('[regime] Initial update failed:', err));
  const regimeTimer = setInterval(() => {
    updateMarketRegime().catch(err => console.error('[regime] Update failed:', err));
  }, REGIME_INTERVAL_MS);

  while (!shouldStop) {
    try {
      await runCollectors(collectors);
    } catch (error) {
      console.error('Scanner cycle failed:', error);
    }

    if (shouldStop) break;

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  clearInterval(regimeTimer);
  console.info('Scanner shutdown complete.');
}
