import { MarketType, Currency } from './stock';

/**
 * 沖銷會計模式 (Accounting Method)
 */
export type AccountingMethod =
  | 'MOVING_AVERAGE' // 移動加權平均法 (台灣券商預設模式)
  | 'FIFO'           // 先進先出法 (First-In, First-Out，美國 IRS 預設)
  | 'LIFO'           // 後進先出法 (Last-In, First-Out)
  | 'HIFO'           // 最高成本先出法 (Highest-In, First-Out，節稅收割首選)
  | 'SPECIFIC_LOT';  // 指定批次沖銷 (手動選擇出脫 Lot)

/**
 * 會計模式繁中顯示與懸停說明字典
 */
export const ACCOUNTING_METHOD_LABELS: Record<AccountingMethod, { name: string; shortName: string; tooltip: string }> = {
  MOVING_AVERAGE: {
    name: '移動加權平均法 (Moving Avg)',
    shortName: '移動平均',
    tooltip: '將所有在庫買進批次的成本合併池化，以總成本除以總股數計算出單一平均每股成本。為台灣券商最常見之預設模式。',
  },
  FIFO: {
    name: '先進先出法 (FIFO)',
    shortName: '先進先出',
    tooltip: '優先賣出「買進日期最早」的批次。為美國國稅局 (IRS) 與多國官方稅務申報之預設標準，有助於早期部位達到長期持有低稅率門檻。',
  },
  LIFO: {
    name: '後進先出法 (LIFO)',
    shortName: '後進先出',
    tooltip: '優先賣出「買進日期最新」的批次。在股價持續上漲的通膨環境下，可先沖銷近期高價買進部位，延後舊有低成本部位的資本利得稅。',
  },
  HIFO: {
    name: '最高成本先出法 (HIFO - 節稅優先)',
    shortName: '最高成本 (節稅)',
    tooltip: '優先賣出「每股買進成本最高」的批次。能最大化當期已實現虧損（或最小化獲利），為節稅沖銷 (Tax-Loss Harvesting) 的核心首選策略。',
  },
  SPECIFIC_LOT: {
    name: '指定批次沖銷 (Specific Lot)',
    shortName: '指定批次',
    tooltip: '允許投資人於賣出時自行手動勾選欲出脫的特定買進批次與股數，精準掌控單筆波段策略之盈虧與稅務歸因。',
  },
};

/**
 * 單一未沖銷/部分沖銷批次 (Tax Lot)
 */
export interface TaxLot {
  id: string;                      // 唯一 Lot 識別碼 (例如: lot-tradeId-001)
  buyTradeId: string;              // 關聯之原始買進 TradeRecord.id
  symbol: string;
  market: MarketType;
  currency: Currency;
  accountId?: string;
  buyDate: string;                 // 買進日期 (YYYY-MM-DD)
  buyPrice: number;                // 原始買入單價
  originalShares: number;          // 原始買入股數 (經分割/配股調整後)
  remainingShares: number;         // 當前在庫剩餘股數
  fee: number;                     // 原始買進分攤手續費
  totalCostBasis: number;          // 該 Lot 當前剩餘總成本基準
  unitCost: number;                // 當前每股含費成本 (totalCostBasis / remainingShares)
  createdAt: number;
}

/**
 * 單筆賣出沖銷明細歸因 (Disposal Match)
 */
export interface LotDisposal {
  id: string;
  sellTradeId: string;             // 關聯之賣出 TradeRecord.id
  lotId: string;                   // 被沖銷之 TaxLot.id
  buyTradeId: string;              // 原始買進 TradeRecord.id
  symbol: string;
  buyDate: string;                 // 原始買進日 (YYYY-MM-DD)
  sellDate: string;                // 賣出成交日 (YYYY-MM-DD)
  shares: number;                  // 此次沖銷股數
  unitCost: number;                // 沖銷時每股成本
  costBasis: number;               // 沖銷總成本 (shares * unitCost)
  sellPrice: number;               // 賣出單價
  grossProceeds: number;           // 賣出毛變現額 (shares * sellPrice)
  allocatedFee: number;            // 分攤之賣出手續費
  allocatedTax: number;            // 分攤之賣出證交稅
  netProceeds: number;             // 賣出淨所得 (grossProceeds - fee - tax)
  realizedPnL: number;             // 當筆 Lot 沖銷已實現損益 (netProceeds - costBasis)
  realizedPnLPercent: number;      // 當筆 Lot 報酬率 %
  holdingDays: number;             // 持有天數 (sellDate - buyDate 自然日)
  isLongTerm: boolean;             // 是否為長期持有 (holdingDays >= 365)
}

/**
 * 使用者手動指定賣出批次分配
 */
export interface LotAllocation {
  lotId: string;
  shares: number;
}

/**
 * 沖銷會計模式評估與節稅比較
 */
export interface TaxComparisonResult {
  method: AccountingMethod;
  totalRealizedPnL: number;
  shortTermRealizedPnL: number;    // 短期已實現利得 (< 365天)
  longTermRealizedPnL: number;     // 長期已實現利得 (>= 365天)
  remainingCostBasis: number;      // 在席未沖銷批次總成本基準
  unrealizedPnLOnRemainingLots: number; // 在席未沖銷批次未實現損益
  potentialTaxSavingsVsFIFO: number; // 相較於標準 FIFO 所遞延/節省之利得差額
}
