// Auto-generated flat declaration for @lib/alerts

export declare enum AlertType {
  NEW_HIGH_SCORE    = 'NEW_HIGH_SCORE',
  HIGH_RISK         = 'HIGH_RISK',
  WHALE_ACTIVITY    = 'WHALE_ACTIVITY',
  VOLUME_SPIKE      = 'VOLUME_SPIKE',
  LIQUIDITY_DROP    = 'LIQUIDITY_DROP',
  NEW_TOKEN         = 'NEW_TOKEN',
  AI_SCORE_INCREASE = 'AI_SCORE_INCREASE'
}

export interface TokenAlertContext {
  tokenId: string;
  mintAddress: string;
  symbol?: string;
  aiScore: number;
  previousAiScore?: number;
  riskScore: number;
  whaleActivityScore?: number;
  volume5m: number;
  volume1h: number;
  volume24h: number;
  liquidityChange: number;
  isNewToken: boolean;
}

export interface AlertInput {
  type: AlertType;
  subject: string;
  payload: Record<string, unknown>;
  score: number;
}

export interface AlertRecord {
  id: string;
  type: string;
  subject: string;
  payload: Record<string, unknown>;
  score: number;
  resolved: boolean;
  created_at: Date;
}

export declare const THRESHOLDS: {
  readonly HIGH_SCORE: number;
  readonly HIGH_RISK: number;
  readonly WHALE_ACTIVITY: number;
  readonly VOLUME_SPIKE_RATIO: number;
  readonly LIQUIDITY_DROP: number;
  readonly AI_SCORE_INCREASE: number;
};

export declare function evaluateRules(ctx: TokenAlertContext): AlertInput[];
export declare function createAlert(input: AlertInput): Promise<AlertRecord>;
export declare function createAlerts(inputs: AlertInput[]): Promise<AlertRecord[]>;
export declare function getActiveAlerts(limit?: number): Promise<AlertRecord[]>;
export declare function getAlertsByMint(mintAddress: string, limit?: number): Promise<AlertRecord[]>;
export declare function getAlertsByType(type: string, limit?: number): Promise<AlertRecord[]>;
export declare function resolveAlert(id: string): Promise<void>;
export declare function alertFiredRecently(type: string, subject: string, withinMinutes?: number): Promise<boolean>;
export declare function processTokenAlerts(ctx: TokenAlertContext): Promise<AlertRecord[]>;
