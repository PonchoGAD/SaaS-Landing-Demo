"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAlert = createAlert;
exports.createAlerts = createAlerts;
exports.getActiveAlerts = getActiveAlerts;
exports.getAlertsByMint = getAlertsByMint;
exports.getAlertsByType = getAlertsByType;
exports.resolveAlert = resolveAlert;
exports.alertFiredRecently = alertFiredRecently;
const db_1 = require("@lib/db");
/** Persist one alert and return the saved record */
async function createAlert(input) {
    const { rows } = await (0, db_1.query)(`INSERT INTO alerts (type, subject, payload, score)
     VALUES ($1, $2, $3, $4)
     RETURNING *`, [input.type, input.subject, JSON.stringify(input.payload), input.score]);
    return rows[0];
}
/** Persist many alerts in one call; returns all saved records */
async function createAlerts(inputs) {
    if (!inputs.length)
        return [];
    const results = [];
    for (const input of inputs) {
        results.push(await createAlert(input));
    }
    return results;
}
/** Fetch unresolved alerts, newest first */
async function getActiveAlerts(limit = 50) {
    const { rows } = await (0, db_1.query)(`SELECT * FROM alerts WHERE resolved = false ORDER BY created_at DESC LIMIT $1`, [limit]);
    return rows;
}
/** Fetch all alerts for a specific token subject (mint address) */
async function getAlertsByMint(mintAddress, limit = 20) {
    const { rows } = await (0, db_1.query)(`SELECT * FROM alerts WHERE subject = $1 ORDER BY created_at DESC LIMIT $2`, [mintAddress, limit]);
    return rows;
}
/** Fetch alerts of a specific type */
async function getAlertsByType(type, limit = 50) {
    const { rows } = await (0, db_1.query)(`SELECT * FROM alerts WHERE type = $1 ORDER BY created_at DESC LIMIT $2`, [type, limit]);
    return rows;
}
/** Mark one alert as resolved */
async function resolveAlert(id) {
    await (0, db_1.query)(`UPDATE alerts SET resolved = true WHERE id = $1`, [id]);
}
/** Check whether an alert of this type for this subject was already fired recently */
async function alertFiredRecently(type, subject, withinMinutes = 60) {
    const { rows } = await (0, db_1.query)(`SELECT COUNT(*) AS cnt FROM alerts
     WHERE type = $1 AND subject = $2
       AND created_at > now() - ($3 || ' minutes')::interval`, [type, subject, String(withinMinutes)]);
    return Number(rows[0]?.cnt ?? 0) > 0;
}
