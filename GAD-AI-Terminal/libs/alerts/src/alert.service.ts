import { evaluateRules } from './alert.rules';
import { createAlerts, alertFiredRecently } from './alert.repository';
import { TokenAlertContext, AlertRecord } from './alert.types';

/**
 * Evaluate all alert rules for a token context, deduplicate against recent
 * firings, and persist new alerts to the DB.
 *
 * Returns the list of alerts that were actually created.
 */
export async function processTokenAlerts(ctx: TokenAlertContext): Promise<AlertRecord[]> {
  const candidates = evaluateRules(ctx);
  if (!candidates.length) return [];

  const toCreate = [];
  for (const candidate of candidates) {
    // Avoid re-firing the same alert type for the same token within 1 hour
    const alreadyFired = await alertFiredRecently(candidate.type, candidate.subject, 60);
    if (!alreadyFired) {
      toCreate.push(candidate);
    }
  }

  if (!toCreate.length) return [];

  const created = await createAlerts(toCreate);
  if (created.length) {
    const types = created.map((a) => a.type).join(', ');
    console.info(`[alerts] Created ${created.length} alert(s) for ${ctx.mintAddress}: ${types}`);
  }
  return created;
}
