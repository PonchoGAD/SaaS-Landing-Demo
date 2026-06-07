/**
 * Social Monitor — main loop
 * Polls monitored_accounts every N minutes, stores social_signals in DB,
 * and updates hype scores for mentioned tokens.
 */
import { query } from '@lib/db';
import { fetchTweetsForHandle } from './twitter';

const POLL_INTERVAL_MS = Number(process.env.SOCIAL_POLL_INTERVAL_SECONDS ?? '120') * 1000;

interface MonitoredAccount {
  id:              string;
  platform:        string;
  handle:          string;
  influence_score: number;
  last_checked_at: string | null;
}

/** Fetch accounts that need checking (haven't been checked in POLL_INTERVAL) */
async function getDueAccounts(): Promise<MonitoredAccount[]> {
  const { rows } = await query<MonitoredAccount>(`
    SELECT id, platform, handle, influence_score, last_checked_at
    FROM monitored_accounts
    WHERE active = true
      AND (last_checked_at IS NULL OR last_checked_at < now() - ($1 || ' seconds')::interval)
    ORDER BY influence_score DESC
    LIMIT 10
  `, [String(POLL_INTERVAL_MS / 1000)]);
  return rows;
}

/** Store a signal in DB and link to any detected tokens */
async function storeSocialSignal(
  account: MonitoredAccount,
  tweetId: string,
  text: string,
  detectedMints: string[],
  sentiment: number,
  engagement: number,
  createdAt: Date
): Promise<void> {
  // Upsert signal (idempotent on source_id)
  await query(`
    INSERT INTO social_signals
      (source, source_id, author, content, detected_tokens, sentiment, engagement, influence_score)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT DO NOTHING
  `, [
    account.platform,
    tweetId,
    account.handle,
    text.slice(0, 2000),
    detectedMints,
    sentiment,
    engagement,
    account.influence_score
  ]);

  // Bump social_metrics velocity for each mentioned token
  for (const mint of detectedMints) {
    await query(`
      UPDATE social_metrics sm
      SET mention_count    = mention_count + 1,
          mention_velocity = mention_velocity + 1,
          snapshot_at      = now()
      FROM tokens t
      WHERE t.id = sm.token_id AND t.mint_address = $1
    `, [mint]).catch(() => {});
  }
}

/** Poll a single Twitter account */
async function pollTwitterAccount(account: MonitoredAccount): Promise<number> {
  // Load sinceId from last processed tweet
  const lastQ = await query<{ source_id: string }>(
    `SELECT source_id FROM social_signals WHERE author = $1 AND source = 'twitter' ORDER BY created_at DESC LIMIT 1`,
    [account.handle]
  );
  const sinceId = lastQ.rows[0]?.source_id;

  const tweets = await fetchTweetsForHandle(account.handle, sinceId);
  let stored = 0;

  for (const tweet of tweets) {
    // Only store if it has token mentions OR if from a very high-influence account
    if (tweet.detectedMints.length > 0 || account.influence_score >= 80) {
      await storeSocialSignal(
        account,
        tweet.id,
        tweet.text,
        tweet.detectedMints,
        tweet.sentiment,
        tweet.engagement,
        tweet.createdAt
      );
      stored++;
    }
  }

  return stored;
}

/** Mark account as checked */
async function markChecked(accountId: string): Promise<void> {
  await query(`UPDATE monitored_accounts SET last_checked_at = now() WHERE id = $1`, [accountId]);
}

/** One monitoring cycle */
async function runMonitorCycle(): Promise<void> {
  const accounts = await getDueAccounts();
  if (!accounts.length) return;

  for (const account of accounts) {
    try {
      let count = 0;

      if (account.platform === 'twitter') {
        count = await pollTwitterAccount(account);
      }
      // Future: add telegram channel polling here

      if (count > 0) {
        console.info(`[social] @${account.handle}: ${count} new signals stored`);
      }
    } catch (err: any) {
      console.warn(`[social] @${account.handle} failed: ${err.message}`);
    } finally {
      await markChecked(account.id);
    }

    // Rate limit: 1 request/second
    await new Promise(r => setTimeout(r, 1000));
  }
}

/** Mark high-engagement signals as processed and route to intelligence */
async function processUnprocessedSignals(): Promise<void> {
  const { rows } = await query<{
    id: string; author: string; content: string;
    detected_tokens: string[]; influence_score: number; engagement: number;
  }>(`
    SELECT id, author, content, detected_tokens, influence_score, engagement
    FROM social_signals
    WHERE processed = false
      AND (array_length(detected_tokens, 1) > 0 OR engagement > 100)
    ORDER BY created_at DESC
    LIMIT 50
  `);

  for (const sig of rows) {
    // Mark as processed
    await query(`UPDATE social_signals SET processed = true WHERE id = $1`, [sig.id]);

    // Log high-impact signals
    if (sig.influence_score >= 80 && sig.detected_tokens.length > 0) {
      console.info(
        `[social] HIGH-IMPACT: @${sig.author} (influence ${sig.influence_score}) ` +
        `mentions ${sig.detected_tokens.join(', ')} | engagement ${sig.engagement}`
      );
    }
  }
}

export async function startSocialMonitor(): Promise<void> {
  console.info(`[social] Social Monitor started. Poll interval: ${POLL_INTERVAL_MS / 1000}s`);

  let shouldStop = false;
  process.on('SIGINT',  () => { shouldStop = true; });
  process.on('SIGTERM', () => { shouldStop = true; });

  while (!shouldStop) {
    try {
      await runMonitorCycle();
      await processUnprocessedSignals();
    } catch (err: any) {
      console.error('[social] Cycle error:', err.message);
    }

    if (shouldStop) break;
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.info('[social] Social Monitor stopped.');
}
