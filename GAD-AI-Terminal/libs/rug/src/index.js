"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRugProbability = calculateRugProbability;
exports.fetchOnChainRugData = fetchOnChainRugData;
exports.fetchTopHolderConcentration = fetchTopHolderConcentration;
const web3_js_1 = require("@solana/web3.js");
const axios_1 = __importDefault(require("axios"));
// ─── Scoring ──────────────────────────────────────────────────────────────────
const FLAG_WEIGHTS = {
    NO_LIQUIDITY_LOCK: 20,
    MINT_AUTHORITY_ACTIVE: 18,
    FREEZE_AUTHORITY_ACTIVE: 15,
    HIGH_TOP10_CONCENTRATION: 15,
    BUNDLED_LAUNCH: 12,
    SNIPER_HEAVY: 8,
    DEV_SOLD_LARGE: 10,
    VERY_NEW_TOKEN: 5,
    LOW_LIQUIDITY: 10,
};
function calculateRugProbability(input) {
    const flags = {};
    let score = 0;
    if (input.lpLocked === false) {
        flags.NO_LIQUIDITY_LOCK = true;
    }
    if (input.mintAuthorityRevoked === false) {
        flags.MINT_AUTHORITY_ACTIVE = true;
    }
    if (input.freezeAuthorityRevoked === false) {
        flags.FREEZE_AUTHORITY_ACTIVE = true;
    }
    const top10 = input.top10HolderPct ?? 0;
    if (top10 > 80) {
        flags.HIGH_TOP10_CONCENTRATION = true;
    }
    if ((input.bundledWallets ?? 0) >= 3) {
        flags.BUNDLED_LAUNCH = true;
    }
    if ((input.sniperCount ?? 0) >= 10) {
        flags.SNIPER_HEAVY = true;
    }
    if ((input.devSoldPct ?? 0) >= 50) {
        flags.DEV_SOLD_LARGE = true;
    }
    if ((input.tokenAgeHours ?? 999) < 1) {
        flags.VERY_NEW_TOKEN = true;
    }
    if ((input.liquidityUsd ?? 999999) < 5000) {
        flags.LOW_LIQUIDITY = true;
    }
    for (const [flag, weight] of Object.entries(FLAG_WEIGHTS)) {
        if (flags[flag])
            score += weight;
    }
    const rugProbability = Math.min(100, Math.max(0, Math.round(score)));
    const riskLevel = rugProbability >= 80 ? 'EXTREME' :
        rugProbability >= 60 ? 'HIGH' :
            rugProbability >= 40 ? 'MEDIUM' :
                rugProbability >= 20 ? 'LOW' : 'SAFE';
    const activeFlags = Object.keys(flags).filter(f => flags[f]);
    const explanation = activeFlags.length
        ? `Rug flags: ${activeFlags.join(', ')}. Probability ${rugProbability}%.`
        : `No rug flags detected. Token appears relatively safe.`;
    return { rugProbability, flags, explanation, riskLevel };
}
// ─── On-chain checks via Solana RPC ──────────────────────────────────────────
async function fetchOnChainRugData(mintAddress, connection) {
    try {
        const info = await connection.getParsedAccountInfo(new web3_js_1.PublicKey(mintAddress));
        const data = info.value?.data?.parsed?.info;
        return {
            mintAuthorityRevoked: data?.mintAuthority === null,
            freezeAuthorityRevoked: data?.freezeAuthority === null
        };
    }
    catch {
        return { mintAuthorityRevoked: undefined, freezeAuthorityRevoked: undefined };
    }
}
/** Fetch top holders via Helius DAS API */
async function fetchTopHolderConcentration(mintAddress, heliusApiKey) {
    if (!heliusApiKey)
        return 0;
    try {
        const url = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
        const res = await axios_1.default.post(url, {
            jsonrpc: '2.0', id: 1,
            method: 'getTokenLargestAccounts',
            params: [mintAddress]
        }, { timeout: 5000 });
        const accounts = res.data?.result?.value ?? [];
        // Sum top 10
        const total = accounts.reduce((s, a) => s + Number(a.uiAmount ?? 0), 0);
        const top10 = accounts.slice(0, 10).reduce((s, a) => s + Number(a.uiAmount ?? 0), 0);
        return total > 0 ? Math.round((top10 / total) * 100) : 0;
    }
    catch {
        return 0;
    }
}
