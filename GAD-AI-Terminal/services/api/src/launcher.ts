/**
 * CoinLauncher — deploy and track own tokens on pump.fun
 *
 * Principles:
 *  - Owner deploys a real token with their own initial liquidity
 *  - No fake volume, no satellite wallets, no price manipulation
 *  - Tracks own P&L and position honestly
 *  - Exit = sell owner's own tokens at market price
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { Keypair, Connection, VersionedTransaction, Transaction } from '@solana/web3.js';
import { query } from '@lib/db';

const PUMPPORTAL_CREATE_URL = 'https://pumpportal.fun/api/create';
const PUMPPORTAL_TRADE_URL  = 'https://pumpportal.fun/api/trade-local';
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const DEXSCREENER = 'https://api.dexscreener.com/latest/dex/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LaunchParams {
  name: string;
  ticker: string;
  description: string;
  logoPath: string;      // local path to uploaded image file
  solBudget: number;     // total SOL budget (initial buy from this budget)
  website?: string;
  twitter?: string;
  telegram?: string;
}

export interface LaunchResult {
  success: boolean;
  mintAddress?: string;
  txSignature?: string;
  error?: string;
}

export interface CoinStatus {
  mintAddress: string;
  name: string;
  ticker: string;
  status: string;
  solInvested: number;
  currentPriceSol: number | null;
  peakPriceSol: number | null;
  totalSoldSol: number;
  pnlSol: number;
  pnlPct: number | null;
  holderCount: number;
  launchedAt: string;
}

// ─── Keypair helper ───────────────────────────────────────────────────────────

function getOwnerKeypair(): Keypair | null {
  const raw = process.env.WALLET_PRIVATE_KEY;
  if (!raw) return null;
  try {
    if (raw.trim().startsWith('[')) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
    }
    const bs58 = require('bs58') as { decode: (s: string) => Uint8Array };
    return Keypair.fromSecretKey(bs58.decode(raw.trim()));
  } catch {
    return null;
  }
}

// ─── Sign and send transaction ────────────────────────────────────────────────

async function signAndSend(txBytes: Uint8Array, keypair: Keypair, connection: Connection): Promise<string> {
  try {
    const tx = VersionedTransaction.deserialize(txBytes);
    tx.sign([keypair]);
    return await connection.sendTransaction(tx, { skipPreflight: false, maxRetries: 3 });
  } catch {
    const tx = Transaction.from(Buffer.from(txBytes));
    tx.partialSign(keypair);
    return await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  }
}

// ─── Launch token ─────────────────────────────────────────────────────────────

export async function launchToken(params: LaunchParams): Promise<LaunchResult> {
  const keypair = getOwnerKeypair();
  if (!keypair) return { success: false, error: 'WALLET_PRIVATE_KEY not configured' };

  if (!fs.existsSync(params.logoPath)) {
    return { success: false, error: `Logo file not found: ${params.logoPath}` };
  }

  // Initial buy = 40% of total budget (owner's own liquidity, not manipulation)
  const initialBuySol = parseFloat((params.solBudget * 0.40).toFixed(4));

  try {
    const form = new FormData();
    form.append('name', params.name);
    form.append('symbol', params.ticker);
    form.append('description', params.description);
    form.append('showName', 'true');
    if (params.website)  form.append('website',  params.website);
    if (params.twitter)  form.append('twitter',  params.twitter);
    if (params.telegram) form.append('telegram', params.telegram);
    form.append('file', fs.createReadStream(params.logoPath), {
      filename: path.basename(params.logoPath),
      contentType: 'image/png',
    });

    // PumpPortal returns metadata URI after upload
    const metaRes = await axios.post('https://pump.fun/api/ipfs', form, {
      headers: form.getHeaders(),
      timeout: 30_000,
    });
    const metadataUri: string = metaRes.data?.metadataUri;
    if (!metadataUri) return { success: false, error: 'Failed to upload metadata to IPFS' };

    // Generate a fresh mint keypair (pump.fun requires this)
    const mintKeypair = Keypair.generate();

    // Build create+buy transaction via PumpPortal
    const txRes = await axios.post(
      PUMPPORTAL_CREATE_URL,
      {
        publicKey:       keypair.publicKey.toBase58(),
        action:          'create',
        tokenMetadata:   { name: params.name, symbol: params.ticker, uri: metadataUri },
        mint:            mintKeypair.publicKey.toBase58(),
        denominatedInSol: 'true',
        amount:          initialBuySol,
        slippage:        10,
        priorityFee:     0.0005,
        pool:            'pump',
      },
      { responseType: 'arraybuffer', timeout: 20_000 }
    );

    const connection = new Connection(SOLANA_RPC, 'confirmed');
    const txBytes = new Uint8Array(txRes.data as ArrayBuffer);

    // Must sign with BOTH the owner keypair AND the mint keypair
    const tx = VersionedTransaction.deserialize(txBytes);
    tx.sign([keypair, mintKeypair]);
    const signature = await connection.sendTransaction(tx, { skipPreflight: false, maxRetries: 3 });

    const mintAddress = mintKeypair.publicKey.toBase58();

    // Persist to DB
    await query(
      `INSERT INTO launched_tokens
         (mint_address, name, ticker, description, logo_url, website, telegram_link, twitter_link,
          launch_tx, sol_invested, status, launched_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'LIVE',now())`,
      [mintAddress, params.name, params.ticker, params.description,
       metadataUri, params.website ?? null, params.telegram ?? null, params.twitter ?? null,
       signature, params.solBudget]
    );

    await logEvent(mintAddress, 'LAUNCH',
      `🚀 Token deployed: ${params.name} (${params.ticker}) | initial buy: ${initialBuySol} SOL`,
      null, initialBuySol, signature);

    console.info(`[launcher] ✅ Launched ${params.name} (${params.ticker}) mint:${mintAddress} tx:${signature}`);
    return { success: true, mintAddress, txSignature: signature };

  } catch (err: any) {
    const msg = err.response?.data
      ? JSON.stringify(err.response.data).slice(0, 200)
      : err.message?.slice(0, 200);
    console.error(`[launcher] ❌ Launch failed: ${msg}`);
    return { success: false, error: msg };
  }
}

// ─── Sell owner's position ────────────────────────────────────────────────────

export async function sellPosition(
  mintAddress: string,
  pct: number = 100
): Promise<{ success: boolean; solReceived?: number; error?: string }> {
  const keypair = getOwnerKeypair();
  if (!keypair) return { success: false, error: 'WALLET_PRIVATE_KEY not configured' };

  try {
    const connection = new Connection(SOLANA_RPC, 'confirmed');
    const solBefore = await connection.getBalance(keypair.publicKey) / 1e9;

    const res = await axios.post(
      PUMPPORTAL_TRADE_URL,
      {
        publicKey:        keypair.publicKey.toBase58(),
        action:           'sell',
        mint:             mintAddress,
        amount:           `${pct}%`,
        denominatedInSol: 'false',
        slippage:         15,
        priorityFee:      0.0005,
        pool:             'auto',
      },
      { responseType: 'arraybuffer', timeout: 20_000 }
    );

    const txBytes = new Uint8Array(res.data as ArrayBuffer);
    const sig = await signAndSend(txBytes, keypair, connection);
    await new Promise(r => setTimeout(r, 3000));
    const solAfter = await connection.getBalance(keypair.publicKey) / 1e9;
    const received = Math.max(0, solAfter - solBefore);

    await query(
      `UPDATE launched_tokens SET
         total_sold_sol = total_sold_sol + $1,
         status = CASE WHEN $2 = 100 THEN 'SOLD' ELSE status END,
         sold_at = CASE WHEN $2 = 100 THEN now() ELSE sold_at END,
         updated_at = now()
       WHERE mint_address = $3`,
      [received, pct, mintAddress]
    );

    await logEvent(mintAddress, 'SELL',
      `💸 Sold ${pct}% of position → ${received.toFixed(4)} SOL`, null, received, sig);

    return { success: true, solReceived: received };
  } catch (err: any) {
    const msg = err.message?.slice(0, 200);
    return { success: false, error: msg };
  }
}

// ─── Refresh price from DexScreener ──────────────────────────────────────────

export async function refreshPrice(mintAddress: string): Promise<number | null> {
  try {
    const res = await axios.get(`${DEXSCREENER}/${mintAddress}`, { timeout: 6_000 });
    const pairs: any[] = res.data?.pairs ?? [];
    if (!pairs.length) return null;
    const best = pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    const priceSol = Number(best.priceNative ?? 0);
    const holders = best.holders ?? 0;
    if (priceSol <= 0) return null;

    await query(
      `UPDATE launched_tokens SET
         current_price_sol = $1,
         peak_price_sol = GREATEST(COALESCE(peak_price_sol, 0), $1),
         holder_count = GREATEST(holder_count, $2),
         updated_at = now()
       WHERE mint_address = $3`,
      [priceSol, holders, mintAddress]
    );
    return priceSol;
  } catch {
    return null;
  }
}

// ─── List all coins ───────────────────────────────────────────────────────────

export async function listCoins(): Promise<CoinStatus[]> {
  const { rows } = await query<any>(
    `SELECT mint_address, name, ticker, status, sol_invested,
            current_price_sol, peak_price_sol, total_sold_sol,
            holder_count, launched_at
     FROM launched_tokens
     ORDER BY launched_at DESC`
  );
  return rows.map(r => {
    const invested = Number(r.sol_invested);
    const sold     = Number(r.total_sold_sol);
    const pnlSol   = sold - invested;
    const pnlPct   = invested > 0 ? (pnlSol / invested) * 100 : null;
    return {
      mintAddress:     r.mint_address,
      name:            r.name,
      ticker:          r.ticker,
      status:          r.status,
      solInvested:     invested,
      currentPriceSol: r.current_price_sol ? Number(r.current_price_sol) : null,
      peakPriceSol:    r.peak_price_sol    ? Number(r.peak_price_sol)    : null,
      totalSoldSol:    sold,
      pnlSol,
      pnlPct,
      holderCount:     r.holder_count ?? 0,
      launchedAt:      r.launched_at,
    };
  });
}

// ─── Background price refresh (every 5 min for LIVE tokens) ──────────────────

export function startLauncherPriceRefresh() {
  const INTERVAL_MS = Number(process.env.LAUNCHER_REFRESH_INTERVAL_MS || 5 * 60 * 1000);
  setInterval(async () => {
    try {
      const { rows } = await query<any>(
        `SELECT mint_address FROM launched_tokens WHERE status = 'LIVE'`
      );
      for (const r of rows) {
        await refreshPrice(r.mint_address).catch(() => {});
      }
      if (rows.length) console.info(`[launcher] Refreshed prices for ${rows.length} LIVE token(s)`);
    } catch (err: any) {
      console.error('[launcher] Price refresh error:', err.message);
    }
  }, INTERVAL_MS);
  console.info('[launcher] Price refresh scheduler started (every 5 min)');
}

// ─── Log helper ───────────────────────────────────────────────────────────────

async function logEvent(
  mint: string, type: string, message: string,
  priceSol: number | null, solAmount: number | null, tx?: string
) {
  await query(
    `INSERT INTO launcher_events (mint, event_type, message, price_sol, sol_amount, tx)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [mint, type, message, priceSol, solAmount ?? null, tx ?? null]
  ).catch(() => {});
}
