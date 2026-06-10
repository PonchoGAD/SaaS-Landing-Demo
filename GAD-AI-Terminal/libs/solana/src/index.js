"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = void 0;
exports.getTokenMetadata = getTokenMetadata;
exports.queryHelius = queryHelius;
exports.fetchRecentTokenTransfers = fetchRecentTokenTransfers;
exports.fetchRecentTransactions = fetchRecentTransactions;
const web3_js_1 = require("@solana/web3.js");
const node_fetch_1 = __importDefault(require("node-fetch"));
const rpcUrl = process.env.SOLANA_RPC || (0, web3_js_1.clusterApiUrl)('mainnet-beta');
const heliusApiKey = process.env.HELIUS_API_KEY;
const connection = new web3_js_1.Connection(rpcUrl, { commitment: 'confirmed' });
const getConnection = () => connection;
exports.getConnection = getConnection;
async function getTokenMetadata(mintAddress) {
    const mint = new web3_js_1.PublicKey(mintAddress);
    const accountInfo = await connection.getParsedAccountInfo(mint);
    return {
        mintAddress,
        accountInfo: accountInfo.value?.data ?? null
    };
}
async function queryHelius(path, body) {
    if (!heliusApiKey) {
        throw new Error('HELIUS_API_KEY is required');
    }
    const response = await (0, node_fetch_1.default)(`https://api.helius.xyz/v0/${path}?api-key=${heliusApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        throw new Error(`Helius request failed ${response.status}: ${await response.text()}`);
    }
    return response.json();
}
async function fetchRecentTokenTransfers(limit = 100) {
    return queryHelius('token-metadata', { limit, page: 0 });
}
async function fetchRecentTransactions(address, limit = 50) {
    return connection.getSignaturesForAddress(new web3_js_1.PublicKey(address), { limit });
}
