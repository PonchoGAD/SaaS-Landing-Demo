"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
exports.sleep = sleep;
exports.retry = retry;
exports.fetchJson = fetchJson;
exports.upsertToken = upsertToken;
exports.insertTokenMetrics = insertTokenMetrics;
exports.safeFetchTokenMetadata = safeFetchTokenMetadata;
exports.processToken = processToken;
exports.runCollectors = runCollectors;
exports.buildDefaultMetrics = buildDefaultMetrics;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("@lib/db");
const solana_1 = require("@lib/solana");
const risk_1 = require("@lib/risk");
const scoring_1 = require("@lib/scoring");
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function retry(fn, retries = 3, delayMs = 800) {
    let attempt = 0;
    let lastError;
    while (attempt < retries) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            attempt += 1;
            const backoff = delayMs * Math.pow(2, attempt - 1);
            console.warn(`Retry ${attempt}/${retries} failed: ${error instanceof Error ? error.message : String(error)}; waiting ${backoff}ms`);
            await sleep(backoff);
        }
    }
    throw lastError;
}
class RateLimiter {
    constructor(requestsPerMinute) {
        this.lastExecution = 0;
        this.minIntervalMs = Math.max(100, Math.floor((60000 / requestsPerMinute)));
    }
    async schedule(fn) {
        const now = Date.now();
        const waitMs = Math.max(0, this.minIntervalMs - (now - this.lastExecution));
        if (waitMs > 0) {
            await sleep(waitMs);
        }
        const result = await fn();
        this.lastExecution = Date.now();
        return result;
    }
}
exports.RateLimiter = RateLimiter;
async function fetchJson(url, config = {}) {
    return retry(async () => {
        const response = await axios_1.default.request({ url, ...config });
        return response.data;
    });
}
async function upsertToken(mintAddress, metadata = {}) {
    const result = await (0, db_1.query)(`INSERT INTO tokens (mint_address, symbol, name, total_supply, market_cap, last_updated)
      VALUES ($1,$2,$3,$4,$5,now())
      ON CONFLICT (mint_address)
      DO UPDATE SET symbol = COALESCE(EXCLUDED.symbol, tokens.symbol), name = COALESCE(EXCLUDED.name, tokens.name), total_supply = COALESCE(EXCLUDED.total_supply, tokens.total_supply), market_cap = COALESCE(EXCLUDED.market_cap, tokens.market_cap), last_updated = now()
      RETURNING id`, [mintAddress, metadata.symbol || null, metadata.name || null, metadata.totalSupply ?? null, metadata.marketCap ?? null]);
    return result.rows[0].id;
}
async function insertTokenMetrics(tokenId, metrics) {
    await (0, db_1.query)(`INSERT INTO token_metrics (token_id, volume_5m, volume_1h, volume_24h, tx_count_5m, tx_count_1h, tx_count_24h, liquidity_change, price_change_1h, price_change_24h)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [tokenId, metrics.volume_5m, metrics.volume_1h, metrics.volume_24h, metrics.tx_count_5m, metrics.tx_count_1h, metrics.tx_count_24h, metrics.liquidity_change, metrics.price_change_1h, metrics.price_change_24h]);
}
const rateLimiter = new RateLimiter(Number(process.env.SCANNER_API_RATE_PER_MINUTE || '40'));
async function safeFetchTokenMetadata(mintAddress) {
    try {
        const metadata = await retry(async () => {
            const tokenData = await (0, solana_1.getTokenMetadata)(mintAddress);
            const accountInfo = tokenData.accountInfo;
            return {
                symbol: accountInfo?.parsed?.info?.symbol ?? accountInfo?.symbol ?? null,
                name: accountInfo?.parsed?.info?.name ?? accountInfo?.name ?? null,
                totalSupply: accountInfo?.parsed?.info?.supply ? Number(accountInfo.parsed.info.supply) : undefined,
                marketCap: null
            };
        });
        return metadata;
    }
    catch (error) {
        console.error(`Metadata lookup failed for ${mintAddress}:`, error);
        return { symbol: undefined, name: undefined, totalSupply: undefined, marketCap: null };
    }
}
const RISK_ALERT_THRESHOLD = Number(process.env.RISK_ALERT_THRESHOLD || '65');
/** Compute risk + AI score from metrics, persist to score_history + alerts */
async function scoreToken(tokenId, metrics) {
    // Build risk factors from raw metrics
    const liquidityRisk = (0, risk_1.calculateLiquidityRisk)(metrics.liquidity_change);
    // Approximate sell pressure and whale activity from price changes
    const sellPressure = metrics.price_change_1h < 0
        ? Math.min(100, Math.abs(metrics.price_change_1h) * 2)
        : 0;
    const whaleRisk = (0, risk_1.calculateWhaleRisk)(sellPressure);
    // Volume anomaly used as part of volatility proxy
    const volumeAnomalyPct = metrics.volume_1h > 0
        ? Math.max(0, ((metrics.volume_5m * 12) / metrics.volume_1h - 1) * 100)
        : 0;
    const volumeVolatilityBoost = Math.min(30, volumeAnomalyPct * 0.1);
    // Holder concentration: use placeholder unless DB has real data
    const holderRow = await (0, db_1.query)('SELECT holder_count FROM tokens WHERE id = $1', [tokenId]);
    const holderCount = holderRow.rows[0]?.holder_count ?? 0;
    const holderConcentration = holderCount > 0 ? Math.max(0, 100 - Math.log10(holderCount) * 25) : 70;
    const holderRisk = (0, risk_1.calculateHolderRisk)(holderConcentration);
    const riskFactors = {
        liquidityChange: liquidityRisk,
        largeSellPressure: sellPressure,
        holderConcentration: holderRisk,
        whaleActivity: whaleRisk,
        volatility: Math.min(100, Math.abs(metrics.price_change_24h) + volumeVolatilityBoost)
    };
    const overallRisk = (0, risk_1.calculateRiskScore)(riskFactors);
    const explanation = (0, risk_1.explainRiskScore)(riskFactors);
    // Derive AI scoring factors
    const scoreFactors = (0, scoring_1.deriveFactors)({
        priceChange1h: metrics.price_change_1h,
        priceChange24h: metrics.price_change_24h,
        liquidityChangePercent: metrics.liquidity_change,
        volume1h: metrics.volume_1h,
        volume24h: metrics.volume_24h,
        holderCount,
        holderCountBaseline: holderCount,
        riskScore: overallRisk
    });
    const scores = (0, scoring_1.calculateFullScore)(scoreFactors);
    await (0, db_1.query)(`INSERT INTO score_history
       (token_id, growth_score, liquidity_score, volume_score, holder_score, momentum_score, risk_score, ai_score, explanation)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
        tokenId,
        scores.growthScore,
        scores.liquidityScore,
        scores.volumeScore,
        scores.holderScore,
        scores.momentumScore,
        scores.riskScore,
        scores.aiScore,
        scores.explanation
    ]);
    if (overallRisk >= RISK_ALERT_THRESHOLD) {
        const label = (0, risk_1.riskLabel)(overallRisk);
        await (0, db_1.query)(`INSERT INTO alerts (type, subject, payload, score)
       VALUES ($1, $2, $3, $4)`, [
            `RISK_${label}`,
            tokenId,
            JSON.stringify({ riskFactors, overallRisk, explanation }),
            overallRisk
        ]);
        console.warn(`[ALERT] Risk ${label} (${overallRisk}) for token ${tokenId}`);
    }
}
async function processToken(collectorSource, mintAddress, collectorMetrics) {
    const tokenId = await upsertToken(mintAddress, await safeFetchTokenMetadata(mintAddress));
    await insertTokenMetrics(tokenId, collectorMetrics);
    await scoreToken(tokenId, collectorMetrics);
    console.info(`Inserted metrics + score for ${mintAddress} from ${collectorSource}`);
}
async function runCollectors(collectors) {
    const discovered = new Map();
    for (const collector of collectors) {
        try {
            console.info(`Discovering tokens from ${collector.source}`);
            const tokenMints = await collector.discoverNewTokens();
            tokenMints.forEach((mint) => discovered.set(mint, collector.source));
        }
        catch (error) {
            console.error(`Discovery failed for ${collector.source}:`, error);
        }
    }
    const tokens = Array.from(discovered.entries()).slice(0, 120);
    if (!tokens.length) {
        console.info('No new tokens discovered in this cycle.');
        return;
    }
    for (const [mintAddress, source] of tokens) {
        try {
            await rateLimiter.schedule(async () => {
                const metrics = await retry(() => collectors.find((collector) => collector.source === source).fetchTokenMetrics(mintAddress));
                await processToken(source, mintAddress, metrics);
            });
        }
        catch (error) {
            console.error(`Token processing failed for ${mintAddress} from ${source}:`, error);
        }
    }
}
function buildDefaultMetrics() {
    return {
        volume_5m: 0,
        volume_1h: 0,
        volume_24h: 0,
        tx_count_5m: 0,
        tx_count_1h: 0,
        tx_count_24h: 0,
        liquidity_change: 0,
        price_change_1h: 0,
        price_change_24h: 0
    };
}
