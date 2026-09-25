/**
 * 持倉雙階自然排序模組 (Holdings Natural Order Sorter)
 * 解決 Debt #0001: 消除核心計算引擎與 UI 視圖層之間的 DRY 重複比較邏輯
 */

export interface HasMarketAndSymbol {
  symbol: string;
  market: 'TW' | 'US';
}

/**
 * 美股與台股持倉雙階自然排序比較器 (KISS 純函式)
 * 1. 台股權重 0 置前，美股權重 1 置底
 * 2. 同市場依據標的代碼進行自然字典序升冪排列 (localeCompare)
 */
export function compareHoldingsOrder(a: HasMarketAndSymbol, b: HasMarketAndSymbol): number {
  const marketWeightA = a.market === 'TW' ? 0 : 1;
  const marketWeightB = b.market === 'TW' ? 0 : 1;
  if (marketWeightA !== marketWeightB) {
    return marketWeightA - marketWeightB;
  }
  return a.symbol.localeCompare(b.symbol);
}
