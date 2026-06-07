import { query } from '@lib/db';
import {
  executeAutoBuy,
  executeAutoSell,
  getTokenPriceInSol,
  getKeypairFromEnv,
  getConnection,
  SELL_STAGES,
} from '@lib/autobuy';

const POLL_MS   = Number(process.env.AUTOBUY_POLL_SECONDS || '15') * 1000;
const MAX_ERRORS = Number(process.env.AUTOBUY_MAX_ERRORS  || '5');

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutobuyJob {
  id: string;
  mint_address: string;
  label: string | null;
  amount_sol: number;
  slippage_bps: number;
  interval_seconds: number;
  error_count: number;
  autosell_enabled: boolean;
}

interface AutosellStage {
  id: string;
  autobuy_job_id: string;
  mint_address: string;
  stage_number: number;
  trigger_mult: number;
  sell_percent: number;
  entry_price_sol: number;
  tokens_at_stage: number | null;
}

// ─── Buy helpers ──────────────────────────────────────────────────────────────

async function fetchDueJobs(): Promise<AutobuyJob[]> {
  const { rows } = await query<AutobuyJob>(
    `SELECT id, mint_address, label, amount_sol, slippage_bps, interval_seconds,
            error_count, autosell_enabled
     FROM autobuy_jobs
     WHERE active = true AND next_run_at <= now()
     ORDER BY next_run_at ASC LIMIT 20`
  );
  return rows;
}

async function markBuySuccess(
  jobId: string, amountSol: number, signature: string,
  intervalSeconds: number, entryPriceSol: number | null, tokenAmountBought: bigint | null
) {
  await query(
    `UPDATE autobuy_jobs SET
       last_run_at          = now(),
       last_tx_signature    = $1,
       next_run_at          = now() + ($2 || ' seconds')::interval,
       total_buys           = total_buys + 1,
       total_spent_sol      = total_spent_sol + $3,
       error_count          = 0,
       last_error           = NULL,
       entry_price_sol      = COALESCE(entry_price_sol, $4),
       token_amount_bought  = COALESCE(token_amount_bought, 0) + $5
     WHERE id = $6`,
    [signature, String(intervalSeconds), amountSol,
     entryPriceSol, tokenAmountBought ? tokenAmountBought.toString() : '0', jobId]
  );
}

async function markBuyError(jobId: string, error: string, intervalSeconds: number) {
  const { rows } = await query<{ error_count: number }>(
    `UPDATE autobuy_jobs SET
       last_run_at  = now(),
       next_run_at  = now() + ($1 || ' seconds')::interval,
       error_count  = error_count + 1,
       last_error   = $2
     WHERE id = $3 RETURNING error_count`,
    [String(intervalSeconds), error.slice(0, 500), jobId]
  );
  if ((rows[0]?.error_count ?? 0) >= MAX_ERRORS) {
    await query(`UPDATE autobuy_jobs SET active = false WHERE id = $1`, [jobId]);
    console.warn(`[autobuy] Job ${jobId} auto-disabled after ${rows[0].error_count} errors.`);
  }
}

// ─── Create sell stages after a buy ──────────────────────────────────────────

async function createSellStages(
  jobId: string,
  mintAddress: string,
  walletAddress: string,
  entryPriceSol: number,
  tokensBought: bigint
) {
  let tokensRemaining = tokensBought;
  for (const stage of SELL_STAGES) {
    const tokensForStage = tokensRemaining;
    const tokensSold = BigInt(Math.floor(Number(tokensForStage) * stage.sellPct / 100));
    tokensRemaining -= tokensSold;

    await query(
      `INSERT INTO autosell_stages
         (autobuy_job_id, wallet_address, mint_address, stage_number,
          trigger_mult, sell_percent, tokens_at_stage, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
       ON CONFLICT DO NOTHING`,
      [jobId, walletAddress, mintAddress, stage.stage,
       stage.multiplier, stage.sellPct, tokensForStage.toString()]
    );
  }
  console.info(`[autobuy] Created ${SELL_STAGES.length} sell stages for job ${jobId.slice(0, 8)}`);
}

// ─── Sell cycle ───────────────────────────────────────────────────────────────

async function fetchPendingSellStages(): Promise<AutosellStage[]> {
  const { rows } = await query<AutosellStage & { entry_price_sol: number }>(
    `SELECT s.id, s.autobuy_job_id, s.mint_address, s.stage_number,
            s.trigger_mult, s.sell_percent, s.tokens_at_stage,
            j.entry_price_sol
     FROM autosell_stages s
     JOIN autobuy_jobs j ON j.id = s.autobuy_job_id
     WHERE s.status = 'pending'
       AND j.entry_price_sol IS NOT NULL
       AND s.tokens_at_stage IS NOT NULL
     ORDER BY s.stage_number ASC
     LIMIT 50`
  );
  return rows;
}

async function checkAndExecuteSells(walletAddress: string) {
  const stages = await fetchPendingSellStages();
  if (!stages.length) return;

  const keypair = getKeypairFromEnv();
  if (!keypair) return;
  const connection = getConnection();

  // Group by mint to batch price checks
  const byMint = new Map<string, AutosellStage[]>();
  for (const s of stages) {
    const list = byMint.get(s.mint_address) ?? [];
    list.push(s);
    byMint.set(s.mint_address, list);
  }

  for (const [mint, mintStages] of byMint) {
    // Check price once per mint (use first stage's token amount for reference)
    const refStage = mintStages[0];
    if (!refStage.tokens_at_stage || Number(refStage.tokens_at_stage) <= 0) continue;

    let currentPriceSol: number;
    try {
      const { priceSol } = await getTokenPriceInSol(mint, BigInt(Math.floor(refStage.tokens_at_stage)));
      currentPriceSol = priceSol / Number(refStage.tokens_at_stage);
    } catch (err: any) {
      console.warn(`[autosell] Price check failed for ${mint.slice(0,8)}: ${err.message}`);
      continue;
    }

    for (const stage of mintStages.sort((a, b) => a.stage_number - b.stage_number)) {
      const targetPrice = Number(stage.entry_price_sol) * stage.trigger_mult;

      if (currentPriceSol < targetPrice) {
        console.debug(
          `[autosell] Stage ${stage.stage_number} not ready — ` +
          `current ${currentPriceSol.toFixed(10)} < target ${targetPrice.toFixed(10)} ` +
          `(${stage.trigger_mult}x of entry)`
        );
        break; // lower stages must fire first — stop checking higher ones
      }

      // ✅ Target hit — execute sell
      console.info(
        `[autosell] 🎯 Stage ${stage.stage_number} TRIGGERED for ${mint.slice(0,8)} — ` +
        `${stage.trigger_mult}x (${(stage.trigger_mult - 1) * 100}% gain) — ` +
        `selling ${stage.sell_percent}% of position`
      );

      const tokensToSell = BigInt(Math.floor(
        Number(stage.tokens_at_stage) * stage.sell_percent / 100
      ));

      // Mark as triggered so we don't double-sell if something fails
      await query(
        `UPDATE autosell_stages SET status = 'triggered' WHERE id = $1`,
        [stage.id]
      );

      const sellResult = await executeAutoSell(
        { mintAddress: mint, tokenAmount: tokensToSell, slippageBps: 150 },
        connection,
        keypair
      );

      if (sellResult.success) {
        await query(
          `UPDATE autosell_stages SET
             status = 'executed', tokens_sold = $1, sol_received = $2,
             sell_price_sol = $3, tx_signature = $4, executed_at = now()
           WHERE id = $5`,
          [tokensToSell.toString(), sellResult.solReceived, sellResult.currentPriceSol,
           sellResult.txSignature, stage.id]
        );
        await query(
          `UPDATE autobuy_jobs SET
             total_sold_sol = total_sold_sol + $1,
             sell_stage_reached = GREATEST(sell_stage_reached, $2)
           WHERE id = $3`,
          [sellResult.solReceived, stage.stage_number, stage.autobuy_job_id]
        );
        console.info(
          `[autosell] ✅ Stage ${stage.stage_number} SOLD — ` +
          `${tokensToSell.toString()} tokens → ${sellResult.solReceived?.toFixed(4)} SOL ` +
          `tx: ${sellResult.txSignature}`
        );
      } else {
        await query(
          `UPDATE autosell_stages SET status = 'pending' WHERE id = $1`,
          [stage.id]
        );
        console.error(`[autosell] ❌ Stage ${stage.stage_number} sell failed: ${sellResult.error}`);
        break;
      }
    }
  }
}

// ─── Buy cycle ────────────────────────────────────────────────────────────────

async function runBuyCycle() {
  const keypair = getKeypairFromEnv();
  if (!keypair) {
    console.warn('[autobuy] WALLET_PRIVATE_KEY not set — skipping buy cycle.');
    return;
  }

  const connection = getConnection();
  const jobs = await fetchDueJobs();
  if (!jobs.length) return;

  console.info(`[autobuy] Processing ${jobs.length} buy job(s).`);

  for (const job of jobs) {
    const tag = job.label ? `"${job.label}"` : job.mint_address.slice(0, 8) + '...';
    console.info(`[autobuy] Buying ${job.amount_sol} SOL of ${tag}`);

    const result = await executeAutoBuy(
      { mintAddress: job.mint_address, amountSol: Number(job.amount_sol), slippageBps: job.slippage_bps },
      connection, keypair
    );

    if (result.success && result.txSignature) {
      console.info(`[autobuy] ✅ Bought ${tag} — tokens: ${result.outputAmount} tx: ${result.txSignature}`);
      await markBuySuccess(
        job.id, Number(job.amount_sol), result.txSignature, job.interval_seconds,
        result.entryPriceSol ?? null,
        result.outputAmountRaw ?? null
      );

      // Create staged sell orders if autosell is enabled
      if (job.autosell_enabled && result.outputAmountRaw && result.entryPriceSol) {
        await createSellStages(
          job.id, job.mint_address, keypair.publicKey.toBase58(),
          result.entryPriceSol, result.outputAmountRaw
        );
      }
    } else {
      console.error(`[autobuy] ❌ FAIL ${tag} — ${result.error}`);
      await markBuyError(job.id, result.error ?? 'unknown', job.interval_seconds);
    }
  }
}

// ─── Main scheduler ───────────────────────────────────────────────────────────

export async function startAutobuyScheduler() {
  console.info(`[autobuy] Scheduler started. Poll every ${POLL_MS / 1000}s.`);
  console.info(`[autobuy] Sell stages: ${SELL_STAGES.map(s => `${s.multiplier}x(${s.sellPct}%)`).join(' → ')}`);

  let shouldStop = false;
  process.on('SIGINT',  () => { shouldStop = true; });
  process.on('SIGTERM', () => { shouldStop = true; });

  const keypair = getKeypairFromEnv();
  const walletAddress = keypair?.publicKey.toBase58() ?? '';

  while (!shouldStop) {
    try {
      await runBuyCycle();
    } catch (err) {
      console.error('[autobuy] Buy cycle error:', err);
    }

    try {
      if (walletAddress) await checkAndExecuteSells(walletAddress);
    } catch (err) {
      console.error('[autobuy] Sell cycle error:', err);
    }

    if (shouldStop) break;
    await new Promise(r => setTimeout(r, POLL_MS));
  }

  console.info('[autobuy] Scheduler stopped.');
}
