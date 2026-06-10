"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverPumpTokens = discoverPumpTokens;
exports.fetchPumpMetrics = fetchPumpMetrics;
const scanner_1 = require("./scanner");
const BASE_URL = process.env.PUMP_FUN_API_BASE || 'https://pump.fun/api';
const API_KEY = process.env.PUMP_FUN_API_KEY;
async function discoverPumpTokens() {
    if (!API_KEY) {
        console.warn('PUMP_FUN_API_KEY is not configured; skipping Pump.fun discovery.');
        return [];
    }
    const url = `${BASE_URL}/v1/token-discovery/recent?limit=40`;
    const response = await (0, scanner_1.retry)(async () => await (0, scanner_1.fetchJson)(url, {
        headers: { Authorization: `Bearer ${API_KEY}` }
    }));
    const items = response.data ?? response.tokens ?? [];
    return items.map((item) => item.mint).filter(Boolean);
}
async function fetchPumpMetrics(mintAddress) {
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
