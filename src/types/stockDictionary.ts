import { MarketType } from './stock';

export type StockDictionarySource =
  | 'TWSE'
  | 'TPEX'
  | 'US_POPULAR'
  | 'USER_CUSTOM'
  | 'OPENAPI_SYNC';

export interface StockDictionaryItem {
  symbol: string;         // 代碼 (全大寫，如 '2330', '0050', 'AAPL')
  name: string;           // 繁體中文名稱 / 官方簡稱 (如 '台積電', '元大台灣50', '蘋果')
  market: MarketType;     // 'TW' | 'US'
  englishName?: string;   // 英文公司全名 (如 'Taiwan Semiconductor Manufacturing Co.', 'Apple Inc.')
  category?: string;      // 產業類別 / ETF 類型 (如 '半導體業', '指數型ETF', '科技股')
  source?: StockDictionarySource;
  updatedAt?: string;      // ISO 字串
}

export interface StockDictionaryStats {
  totalCount: number;
  twCount: number;
  usCount: number;
  customCount: number;
  lastUpdated?: string;
}
