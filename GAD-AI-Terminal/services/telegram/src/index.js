"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
const token = process.env.TELEGRAM_BOT_TOKEN;
const apiBase = process.env.API_BASE_URL || 'http://localhost:4000';
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
}
const bot = new node_telegram_bot_api_1.default(token, { polling: true });
const formatList = (items) => items.map((item, index) => `${index + 1}. ${item}`).join('\n');
async function fetchApi(path) {
    const response = await axios_1.default.get(`${apiBase}${path}`);
    return response.data;
}
async function postApi(path, body) {
    const response = await axios_1.default.post(`${apiBase}${path}`, body);
    return response.data;
}
async function deleteApi(path) {
    const response = await axios_1.default.delete(`${apiBase}${path}`);
    return response.data;
}
async function patchApi(path, body) {
    const response = await axios_1.default.patch(`${apiBase}${path}`, body);
    return response.data;
}
// ─── Existing commands ────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'GAD AI Terminal\n\n' +
        '/scan — scan trending tokens\n' +
        '/trending — top tokens by market cap\n' +
        '/token <mint> — token detail\n' +
        '/wallet <address> — wallet stats\n' +
        '/watchlist — your watchlist\n' +
        '/risk <mint> — risk & AI score\n' +
        '/signals — active risk signals\n\n' +
        '💰 Auto-buy\n' +
        '/autobuy list — show jobs\n' +
        '/autobuy add <mint> <sol> <interval_min> [label] — create job\n' +
        '/autobuy stop <id_prefix> — deactivate job\n' +
        '/autobuy resume <id_prefix> — re-activate job\n' +
        '/autobuy delete <id_prefix> — delete job');
});
bot.onText(/\/scan/, async (msg) => {
    bot.sendMessage(msg.chat.id, 'Scanning watchlist and ranking new tokens...');
    try {
        const result = await fetchApi('/tokens');
        const message = `Top tokens:\n${formatList(result.tokens.slice(0, 5).map((t) => `${t.symbol || t.mint_address} (${t.mint_address})`))}`;
        bot.sendMessage(msg.chat.id, message);
    }
    catch (error) {
        bot.sendMessage(msg.chat.id, `Scan failed: ${error}`);
    }
});
bot.onText(/\/trending/, async (msg) => {
    try {
        const result = await fetchApi('/tokens');
        const trending = result.tokens.slice(0, 5).map((t) => `${t.symbol || t.mint_address}: mc=${t.market_cap || 'N/A'}`);
        bot.sendMessage(msg.chat.id, `Trending tokens:\n${formatList(trending)}`);
    }
    catch (error) {
        bot.sendMessage(msg.chat.id, `Failed to load trending: ${error}`);
    }
});
bot.onText(/\/token (.+)/, async (msg, match) => {
    const mint = (match?.[1] || '').trim();
    if (!mint)
        return bot.sendMessage(msg.chat.id, 'Please provide a token mint address.');
    try {
        const result = await fetchApi(`/tokens/${mint}`);
        bot.sendMessage(msg.chat.id, `Token ${result.token.symbol || mint}\nName: ${result.token.name || 'n/a'}\nHolders: ${result.token.holder_count || 'n/a'}\nMarket cap: ${result.token.market_cap || 'n/a'}\nRecent tx: ${result.metrics.length}`);
    }
    catch (error) {
        bot.sendMessage(msg.chat.id, `Token lookup failed: ${error}`);
    }
});
bot.onText(/\/wallet (.+)/, async (msg, match) => {
    const address = (match?.[1] || '').trim();
    if (!address)
        return bot.sendMessage(msg.chat.id, 'Please provide a wallet address.');
    try {
        const result = await fetchApi(`/wallets/${address}`);
        bot.sendMessage(msg.chat.id, `Wallet ${address}\nPnL: ${result.wallet.pnl}\nWin rate: ${result.wallet.win_rate}%\nTotal trades: ${result.wallet.total_trades}`);
    }
    catch (error) {
        bot.sendMessage(msg.chat.id, `Wallet lookup failed: ${error}`);
    }
});
bot.onText(/\/watchlist/, async (msg) => {
    try {
        const result = await fetchApi('/watchlist');
        const tokenLines = result.tokens.slice(0, 8).map((t) => `${t.symbol || t.mint_address}`);
        const walletLines = result.wallets.slice(0, 8).map((w) => `${w.address}`);
        bot.sendMessage(msg.chat.id, `Watchlist tokens:\n${formatList(tokenLines)}\n\nWatchlist wallets:\n${formatList(walletLines)}`);
    }
    catch (error) {
        bot.sendMessage(msg.chat.id, `Watchlist fetch failed: ${error}`);
    }
});
bot.onText(/\/risk (.+)/, async (msg, match) => {
    const mint = (match?.[1] || '').trim();
    if (!mint)
        return bot.sendMessage(msg.chat.id, 'Please provide a token mint address.');
    try {
        const result = await fetchApi(`/risk/${mint}`);
        const latest = result.riskHistory[0] || {};
        bot.sendMessage(msg.chat.id, `Risk for ${mint}\nRisk: ${latest.risk_score ?? 'N/A'}\nAI Score: ${latest.ai_score ?? 'N/A'}\n${latest.explanation || ''}`);
    }
    catch (error) {
        bot.sendMessage(msg.chat.id, `Risk lookup failed: ${error}`);
    }
});
bot.onText(/\/signals/, async (msg) => {
    try {
        const result = await fetchApi('/signals');
        const lines = result.signals.slice(0, 6).map((s) => `${s.type}: ${s.subject} (score ${s.score || 0})`);
        bot.sendMessage(msg.chat.id, `Recent signals:\n${formatList(lines)}`);
    }
    catch (error) {
        bot.sendMessage(msg.chat.id, `Signals fetch failed: ${error}`);
    }
});
// ─── Auto-buy commands ────────────────────────────────────────────────────────
/** /autobuy list */
bot.onText(/\/autobuy list/, async (msg) => {
    try {
        const result = await fetchApi('/autobuy');
        const jobs = result.jobs;
        if (!jobs.length)
            return bot.sendMessage(msg.chat.id, 'No auto-buy jobs configured.');
        const lines = jobs.map((j) => {
            const status = j.active ? '🟢' : '🔴';
            const interval = j.interval_seconds >= 3600
                ? `${j.interval_seconds / 3600}h`
                : `${j.interval_seconds / 60}m`;
            const label = j.label ? `"${j.label}" ` : '';
            const idShort = j.id.slice(0, 8);
            return `${status} [${idShort}] ${label}${j.mint_address.slice(0, 8)}… ${j.amount_sol} SOL every ${interval} | buys: ${j.total_buys} | err: ${j.error_count}`;
        });
        bot.sendMessage(msg.chat.id, `Auto-buy jobs:\n\n${lines.join('\n')}`);
    }
    catch (error) {
        bot.sendMessage(msg.chat.id, `Failed to fetch jobs: ${error}`);
    }
});
/**
 * /autobuy add <mint> <sol> <interval_min> [label]
 * Example: /autobuy add So111...APC 0.05 30 myToken
 */
bot.onText(/\/autobuy add (.+)/, async (msg, match) => {
    const parts = (match?.[1] || '').trim().split(/\s+/);
    if (parts.length < 3) {
        return bot.sendMessage(msg.chat.id, 'Usage: /autobuy add <mint> <amount_sol> <interval_minutes> [label]\nExample: /autobuy add ABC...XYZ 0.1 60 my-token');
    }
    const [mint, solStr, intervalMinStr, ...labelParts] = parts;
    const amountSol = parseFloat(solStr);
    const intervalMinutes = parseFloat(intervalMinStr);
    if (isNaN(amountSol) || amountSol <= 0) {
        return bot.sendMessage(msg.chat.id, 'amount_sol must be a positive number.');
    }
    if (isNaN(intervalMinutes) || intervalMinutes < 1) {
        return bot.sendMessage(msg.chat.id, 'interval_minutes must be >= 1.');
    }
    try {
        const result = await postApi('/autobuy', {
            mint_address: mint,
            amount_sol: amountSol,
            interval_seconds: Math.round(intervalMinutes * 60),
            label: labelParts.length ? labelParts.join(' ') : undefined
        });
        const job = result.job;
        const interval = intervalMinutes >= 60
            ? `${intervalMinutes / 60}h`
            : `${intervalMinutes}m`;
        bot.sendMessage(msg.chat.id, `Auto-buy job created!\nID: ${job.id.slice(0, 8)}…\nToken: ${mint.slice(0, 12)}…\nAmount: ${amountSol} SOL every ${interval}\nFirst run: now`);
    }
    catch (error) {
        const msg2 = error?.response?.data?.error || String(error);
        bot.sendMessage(msg.chat.id, `Failed to create job: ${msg2}`);
    }
});
/** /autobuy stop <id_prefix> */
bot.onText(/\/autobuy stop (.+)/, async (msg, match) => {
    const prefix = (match?.[1] || '').trim();
    await toggleJob(msg.chat.id, prefix, false);
});
/** /autobuy resume <id_prefix> */
bot.onText(/\/autobuy resume (.+)/, async (msg, match) => {
    const prefix = (match?.[1] || '').trim();
    await toggleJob(msg.chat.id, prefix, true);
});
/** /autobuy delete <id_prefix> */
bot.onText(/\/autobuy delete (.+)/, async (msg, match) => {
    const prefix = (match?.[1] || '').trim();
    try {
        const { jobs } = await fetchApi('/autobuy');
        const job = jobs.find((j) => j.id.startsWith(prefix));
        if (!job)
            return bot.sendMessage(msg.chat.id, `No job found with ID starting with "${prefix}".`);
        await deleteApi(`/autobuy/${job.id}`);
        bot.sendMessage(msg.chat.id, `Job ${job.id.slice(0, 8)}… deactivated.`);
    }
    catch (error) {
        bot.sendMessage(msg.chat.id, `Failed: ${error?.response?.data?.error || String(error)}`);
    }
});
async function toggleJob(chatId, prefix, active) {
    try {
        const { jobs } = await fetchApi('/autobuy');
        const job = jobs.find((j) => j.id.startsWith(prefix));
        if (!job)
            return bot.sendMessage(chatId, `No job found with ID starting with "${prefix}".`);
        await patchApi(`/autobuy/${job.id}`, { active, next_run_at: active ? new Date().toISOString() : undefined });
        const state = active ? '🟢 resumed' : '🔴 stopped';
        bot.sendMessage(chatId, `Job ${job.id.slice(0, 8)}… ${state}.`);
    }
    catch (error) {
        bot.sendMessage(chatId, `Failed: ${error?.response?.data?.error || String(error)}`);
    }
}
// ─── Error handler ────────────────────────────────────────────────────────────
bot.on('polling_error', (error) => {
    console.error('Telegram polling error:', error);
});
if (adminChatId) {
    bot.sendMessage(adminChatId, 'GAD AI Telegram bot started.');
}
console.log('Telegram bot running.');
