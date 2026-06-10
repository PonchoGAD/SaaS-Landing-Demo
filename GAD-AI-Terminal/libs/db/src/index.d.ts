import { PoolClient, Pool } from 'pg';

export declare function query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
export declare function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
export declare function getPool(): Pool;
