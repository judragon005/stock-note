import { MarketType } from '../types/stock';
import { StockDictionaryItem, StockDictionaryStats, StockDictionarySource } from '../types/stockDictionary';
import { STATIC_STOCK_DICTIONARY, STATIC_SECURITY_NAMES } from '../data/stockDictionary';
import { logger } from '../utils/logger';

export { STATIC_SECURITY_NAMES, STATIC_STOCK_DICTIONARY };

export const CUSTOM_STOCK_NAMES_STORAGE_KEY = 'stock_custom_dictionary_v1';

// 記憶體快取自訂字典項目
const customStockMap: Map<string, StockDictionaryItem> = new Map();

// 初始化時從 localStorage 嘗試載入使用者自訂快取
loadCustomStockNamesFromStorage();

/**
 * 從 Storage 載入自訂股票名稱
 */
export function loadCustomStockNamesFromStorage(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(CUSTOM_STOCK_NAMES_STORAGE_KEY);
    if (raw) {
      const items: StockDictionaryItem[] = JSON.parse(raw);
      if (Array.isArray(items)) {
        customStockMap.clear();
        for (const item of items) {
          if (item && item.symbol && item.name) {
            customStockMap.set(item.symbol.trim().toUpperCase(), item);
          }
        }
      }
    }
  } catch (err) {
    logger.error('Failed to load custom stock names from storage:', err);
  }
}

/**
 * 儲存自訂股票名稱至 Storage
 */
export function saveCustomStockNamesToStorage(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const items = Array.from(customStockMap.values());
    localStorage.setItem(CUSTOM_STOCK_NAMES_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    logger.error('Failed to save custom stock names to storage:', err);
  }
}

/**
 * 註冊或覆蓋自訂股票中文名稱
 */
export function registerCustomStockName(
  symbol: string,
  name: string,
  market: MarketType,
  source: StockDictionarySource = 'USER_CUSTOM'
): void {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cleanName = name.trim();
  if (!cleanSymbol || !cleanName) return;

  const item: StockDictionaryItem = {
    symbol: cleanSymbol,
    name: cleanName,
    market,
    source,
    updatedAt: new Date().toISOString(),
  };

  customStockMap.set(cleanSymbol, item);
  saveCustomStockNamesToStorage();
}

/**
 * 清除所有使用者自訂名稱
 */
export function clearCustomStockNames(): void {
  customStockMap.clear();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CUSTOM_STOCK_NAMES_STORAGE_KEY);
    }
  } catch (err) {
    logger.error('Failed to clear custom stock names from storage:', err);
  }
}

/**
 * 批次匯入股票字典項目 (例如從 OpenAPI 同步或快照還原)
 */
export function batchImportStockDictionary(items: StockDictionaryItem[]): void {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (item && item.symbol && item.name) {
      customStockMap.set(item.symbol.trim().toUpperCase(), item);
    }
  }
  saveCustomStockNamesToStorage();
}

/**
 * 全域核心函式：解析官方標的中文名稱
 * 查詢優先序：自訂/同步字典 ➔ 靜態官方字典 ➔ fallbackName ➔ 原始代碼
 */
export function resolveOfficialSecurityName(symbol: string, fallbackName?: string): string {
  if (!symbol) return fallbackName || '';
  const cleanSymbol = symbol.trim().toUpperCase();

  // 1. 優先查核自訂/同步快取
  if (customStockMap.has(cleanSymbol)) {
    return customStockMap.get(cleanSymbol)!.name;
  }

  // 2. 查核靜態官方字典
  if (STATIC_SECURITY_NAMES[cleanSymbol]) {
    return STATIC_SECURITY_NAMES[cleanSymbol];
  }

  // 2.1 容錯：去除市場後綴 (如 6204.TWO -> 6204, AAPL.US -> AAPL)
  const baseSymbol = cleanSymbol.replace(/\.(TW|TWO|US)$/i, '');
  if (STATIC_SECURITY_NAMES[baseSymbol]) {
    return STATIC_SECURITY_NAMES[baseSymbol];
  }

  // 2.2 容錯：上櫃歷史代碼結尾 O (如 6203 查 6203O, 或 6203O 查 6203)
  if (STATIC_SECURITY_NAMES[`${baseSymbol}O`]) {
    return STATIC_SECURITY_NAMES[`${baseSymbol}O`];
  }
  if (baseSymbol.endsWith('O') && STATIC_SECURITY_NAMES[baseSymbol.slice(0, -1)]) {
    return STATIC_SECURITY_NAMES[baseSymbol.slice(0, -1)];
  }

  // 3. 回退至傳入之 fallbackName 或原始代碼
  return fallbackName ? fallbackName.trim() : cleanSymbol;

}

/**
 * 雙向模糊智慧搜尋候選標的
 * 支援代碼 (Ticker)、中文名稱、英文名稱檢索，並依匹配精確度排序
 */
export function searchStockSuggestions(
  query: string,
  market: MarketType | 'ALL' = 'ALL',
  limit: number = 6
): StockDictionaryItem[] {
  const cleanQuery = query.trim().toUpperCase();
  const allItems = getAllStockDictionaryItems();

  if (!cleanQuery) {
    return allItems
      .filter((item) => (market === 'ALL' ? true : item.market === market))
      .slice(0, limit);
  }

  const scoredItems: { item: StockDictionaryItem; score: number }[] = [];

  for (const item of allItems) {
    if (market !== 'ALL' && item.market !== market) {
      continue;
    }

    const sym = item.symbol.toUpperCase();
    const name = item.name.toUpperCase();
    const engName = (item.englishName || '').toUpperCase();

    let score = 0;

    // 1. 代碼精確命中
    if (sym === cleanQuery) {
      score += 100;
    }
    // 2. 代碼前綴命中
    else if (sym.startsWith(cleanQuery)) {
      score += 60;
    }
    // 3. 代碼包含
    else if (sym.includes(cleanQuery)) {
      score += 30;
    }

    // 4. 中文名稱精確命中
    if (name === cleanQuery) {
      score += 90;
    }
    // 5. 中文名稱前綴命中
    else if (name.startsWith(cleanQuery)) {
      score += 50;
    }
    // 6. 中文名稱包含
    else if (name.includes(cleanQuery)) {
      score += 40;
    }

    // 7. 英文全名包含
    if (engName && engName.includes(cleanQuery)) {
      score += 20;
    }

    if (score > 0) {
      scoredItems.push({ item, score });
    }
  }

  // 依權重降冪排序
  scoredItems.sort((a, b) => b.score - a.score);

  return scoredItems.slice(0, limit).map((s) => s.item);
}

/**
 * 取得合併後的全量股票字典清單 (去重)
 */
export function getAllStockDictionaryItems(): StockDictionaryItem[] {
  const mergedMap = new Map<string, StockDictionaryItem>();

  // 先放靜態字典
  for (const item of STATIC_STOCK_DICTIONARY) {
    mergedMap.set(item.symbol.toUpperCase(), item);
  }

  // 再用自訂/同步字典覆蓋
  for (const [sym, item] of customStockMap.entries()) {
    mergedMap.set(sym, item);
  }

  return Array.from(mergedMap.values());
}

/**
 * 取得字典統計資訊
 */
export function getStockDictionaryStats(): StockDictionaryStats {
  const allItems = getAllStockDictionaryItems();
  let twCount = 0;
  let usCount = 0;

  for (const item of allItems) {
    if (item.market === 'TW') twCount++;
    else if (item.market === 'US') usCount++;
  }

  return {
    totalCount: allItems.length,
    twCount,
    usCount,
    customCount: customStockMap.size,
  };
}
