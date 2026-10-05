/**
 * 公司行動與除權息預告日曆型別契約 (Spec 0167 / Ticket 10)
 * Corporate Action Calendar Contract
 */

import { MarketType } from './stock';

export type CorporateActionType = 'DIVIDEND' | 'SPLIT' | 'CAPITAL_REDUCTION' | 'EARNINGS';

export interface CorporateActionCalendarRecord {
  symbol: string;                  // 標的代碼
  market: MarketType;              // 'TW' | 'US'
  actionType: CorporateActionType; // 行動類別
  exDate: string;                  // 除權息基準日 (YYYY-MM-DD)
  paymentDate?: string;            // 預計現金發放日 (YYYY-MM-DD)
  cashDividendPerShare?: number;   // 每股現金股利
  stockDividendRatio?: number;     // 每股配股比例
  splitRatio?: number;             // 股票分割比例 (e.g., 10 代表 1 拆 10)
  referencePrice?: number;         // 除權息參考基準價
  announcementDate?: string;       // 公告日期
  updatedAt: number;
}
