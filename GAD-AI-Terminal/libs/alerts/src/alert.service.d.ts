import { TokenAlertContext, AlertRecord } from './alert.types';
/**
 * Evaluate all alert rules for a token context, deduplicate against recent
 * firings, and persist new alerts to the DB.
 *
 * Returns the list of alerts that were actually created.
 */
export declare function processTokenAlerts(ctx: TokenAlertContext): Promise<AlertRecord[]>;
