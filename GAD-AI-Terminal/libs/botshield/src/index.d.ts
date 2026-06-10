export interface BotShieldResult {
  threat_level: 'NONE' | 'LOW' | 'HIGH';
  bot_type: string;
  recommended_delay: number;
  safe_to_trade: boolean;
  slippage_bps: number;
}
export interface TxData {
  txns?: { m5?: { buys?: number; sells?: number } };
  volume?: { m5?: number };
  priceChange?: { m5?: number };
}
export declare function detectBotActivity(pair: TxData): BotShieldResult;
export declare function getRandomizedSlippage(threat?: 'NONE' | 'LOW' | 'HIGH'): number;
export declare function randomTradeDelay(minMs?: number, maxMs?: number): Promise<void>;
