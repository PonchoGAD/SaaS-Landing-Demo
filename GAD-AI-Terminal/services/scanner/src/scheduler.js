"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScanner = startScanner;
const scanner_1 = require("./scanner");
const pump_collector_1 = require("./pump.collector");
const gmgn_collector_1 = require("./gmgn.collector");
const axiom_collector_1 = require("./axiom.collector");
const helius_collector_1 = require("./helius.collector");
const intervalMs = Number(process.env.SCANNER_INTERVAL_SECONDS || '30') * 1000;
const collectors = [
    {
        source: 'pump.fun',
        discoverNewTokens: pump_collector_1.discoverPumpTokens,
        fetchTokenMetrics: pump_collector_1.fetchPumpMetrics
    },
    {
        source: 'gmgn',
        discoverNewTokens: gmgn_collector_1.discoverGmgnTokens,
        fetchTokenMetrics: gmgn_collector_1.fetchGmgnMetrics
    },
    {
        source: 'axiom',
        discoverNewTokens: axiom_collector_1.discoverAxiomTokens,
        fetchTokenMetrics: axiom_collector_1.fetchAxiomMetrics
    },
    {
        source: 'helius',
        discoverNewTokens: helius_collector_1.discoverHeliusTokens,
        fetchTokenMetrics: helius_collector_1.fetchHeliusMetrics
    }
];
async function startScanner() {
    console.info(`Scanner started. Running every ${intervalMs / 1000}s.`);
    let shouldStop = false;
    process.on('SIGINT', () => {
        console.info('Scanner sigint received, shutting down gracefully.');
        shouldStop = true;
    });
    process.on('SIGTERM', () => {
        console.info('Scanner sigterm received, shutting down gracefully.');
        shouldStop = true;
    });
    while (!shouldStop) {
        try {
            await (0, scanner_1.runCollectors)(collectors);
        }
        catch (error) {
            console.error('Scanner cycle failed:', error);
        }
        if (shouldStop) {
            break;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    console.info('Scanner shutdown complete.');
}
