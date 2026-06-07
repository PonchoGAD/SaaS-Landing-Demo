import {
  Connection,
  Keypair,
  VersionedTransaction,
  PublicKey,
  clusterApiUrl
} from '@solana/web3.js';
import axios from 'axios';

const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';
const JUPITER_QUOTE_URL = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_URL  = 'https://quote-api.jup.ag/v6/swap';
const LAMPORTS_PER_SOL  = 1_000_000_000;

export interface BuyParams {
  mintAddress: string;
  amountSol: number;
  slippageBps?: number;
  priorityFeeMicroLamports?: number;
}

export interface BuyResult {
  success: boolean;
  txSignature?: string;
  inputAmountSol?: number;
  outputAmount?: string;
  outputAmountRaw?: bigint;
  entryPriceSol?: number;
  error?: string;
}

export interface SellParams {
  mintAddress: string;
  tokenAmount: bigint;
  slippageBps?: number;
  priorityFeeMicroLamports?: number;
}

export interface SellResult {
  success: boolean;
  txSignature?: string;
  tokensIn?: bigint;
  solReceived?: number;
  currentPriceSol?: number;
  error?: string;
}

export interface PriceResult {
  priceSol: number;
  rawQuote?: JupiterQuoteResponse;
}

// ─── Staged sell config ───────────────────────────────────────────────────────
export const SELL_STAGES = [
  { stage: 1, multiplier: 4.0,  sellPct: 75 },   // +300% → sell 75%
  { stage: 2, multiplier: 7.0,  sellPct: 75 },   // +600% → sell 75% of remaining
  { stage: 3, multiplier: 11.0, sellPct: 75 },   // +1000%
  { stage: 4, multiplier: 16.0, sellPct: 75 },   // +1500%
  { stage: 5, multiplier: 21.0, sellPct: 75 },   // +2000%
  { stage: 6, multiplier: 31.0, sellPct: 100 },  // +3000% → sell ALL remaining
] as const;

// ─── Keypair loader ───────────────────────────────────────────────────────────

export function loadKeypairFromString(raw: string): Keypair {
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const bytes = JSON.parse(trimmed) as number[];
      return Keypair.fromSecretKey(Uint8Array.from(bytes));
    } catch {
      throw new Error('WALLET_PRIVATE_KEY looks like a JSON array but could not be parsed.');
    }
  }
  try {
    const bs58 = require('bs58') as { decode: (s: string) => Uint8Array };
    return Keypair.fromSecretKey(bs58.decode(trimmed));
  } catch {
    throw new Error('Could not decode WALLET_PRIVATE_KEY as base58.');
  }
}

export function getKeypairFromEnv(): Keypair | null {
  const raw = process.env.WALLET_PRIVATE_KEY;
  if (!raw) return null;
  return loadKeypairFromString(raw);
}

export function getConnection(): Connection {
  const rpc = process.env.SOLANA_RPC || clusterApiUrl('mainnet-beta');
  return new Connection(rpc, { commitment: 'confirmed' });
}

// ─── Jupiter helpers ──────────────────────────────────────────────────────────

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: unknown[];
}

async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number
): Promise<JupiterQuoteResponse> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: String(amount),
    slippageBps: String(slippageBps)
  });
  const res = await axios.get<JupiterQuoteResponse>(`${JUPITER_QUOTE_URL}?${params}`, { timeout: 10_000 });
  return res.data;
}

async function getSwapTransaction(
  quoteResponse: JupiterQuoteResponse,
  userPublicKey: string,
  priorityFeeMicroLamports?: number
): Promise<{ swapTransaction: string; lastValidBlockHeight: number }> {
  const body: Record<string, unknown> = {
    quoteResponse,
    userPublicKey,
    wrapAndUnwrapSol: true,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: priorityFeeMicroLamports ?? 'auto'
  };
  const res = await axios.post<{ swapTransaction: string; lastValidBlockHeight: number }>(
    JUPITER_SWAP_URL, body, { headers: { 'Content-Type': 'application/json' }, timeout: 15_000 }
  );
  return res.data;
}

async function sendAndConfirm(
  connection: Connection,
  keypair: Keypair,
  swapTransaction: string
): Promise<string> {
  const txBuffer = Buffer.from(swapTransaction, 'base64');
  const tx = VersionedTransaction.deserialize(txBuffer);
  tx.sign([keypair]);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 2
  });
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
  return signature;
}

// ─── Get token price in SOL via Jupiter ──────────────────────────────────────

export async function getTokenPriceInSol(
  mintAddress: string,
  tokenAmount: bigint,
  slippageBps = 100
): Promise<PriceResult> {
  const quote = await getQuote(mintAddress, NATIVE_SOL_MINT, Number(tokenAmount), slippageBps);
  const solLamports = Number(quote.outAmount);
  const priceSol = solLamports / LAMPORTS_PER_SOL;
  return { priceSol, rawQuote: quote };
}

// ─── Buy SOL → TOKEN ─────────────────────────────────────────────────────────

export async function executeAutoBuy(
  params: BuyParams,
  connection: Connection,
  keypair: Keypair
): Promise<BuyResult> {
  const { mintAddress, amountSol, slippageBps = 100, priorityFeeMicroLamports } = params;

  if (amountSol <= 0) return { success: false, error: 'amountSol must be > 0' };

  try {
    new PublicKey(mintAddress);
  } catch {
    return { success: false, error: `Invalid mint address: ${mintAddress}` };
  }

  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  try {
    const quote = await getQuote(NATIVE_SOL_MINT, mintAddress, lamports, slippageBps);
    const { swapTransaction } = await getSwapTransaction(
      quote, keypair.publicKey.toBase58(), priorityFeeMicroLamports
    );
    const signature = await sendAndConfirm(connection, keypair, swapTransaction);

    const outputAmountRaw = BigInt(quote.outAmount);
    const entryPriceSol = Number(outputAmountRaw) > 0
      ? lamports / LAMPORTS_PER_SOL / Number(outputAmountRaw)
      : 0;

    return {
      success: true,
      txSignature: signature,
      inputAmountSol: amountSol,
      outputAmount: quote.outAmount,
      outputAmountRaw,
      entryPriceSol
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg.length > 300 ? msg.slice(0, 300) + '...' : msg };
  }
}

// ─── Sell TOKEN → SOL ─────────────────────────────────────────────────────────

export async function executeAutoSell(
  params: SellParams,
  connection: Connection,
  keypair: Keypair
): Promise<SellResult> {
  const { mintAddress, tokenAmount, slippageBps = 150, priorityFeeMicroLamports } = params;

  if (tokenAmount <= 0n) return { success: false, error: 'tokenAmount must be > 0' };

  try {
    new PublicKey(mintAddress);
  } catch {
    return { success: false, error: `Invalid mint address: ${mintAddress}` };
  }

  try {
    const quote = await getQuote(mintAddress, NATIVE_SOL_MINT, Number(tokenAmount), slippageBps);
    const { swapTransaction } = await getSwapTransaction(
      quote, keypair.publicKey.toBase58(), priorityFeeMicroLamports
    );
    const signature = await sendAndConfirm(connection, keypair, swapTransaction);

    const solLamports = Number(quote.outAmount);
    const solReceived = solLamports / LAMPORTS_PER_SOL;
    const currentPriceSol = Number(tokenAmount) > 0 ? solReceived / Number(tokenAmount) : 0;

    return {
      success: true,
      txSignature: signature,
      tokensIn: tokenAmount,
      solReceived,
      currentPriceSol
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg.length > 300 ? msg.slice(0, 300) + '...' : msg };
  }
}
