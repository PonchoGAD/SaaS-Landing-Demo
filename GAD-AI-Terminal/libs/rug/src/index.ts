import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RugCheckInput {
  mintAddress: string;
  top10HolderPct?: number;        // % supply held by top 10 wallets
  liquidityUsd?: number;
  lpLocked?: boolean;
  mintAuthorityRevoked?: boolean;
  freezeAuthorityRevoked?: boolean;
  bundledWallets?: number;
  sniperCount?: number;
  devSoldPct?: number;            // % dev wallet sold
  tokenAgeHours?: number;
}

export interface RugFlags {
  NO_LIQUIDITY_LOCK: boolean;
  MINT_AUTHORITY_ACTIVE: boolean;
  FREEZE_AUTHORITY_ACTIVE: boolean;
  HIGH_TOP10_CONCENTRATION: boolean;
  BUNDLED_LAUNCH: boolean;
  SNIPER_HEAVY: boolean;
  DEV_SOLD_LARGE: boolean;
  VERY_NEW_TOKEN: boolean;
  LOW_LIQUIDITY: boolean;
}

export interface RugResult {
  rugProbability: number;
  flags: Partial<RugFlags>;
  explanation: string;
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

const FLAG_WEIGHTS: Record<keyof RugFlags, number> = {
  NO_LIQUIDITY_LOCK:        20,
  MINT_AUTHORITY_ACTIVE:    18,
  FREEZE_AUTHORITY_ACTIVE:  15,
  HIGH_TOP10_CONCENTRATION: 15,
  BUNDLED_LAUNCH:           12,
  SNIPER_HEAVY:             8,
  DEV_SOLD_LARGE:           10,
  VERY_NEW_TOKEN:           5,
  LOW_LIQUIDITY:            10,
};

export function calculateRugProbability(input: RugCheckInput): RugResult {
  const flags: Partial<RugFlags> = {};
  let score = 0;

  if (input.lpLocked === false)            { flags.NO_LIQUIDITY_LOCK = true; }
  if (input.mintAuthorityRevoked === false){ flags.MINT_AUTHORITY_ACTIVE = true; }
  if (input.freezeAuthorityRevoked === false){ flags.FREEZE_AUTHORITY_ACTIVE = true; }

  const top10 = input.top10HolderPct ?? 0;
  if (top10 > 80)  { flags.HIGH_TOP10_CONCENTRATION = true; }
  if ((input.bundledWallets ?? 0) >= 3) { flags.BUNDLED_LAUNCH = true; }
  if ((input.sniperCount ?? 0) >= 10)  { flags.SNIPER_HEAVY = true; }
  if ((input.devSoldPct ?? 0) >= 50)   { flags.DEV_SOLD_LARGE = true; }
  if ((input.tokenAgeHours ?? 999) < 1){ flags.VERY_NEW_TOKEN = true; }
  if ((input.liquidityUsd ?? 999999) < 5000) { flags.LOW_LIQUIDITY = true; }

  for (const [flag, weight] of Object.entries(FLAG_WEIGHTS) as [keyof RugFlags, number][]) {
    if (flags[flag]) score += weight;
  }

  const rugProbability = Math.min(100, Math.max(0, Math.round(score)));
  const riskLevel: RugResult['riskLevel'] =
    rugProbability >= 80 ? 'EXTREME' :
    rugProbability >= 60 ? 'HIGH' :
    rugProbability >= 40 ? 'MEDIUM' :
    rugProbability >= 20 ? 'LOW' : 'SAFE';

  const activeFlags = Object.keys(flags).filter(f => flags[f as keyof RugFlags]);
  const explanation = activeFlags.length
    ? `Rug flags: ${activeFlags.join(', ')}. Probability ${rugProbability}%.`
    : `No rug flags detected. Token appears relatively safe.`;

  return { rugProbability, flags, explanation, riskLevel };
}

// ─── On-chain checks via Solana RPC ──────────────────────────────────────────

export async function fetchOnChainRugData(
  mintAddress: string,
  connection: Connection
): Promise<Pick<RugCheckInput, 'mintAuthorityRevoked' | 'freezeAuthorityRevoked'>> {
  try {
    const info = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
    const data = (info.value?.data as any)?.parsed?.info;
    return {
      mintAuthorityRevoked:   data?.mintAuthority === null,
      freezeAuthorityRevoked: data?.freezeAuthority === null
    };
  } catch {
    return { mintAuthorityRevoked: undefined, freezeAuthorityRevoked: undefined };
  }
}

/** Fetch top holders via Helius DAS API */
export async function fetchTopHolderConcentration(
  mintAddress: string,
  heliusApiKey: string
): Promise<number> {
  if (!heliusApiKey) return 0;
  try {
    const url = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
    const res = await axios.post(url, {
      jsonrpc: '2.0', id: 1,
      method: 'getTokenLargestAccounts',
      params: [mintAddress]
    }, { timeout: 5000 });
    const accounts: any[] = res.data?.result?.value ?? [];
    // Sum top 10
    const total = accounts.reduce((s: number, a: any) => s + Number(a.uiAmount ?? 0), 0);
    const top10 = accounts.slice(0, 10).reduce((s: number, a: any) => s + Number(a.uiAmount ?? 0), 0);
    return total > 0 ? Math.round((top10 / total) * 100) : 0;
  } catch {
    return 0;
  }
}
