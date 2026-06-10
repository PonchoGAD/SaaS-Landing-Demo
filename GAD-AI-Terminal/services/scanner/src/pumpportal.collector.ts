/**
 * PumpPortal WebSocket Collector
 * Official real-time pump.fun token feed — no auth, works from any IP.
 * https://pumpportal.fun/api/data
 *
 * Connects, subscribes to new token events, collects for N seconds, returns mints.
 * Provides name/symbol/metadata that other collectors miss.
 */

import WebSocket from 'ws';
import { buildDefaultMetrics, TokenMetricsPayload } from './scanner';

const WS_URL     = process.env.PUMPPORTAL_WS_URL || 'wss://pumpportal.fun/api/data';
const COLLECT_MS = Number(process.env.PUMPPORTAL_COLLECT_SECONDS || '15') * 1000;

export interface PumpPortalToken {
  mint:            string;
  name?:           string;
  symbol?:         string;
  description?:    string;
  image_uri?:      string;
  twitter?:        string;
  telegram?:       string;
  marketCapSol?:   number;
  vSolInBondingCurve?: number;
  traderPublicKey?:    string;
  createdAt?:      number;
}

// In-memory buffer of latest tokens seen via WebSocket
// (persists between calls if scanner keeps the module loaded)
const tokenBuffer: Map<string, PumpPortalToken> = new Map();
let wsInstance: WebSocket | null = null;
let wsConnected = false;

/** Start a persistent WebSocket connection to PumpPortal */
export function startPumpPortalListener(): void {
  if (wsInstance && wsConnected) return;

  const connect = () => {
    try {
      const ws = new WebSocket(WS_URL);
      wsInstance = ws;

      ws.on('open', () => {
        wsConnected = true;
        ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
        console.info('[pumpportal] Connected, listening for new tokens...');
      });

      ws.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as PumpPortalToken & { txType?: string };
          if (msg.mint && (msg.txType === 'create' || !msg.txType)) {
            tokenBuffer.set(msg.mint, {
              mint:            msg.mint,
              name:            msg.name,
              symbol:          msg.symbol,
              description:     msg.description,
              image_uri:       msg.image_uri,
              twitter:         msg.twitter,
              telegram:        msg.telegram,
              marketCapSol:    msg.marketCapSol,
              vSolInBondingCurve: msg.vSolInBondingCurve,
              traderPublicKey: msg.traderPublicKey,
              createdAt:       Date.now(),
            });
          }
        } catch { /* ignore malformed frames */ }
      });

      ws.on('error', (err) => {
        console.warn('[pumpportal] WS error:', err.message);
        wsConnected = false;
      });

      ws.on('close', () => {
        console.warn('[pumpportal] WS closed, reconnecting in 5s...');
        wsConnected = false;
        wsInstance = null;
        setTimeout(connect, 5000);
      });
    } catch (err: any) {
      console.warn('[pumpportal] connect failed:', err.message);
      setTimeout(connect, 10000);
    }
  };

  connect();
}

/**
 * Returns mint addresses buffered since last call.
 * Clears old entries (> 5 minutes) to prevent memory growth.
 */
export async function discoverPumpPortalTokens(): Promise<string[]> {
  // Ensure WS is running
  startPumpPortalListener();

  const now = Date.now();
  const EXPIRE_MS = 5 * 60 * 1000;

  // Drain buffer: return all mints, remove expired
  const fresh: string[] = [];
  for (const [mint, token] of tokenBuffer.entries()) {
    if (token.createdAt && now - token.createdAt > EXPIRE_MS) {
      tokenBuffer.delete(mint);
    } else {
      fresh.push(mint);
    }
  }

  if (fresh.length > 0) {
    console.info(`[pumpportal] ${fresh.length} new pump.fun tokens buffered`);
  }

  return fresh.slice(0, 100);
}

/** Get token metadata from buffer (for name/symbol enrichment) */
export function getPumpPortalMetadata(mint: string): Partial<PumpPortalToken> {
  return tokenBuffer.get(mint) ?? {};
}

/** Metrics: pump.fun tokens don't have h1 volume yet — use marketCapSol as proxy */
export async function fetchPumpPortalMetrics(_mintAddress: string): Promise<TokenMetricsPayload> {
  const meta = tokenBuffer.get(_mintAddress);
  return {
    ...buildDefaultMetrics(),
    volume_1h:  meta?.marketCapSol ?? 0,
    volume_24h: meta?.marketCapSol ?? 0,
  };
}
