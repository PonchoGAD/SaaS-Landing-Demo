import { query } from '@lib/db';
import { AlertInput, AlertRecord } from './alert.types';

/** Persist one alert and return the saved record */
export async function createAlert(input: AlertInput): Promise<AlertRecord> {
  const { rows } = await query<AlertRecord>(
    `INSERT INTO alerts (type, subject, payload, score)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.type, input.subject, JSON.stringify(input.payload), input.score]
  );
  return rows[0];
}

/** Persist many alerts in one call; returns all saved records */
export async function createAlerts(inputs: AlertInput[]): Promise<AlertRecord[]> {
  if (!inputs.length) return [];
  const results: AlertRecord[] = [];
  for (const input of inputs) {
    results.push(await createAlert(input));
  }
  return results;
}

/** Fetch unresolved alerts, newest first */
export async function getActiveAlerts(limit = 50): Promise<AlertRecord[]> {
  const { rows } = await query<AlertRecord>(
    `SELECT * FROM alerts WHERE resolved = false ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

/** Fetch all alerts for a specific token subject (mint address) */
export async function getAlertsByMint(mintAddress: string, limit = 20): Promise<AlertRecord[]> {
  const { rows } = await query<AlertRecord>(
    `SELECT * FROM alerts WHERE subject = $1 ORDER BY created_at DESC LIMIT $2`,
    [mintAddress, limit]
  );
  return rows;
}

/** Fetch alerts of a specific type */
export async function getAlertsByType(type: string, limit = 50): Promise<AlertRecord[]> {
  const { rows } = await query<AlertRecord>(
    `SELECT * FROM alerts WHERE type = $1 ORDER BY created_at DESC LIMIT $2`,
    [type, limit]
  );
  return rows;
}

/** Mark one alert as resolved */
export async function resolveAlert(id: string): Promise<void> {
  await query(`UPDATE alerts SET resolved = true WHERE id = $1`, [id]);
}

/** Check whether an alert of this type for this subject was already fired recently */
export async function alertFiredRecently(
  type: string,
  subject: string,
  withinMinutes = 60
): Promise<boolean> {
  const { rows } = await query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM alerts
     WHERE type = $1 AND subject = $2
       AND created_at > now() - ($3 || ' minutes')::interval`,
    [type, subject, String(withinMinutes)]
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}
