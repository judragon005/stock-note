export type LakehouseMarketType = 'TW' | 'US';
export type StockTradingStatus = 'NORMAL' | 'ATTENTION' | 'DISPOSITION' | 'FULL_CASH';
export type SyncCheckpointStatus = 'SUCCESS' | 'FAILED' | 'PENDING';

export interface SymbolMetaRecord {
  symbol: string;
  name: string;
  market: LakehouseMarketType;
  exchange?: string;
  type?: 'STOCK' | 'ETF';
  status?: StockTradingStatus;
  updated_at: number;
}

export interface DailyCandleRecord {
  symbol: string;
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  adj_close: number;
  volume: number;
  turnover?: number;
}

export interface TwInstitutionalChipsRecord {
  symbol: string;
  date: string; // YYYY-MM-DD
  foreign_net: number; // 外資買賣超張數
  trust_net: number; // 投信買賣超張數
  dealer_net: number; // 自營商買賣超張數
  margin_balance?: number; // 融資餘額
  short_balance?: number; // 融券餘額
  sbl_balance?: number; // 借券賣出餘額
  day_trade_rate?: number; // 當沖比率 (0~100)
}

export interface SyncCheckpointRecord {
  market: LakehouseMarketType;
  symbol: string;
  last_success_date: string; // YYYY-MM-DD
  last_attempt_at: number; // Unix timestamp
  status: SyncCheckpointStatus;
  error_msg?: string;
}
