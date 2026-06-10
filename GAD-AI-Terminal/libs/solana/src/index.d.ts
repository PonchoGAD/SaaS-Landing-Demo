import { Connection } from '@solana/web3.js';

export declare const getConnection: () => Connection;
export declare function getTokenMetadata(mintAddress: string): Promise<{ mintAddress: string; accountInfo: any }>;
export declare function queryHelius(path: string, body: any): Promise<any>;
export declare function fetchRecentTokenTransfers(limit?: number): Promise<any>;
export declare function fetchRecentTransactions(address: string, limit?: number): Promise<any>;
