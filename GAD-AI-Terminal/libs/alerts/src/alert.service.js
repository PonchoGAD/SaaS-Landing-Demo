"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTokenAlerts = processTokenAlerts;
const alert_rules_1 = require("./alert.rules");
const alert_repository_1 = require("./alert.repository");
/**
 * Evaluate all alert rules for a token context, deduplicate against recent
 * firings, and persist new alerts to the DB.
 *
 * Returns the list of alerts that were actually created.
 */
async function processTokenAlerts(ctx) {
    const candidates = (0, alert_rules_1.evaluateRules)(ctx);
    if (!candidates.length)
        return [];
    const toCreate = [];
    for (const candidate of candidates) {
        // Avoid re-firing the same alert type for the same token within 1 hour
        const alreadyFired = await (0, alert_repository_1.alertFiredRecently)(candidate.type, candidate.subject, 60);
        if (!alreadyFired) {
            toCreate.push(candidate);
        }
    }
    if (!toCreate.length)
        return [];
    const created = await (0, alert_repository_1.createAlerts)(toCreate);
    if (created.length) {
        const types = created.map((a) => a.type).join(', ');
        console.info(`[alerts] Created ${created.length} alert(s) for ${ctx.mintAddress}: ${types}`);
    }
    return created;
}
