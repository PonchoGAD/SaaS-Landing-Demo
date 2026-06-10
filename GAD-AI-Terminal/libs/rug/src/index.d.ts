import { Connection } from '@solana/web3.js';
export interface RugCheckInput {
    mintAddress: string;
    top10HolderPct?: number;
    liquidityUsd?: number;
    lpLocked?: boolean;
    mintAuthorityRevoked?: boolean;
    freezeAuthorityRevoked?: boolean;
    bundledWallets?: number;
    sniperCount?: number;
    devSoldPct?: number;
    tokenAgeHours?: number;
}
export interface RugFlags {
    NO_LIQUIDITY_LOCK: boolean;
    MINT_AUTHORITY_ACTIVE: boolean;
    FREEZE_AUTHORITY_ACTIVE: boolean;
    HIGH_TOP10_CONCENTRATION: boolean;
    BUNDLED_LAUNCH: boolean;
    SNIPER_HEAVY: boolean;
    DEV_SOLD_LARGE: boolean;
    VERY_NEW_TOKEN: boolean;
    LOW_LIQUIDITY: boolean;
}
export interface RugResult {
    rugProbability: number;
    flags: Partial<RugFlags>;
    explanation: string;
    riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}
export declare function calculateRugProbability(input: RugCheckInput): RugResult;
export declare function fetchOnChainRugData(mintAddress: string, connection: Connection): Promise<Pick<RugCheckInput, 'mintAuthorityRevoked' | 'freezeAuthorityRevoked'>>;
/** Fetch top holders via Helius DAS API */
export declare function fetchTopHolderConcentration(mintAddress: string, heliusApiKey: string): Promise<number>;
