import { AlertInput, AlertRecord } from './alert.types';
/** Persist one alert and return the saved record */
export declare function createAlert(input: AlertInput): Promise<AlertRecord>;
/** Persist many alerts in one call; returns all saved records */
export declare function createAlerts(inputs: AlertInput[]): Promise<AlertRecord[]>;
/** Fetch unresolved alerts, newest first */
export declare function getActiveAlerts(limit?: number): Promise<AlertRecord[]>;
/** Fetch all alerts for a specific token subject (mint address) */
export declare function getAlertsByMint(mintAddress: string, limit?: number): Promise<AlertRecord[]>;
/** Fetch alerts of a specific type */
export declare function getAlertsByType(type: string, limit?: number): Promise<AlertRecord[]>;
/** Mark one alert as resolved */
export declare function resolveAlert(id: string): Promise<void>;
/** Check whether an alert of this type for this subject was already fired recently */
export declare function alertFiredRecently(type: string, subject: string, withinMinutes?: number): Promise<boolean>;
