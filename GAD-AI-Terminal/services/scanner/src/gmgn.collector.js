"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverGmgnTokens = discoverGmgnTokens;
exports.fetchGmgnMetrics = fetchGmgnMetrics;
const scanner_1 = require("./scanner");
const BASE_URL = process.env.GMGN_API_BASE || 'https://api.gmgn.xyz';
const API_KEY = process.env.GMGN_API_KEY;
async function discoverGmgnTokens() {
    if (!API_KEY) {
        console.warn('GMGN_API_KEY is not configured; skipping GMGN discovery.');
        return [];
    }
    const url = `${BASE_URL}/v1/tokens/recent`;
    const response = await (0, scanner_1.retry)(async () => await (0, scanner_1.fetchJson)(url, {
        headers: { Authorization: `Bearer ${API_KEY}` }
    }));
    const candidates = response.mints ?? response.tokens?.map((item) => item.mint) ?? [];
    return candidates.filter(Boolean).slice(0, 40);
}
async function fetchGmgnMetrics(mintAddress) {
    if (!API_KEY) {
        return (0, scanner_1.buildDefaultMetrics)();
    }
    const url = `${BASE_URL}/v1/token/${mintAddress}/metrics`;
    const metrics = await (0, scanner_1.retry)(async () => await (0, scanner_1.fetchJson)(url, {
        headers: { Authorization: `Bearer ${API_KEY}` }
    }));
    return {
        volume_5m: Number(metrics?.volume_5m ?? 0),
        volume_1h: Number(metrics?.volume_1h ?? 0),
        volume_24h: Number(metrics?.volume_24h ?? 0),
        tx_count_5m: Number(metrics?.tx_count_5m ?? 0),
        tx_count_1h: Number(metrics?.tx_count_1h ?? 0),
        tx_count_24h: Number(metrics?.tx_count_24h ?? 0),
        liquidity_change: Number(metrics?.liquidity_change ?? 0),
        price_change_1h: Number(metrics?.price_change_1h ?? 0),
        price_change_24h: Number(metrics?.price_change_24h ?? 0)
    };
}
