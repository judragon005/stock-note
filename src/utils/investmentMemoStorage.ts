/**
 * 投資筆記持久化存儲層與持倉風控線同步器 (Spec 0156 / Ticket 16, 17)
 */

import { InvestmentMemoRecord } from '../types/equityDeepDive';
import { HoldingPosition } from '../types/stock';
import { logger } from './logger';

const MEMO_STORAGE_KEY = 'stock_investment_memos';

function getRawMemoMap(): Record<string, InvestmentMemoRecord> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(MEMO_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    logger.warn('[investmentMemoStorage] 讀取本機投資筆記失敗:', err);
    return {};
  }
}

function saveRawMemoMap(map: Record<string, InvestmentMemoRecord>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    logger.warn('[investmentMemoStorage] 寫入本機投資筆記失敗:', err);
  }
}

/**
 * Ticket 16: 保存或更新單一標的之投資筆記
 */
export function saveInvestmentMemo(memo: InvestmentMemoRecord): void {
  if (!memo || !memo.symbol) return;
  const map = getRawMemoMap();
  const cleanSym = memo.symbol.toUpperCase().trim();
  map[cleanSym] = {
    ...memo,
    symbol: cleanSym,
    updatedAt: Date.now(),
  };
  saveRawMemoMap(map);
}

/**
 * Ticket 16: 取得指定標的之投資筆記
 */
export function getInvestmentMemo(symbol: string): InvestmentMemoRecord | null {
  if (!symbol) return null;
  const cleanSym = symbol.toUpperCase().trim();
  const map = getRawMemoMap();
  return map[cleanSym] || null;
}

/**
 * Ticket 16: 刪除指定標的之投資筆記
 */
export function deleteInvestmentMemo(symbol: string): void {
  if (!symbol) return;
  const cleanSym = symbol.toUpperCase().trim();
  const map = getRawMemoMap();
  if (map[cleanSym]) {
    delete map[cleanSym];
    saveRawMemoMap(map);
  }
}

/**
 * Ticket 16: 取得所有已儲存之投資筆記清單
 */
export function getAllInvestmentMemos(): InvestmentMemoRecord[] {
  const map = getRawMemoMap();
  return Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Ticket 17: 判斷指定標的是否在在庫持倉中
 */
export function isSymbolInHoldings(symbol: string, holdings: HoldingPosition[] = []): boolean {
  if (!symbol || !holdings || holdings.length === 0) return false;
  const cleanSym = symbol.toUpperCase().trim();
  return holdings.some((h) => h.symbol.toUpperCase().trim() === cleanSym);
}

/**
 * Ticket 17: 安全雙向同步回填投資筆記中的目標價與停損價至在庫持倉
 */
export function syncMemoToHoldingsRiskLine(
  symbol: string,
  memo: InvestmentMemoRecord,
  holdings: HoldingPosition[] = []
): { updatedHoldings: HoldingPosition[]; success: boolean } {
  if (!symbol || !memo || !holdings || holdings.length === 0) {
    return { updatedHoldings: holdings, success: false };
  }

  const cleanSym = symbol.toUpperCase().trim();
  const targetPrice = Number(memo.targetPrice);
  const stopLossPrice = Number(memo.stopLossPrice);

  // 防禦性邊界檢查：目標價與停損價必須為有限且大於 0 的正數
  if (
    !Number.isFinite(targetPrice) ||
    targetPrice <= 0 ||
    !Number.isFinite(stopLossPrice) ||
    stopLossPrice <= 0
  ) {
    return { updatedHoldings: holdings, success: false };
  }

  let found = false;
  const updatedHoldings = holdings.map((h) => {
    if (h.symbol.toUpperCase().trim() === cleanSym) {
      found = true;
      return {
        ...h,
        targetPrice,
        stopLossPrice,
      };
    }
    return h;
  });

  return { updatedHoldings, success: found };
}
