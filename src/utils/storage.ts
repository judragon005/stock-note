import {
  TradeRecord,
  MarketType,
  TradeType,
  Currency,
  PriceMetadataStore,
  PriceQuote,
  ExchangeRateQuote,
  AccountingView,
  BrokerAccount,
  ApiKeysConfig,
  HistoricalDailyPriceMap,
  HistoricalFxRateMap,
  CashTransaction,
  LoanRecord,
} from '../types/stock';
import { logger } from './logger';
import {
  dbPut,
  dbBatchPut,
  dbClear,
  dbGetAll,
  dbGet,
  migrateFromLocalStorageIfNeeded,
} from './db';

export const STORAGE_KEY = 'STOCK_TRACKER_TRADES_V1';
export const RATE_STORAGE_KEY = 'STOCK_TRACKER_USD_TWD_RATE';
export const PRICES_STORAGE_KEY = 'STOCK_TRACKER_CUSTOM_PRICES_V1';
export const PRICE_METADATA_STORAGE_KEY = 'STOCK_TRACKER_PRICE_METADATA_V1';
export const ACCOUNTING_VIEW_STORAGE_KEY = 'STOCK_TRACKER_ACCOUNTING_VIEW_V1';
export const BROKER_FEE_DISCOUNT_STORAGE_KEY = 'STOCK_TRACKER_BROKER_FEE_DISCOUNT_V1';
export const BROKER_ACCOUNTS_STORAGE_KEY = 'STOCK_TRACKER_BROKER_ACCOUNTS_V1';
export const API_KEYS_STORAGE_KEY = 'STOCK_TRACKER_API_KEYS_V1';
export const HISTORICAL_PRICES_STORAGE_KEY = 'STOCK_TRACKER_HISTORICAL_PRICES_V1';
export const HISTORICAL_FX_STORAGE_KEY = 'STOCK_TRACKER_HISTORICAL_FX_V1';
export const CASH_TRANSACTIONS_STORAGE_KEY = 'STOCK_TRACKER_CASH_TRANSACTIONS_V1';
export const LOAN_RECORDS_STORAGE_KEY = 'STOCK_TRACKER_LOAN_RECORDS_V1';

/**
 * 主流券商費率模板庫 (Broker Presets)
 */
export const DEFAULT_BROKER_PRESETS: BrokerAccount[] = [
  {
    id: 'preset-cathay',
    name: '國泰證券 (2.8折 / 低消1元)',
    market: 'TW',
    feeRate: 0.001425,
    discountRate: 0.28,
    minFee: 1,
    taxRate: 0.003,
    color: '#10b981',
  },
  {
    id: 'preset-sinopac',
    name: '永豐大戶投 (2折 / 低消1元)',
    market: 'TW',
    feeRate: 0.001425,
    discountRate: 0.2,
    minFee: 1,
    taxRate: 0.003,
    color: '#8b5cf6',
  },
  {
    id: 'preset-fubon',
    name: '富邦證券 (1.8折 / 無低消)',
    market: 'TW',
    feeRate: 0.001425,
    discountRate: 0.18,
    minFee: 0,
    taxRate: 0.003,
    color: '#06b6d4',
  },
  {
    id: 'preset-yuanta',
    name: '元大證券 (6折 / 低消20元)',
    market: 'TW',
    feeRate: 0.001425,
    discountRate: 0.6,
    minFee: 20,
    taxRate: 0.003,
    color: '#f59e0b',
  },
  {
    id: 'preset-standard-tw',
    name: '台股標準牌告 (1.0全額 / 低消20元)',
    market: 'TW',
    feeRate: 0.001425,
    discountRate: 1.0,
    minFee: 20,
    taxRate: 0.003,
    color: '#3b82f6',
  },
  {
    id: 'preset-schwab',
    name: '海外美股券商 (嘉信/Firstrade/IB 免手續費)',
    market: 'US',
    feeRate: 0,
    discountRate: 0,
    minFee: 0,
    taxRate: 0,
    usFeeType: 'ZERO_COMMISSION',
    color: '#38bdf8',
  },
  {
    id: 'preset-sub-discount',
    name: '美股複委託優惠戶 (0.1% / 無低消)',
    market: 'US',
    feeRate: 0.001,
    discountRate: 1.0,
    minFee: 1,
    taxRate: 0,
    usFeeType: 'SUB_BROKERAGE',
    color: '#a855f7',
  },
  {
    id: 'preset-sub-standard',
    name: '美股複委託標準戶 (0.25% / 低消15 USD)',
    market: 'US',
    feeRate: 0.0025,
    discountRate: 1.0,
    minFee: 15,
    taxRate: 0,
    usFeeType: 'SUB_BROKERAGE',
    color: '#ec4899',
  },
];

/**
 * 預設初始化帳戶清單
 */
export function getDefaultBrokerAccounts(): BrokerAccount[] {
  return [
    {
      id: 'broker-tw-default',
      name: '預設台股帳戶 (標準牌告 1.0折)',
      market: 'TW',
      feeRate: 0.001425,
      discountRate: 1.0,
      minFee: 20,
      taxRate: 0.003,
      isDefault: true,
      color: '#3b82f6',
      createdAt: 1,
    },
    {
      id: 'broker-us-default',
      name: '預設美股帳戶 (海外免手續費)',
      market: 'US',
      feeRate: 0,
      discountRate: 0,
      minFee: 0,
      taxRate: 0,
      usFeeType: 'ZERO_COMMISSION',
      isDefault: true,
      color: '#38bdf8',
      createdAt: 2,
    },
  ];
}

export function loadBrokerAccountsFromStorage(): BrokerAccount[] {
  try {
    const raw = localStorage.getItem(BROKER_ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    logger.error('Failed to load broker accounts from storage:', err);
  }
  return getDefaultBrokerAccounts();
}

export function saveBrokerAccountsToStorage(accounts: BrokerAccount[]): void {
  try {
    localStorage.setItem(BROKER_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    if (typeof indexedDB !== 'undefined') {
      dbClear('brokerAccounts')
        .then(() => dbBatchPut('brokerAccounts', accounts))
        .catch((err) => logger.error('Failed to save broker accounts to IndexedDB:', err));
    }
  } catch (err) {
    logger.error('Failed to save broker accounts to storage:', err);
  }
}

export const OFFICIAL_SECURITY_NAMES: Record<string, string> = {
  '00403A': '主動統一升級50',
  '0050': '元大台灣50',
  '00636': '國泰中國A50',
  '00878': '國泰永續高股息',
  '00919': '群益台灣精選高息',
  '00923': '群益台ESG低碳50',
  '00924': '復華S&P500成長',
  '009816': '凱基台灣TOP50',
  '00981A': '主動統一台股增長',
  '009826': '貝萊德世界股票',
  '2327': '國巨',
  '2330': '台積電',
  '2481': '強茂',
  '2755': '揚秦',
  '2883': '凱基金',
  '2886': '兆豐金',
  '2890': '永豐金',
  '3715': '定穎投控',
  '8105': '凌巨',
  '9927': '泰銘',
  'VT': 'Vanguard全世界股票ETF',
};

export function resolveOfficialSecurityName(symbol: string, fallbackName?: string): string {
  const cleanSymbol = symbol.trim().toUpperCase();
  if (OFFICIAL_SECURITY_NAMES[cleanSymbol]) {
    return OFFICIAL_SECURITY_NAMES[cleanSymbol];
  }
  return fallbackName || cleanSymbol;
}

export function loadAccountingViewFromStorage(): AccountingView {
  try {
    const raw = localStorage.getItem(ACCOUNTING_VIEW_STORAGE_KEY);
    if (raw === 'BROKER' || raw === 'TOTAL_RETURN') {
      return raw;
    }
    return 'BROKER';
  } catch {
    return 'BROKER';
  }
}

export function saveAccountingViewToStorage(view: AccountingView): void {
  try {
    localStorage.setItem(ACCOUNTING_VIEW_STORAGE_KEY, view);
    if (typeof indexedDB !== 'undefined') {
      dbPut('settings', { key: 'accountingView', value: view }).catch((err) =>
        logger.error('Failed to save accounting view to IndexedDB:', err)
      );
    }
  } catch (err) {
    logger.error('Failed to save accounting view:', err);
  }
}

export function loadBrokerFeeDiscountFromStorage(): number {
  try {
    const saved = localStorage.getItem(BROKER_FEE_DISCOUNT_STORAGE_KEY);
    if (saved !== null) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= 0 && val <= 1) {
        return val;
      }
    }
  } catch (err) {
    logger.error('Failed to load broker fee discount from storage:', err);
  }
  return 1.0; // 預設 1.0 全額牌告（100% 像素級對齊券商 App 標準預扣口徑）
}

export function saveBrokerFeeDiscountToStorage(discount: number): void {
  try {
    localStorage.setItem(BROKER_FEE_DISCOUNT_STORAGE_KEY, discount.toString());
  } catch (err) {
    logger.error('Failed to save broker fee discount to storage:', err);
  }
}

export function loadTradesFromStorage(): TradeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSampleTrades();
    const parsed = JSON.parse(raw);
    const validated = validateTradesSchema(parsed);
    if (validated) return validated;
    return getDefaultSampleTrades();
  } catch (err) {
    logger.error('Failed to load trades from localStorage:', err);
    return getDefaultSampleTrades();
  }
}

export function saveTradesToStorage(trades: TradeRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
    if (typeof indexedDB !== 'undefined') {
      dbClear('trades')
        .then(() => dbBatchPut('trades', trades))
        .catch((err) => logger.error('Failed to save trades to IndexedDB:', err));
    }
  } catch (err) {
    logger.error('Failed to save trades to localStorage:', err);
  }
}

export function loadExchangeRate(): number {
  try {
    const raw = localStorage.getItem(RATE_STORAGE_KEY);
    if (raw) {
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0) return val;
    }
    return 32.5;
  } catch {
    return 32.5;
  }
}

export function saveExchangeRate(rate: number): void {
  try {
    localStorage.setItem(RATE_STORAGE_KEY, rate.toString());
  } catch (err) {
    logger.error('Failed to save exchange rate:', err);
  }
}

export function loadCustomPricesFromStorage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PRICES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const validPrices: Record<string, number> = {};
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof val === 'number' && !isNaN(val) && val >= 0) {
          validPrices[key] = val;
        }
      }
      return validPrices;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveCustomPricesToStorage(prices: Record<string, number>): void {
  try {
    localStorage.setItem(PRICES_STORAGE_KEY, JSON.stringify(prices));
  } catch (err) {
    logger.error('Failed to save custom prices:', err);
  }
}

export function loadPriceMetadataFromStorage(): PriceMetadataStore {
  try {
    const raw = localStorage.getItem(PRICE_METADATA_STORAGE_KEY);
    if (!raw) {
      return { quotes: {}, lockedSymbols: [] };
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const quotes: Record<string, PriceQuote> = {};
      if (parsed.quotes && typeof parsed.quotes === 'object') {
        for (const [key, quote] of Object.entries(parsed.quotes)) {
          if (quote && typeof quote === 'object' && typeof (quote as any).price === 'number') {
            quotes[key] = quote as PriceQuote;
          }
        }
      }
      const lockedSymbols = Array.isArray(parsed.lockedSymbols)
        ? parsed.lockedSymbols.filter((s: any) => typeof s === 'string')
        : [];
      const lastGlobalUpdate = typeof parsed.lastGlobalUpdate === 'number' ? parsed.lastGlobalUpdate : undefined;
      let exchangeRateQuote: ExchangeRateQuote | undefined = undefined;
      if (
        parsed.exchangeRateQuote &&
        typeof parsed.exchangeRateQuote === 'object' &&
        typeof parsed.exchangeRateQuote.rate === 'number' &&
        parsed.exchangeRateQuote.rate > 0
      ) {
        exchangeRateQuote = parsed.exchangeRateQuote as ExchangeRateQuote;
      }
      return { quotes, lockedSymbols, lastGlobalUpdate, exchangeRateQuote };
    }
    return { quotes: {}, lockedSymbols: [] };
  } catch {
    return { quotes: {}, lockedSymbols: [] };
  }
}

export function savePriceMetadataToStorage(store: PriceMetadataStore): void {
  try {
    localStorage.setItem(PRICE_METADATA_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    logger.error('Failed to save price metadata:', err);
  }
}

export function loadExchangeRateQuote(): ExchangeRateQuote {
  const store = loadPriceMetadataFromStorage();
  if (store.exchangeRateQuote && store.exchangeRateQuote.rate > 0) {
    return store.exchangeRateQuote;
  }
  const fallbackRate = loadExchangeRate();
  return {
    rate: fallbackRate,
    status: 'CACHED',
    updatedAt: Date.now(),
    source: 'CACHE',
  };
}

export function saveExchangeRateQuote(quote: ExchangeRateQuote): void {
  const store = loadPriceMetadataFromStorage();
  store.exchangeRateQuote = quote;
  savePriceMetadataToStorage(store);
  saveExchangeRate(quote.rate);
}


export function getLockedSymbols(): string[] {
  const store = loadPriceMetadataFromStorage();
  return store.lockedSymbols || [];
}

export function isSymbolLocked(symbol: string): boolean {
  const cleanSymbol = symbol.trim().toUpperCase();
  const locked = getLockedSymbols();
  return locked.some((s) => s.trim().toUpperCase() === cleanSymbol);
}

export function setSymbolLock(symbol: string, locked: boolean): void {
  const cleanSymbol = symbol.trim().toUpperCase();
  const store = loadPriceMetadataFromStorage();
  const currentLocked = new Set((store.lockedSymbols || []).map((s) => s.trim().toUpperCase()));

  if (locked) {
    currentLocked.add(cleanSymbol);
  } else {
    currentLocked.delete(cleanSymbol);
  }

  store.lockedSymbols = Array.from(currentLocked);
  savePriceMetadataToStorage(store);
}

export function updateQuoteInStorage(quote: PriceQuote): void {
  const store = loadPriceMetadataFromStorage();
  store.quotes[quote.symbol] = quote;
  store.lastGlobalUpdate = Date.now();
  savePriceMetadataToStorage(store);

  // 同步維護自訂市價快照以保持相容
  const customPrices = loadCustomPricesFromStorage();
  customPrices[quote.symbol] = quote.price;
  saveCustomPricesToStorage(customPrices);
}


/**
 * 跨市場帳戶校驗與資料遷移核心函式
 */
export function validateAndMigrateTrades(
  data: unknown,
  accounts?: BrokerAccount[]
): TradeRecord[] | null {
  return validateTradesSchema(data, accounts);
}

export function validateTradesSchema(
  data: unknown,
  accounts?: BrokerAccount[]
): TradeRecord[] | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const validTypes = new Set<TradeType>([
    'BUY',
    'SELL',
    'DIVIDEND',
    'STOCK_DIVIDEND',
    'STOCK_SPLIT',
    'CAPITAL_REDUCTION',
    'CAPITAL_INCREASE',
    'STOCK_MERGER',
    'PREFERRED_REDEMPTION',
    'SPIN_OFF',
    'CB_CONVERSION',
    'TENDER_OFFER',
  ]);

  const activeAccounts = accounts || loadBrokerAccountsFromStorage();
  const accountMap = new Map<string, BrokerAccount>();
  for (const acc of activeAccounts) {
    accountMap.set(acc.id, acc);
  }

  // 取得台股與美股各自的預設帳戶 ID
  const twDefaultAcc = activeAccounts.find((a) => a.market === 'TW' && a.isDefault) || activeAccounts.find((a) => a.market === 'TW');
  const twDefaultId = twDefaultAcc ? twDefaultAcc.id : 'broker-tw-default';

  const usDefaultAcc = activeAccounts.find((a) => a.market === 'US' && a.isDefault) || activeAccounts.find((a) => a.market === 'US');
  const usDefaultId = usDefaultAcc ? usDefaultAcc.id : 'broker-us-default';

  const validTrades: TradeRecord[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;

    const t = item as Partial<TradeRecord>;
    if (!t.date || typeof t.date !== 'string' || !t.symbol || typeof t.symbol !== 'string') {
      continue;
    }

    const cleanSymbol = t.symbol.trim().toUpperCase();
    if (!cleanSymbol) continue;

    // 市場校驗：必須為 TW 或 US
    const market = t.market as MarketType;
    if (market !== 'TW' && market !== 'US') {
      continue;
    }

    // 交易類別校驗
    const rawType = (t.type ? String(t.type).trim().toUpperCase() : 'BUY') as TradeType;
    if (!validTypes.has(rawType)) {
      continue;
    }
    const type: TradeType = rawType;

    let targetAccountId = t.accountId;

    // 跨市場帳戶校驗：若 accountId 存在但其 market 與 trade.market 不相符，自動校正
    if (targetAccountId && accountMap.has(targetAccountId)) {
      const boundAcc = accountMap.get(targetAccountId)!;
      if (boundAcc.market !== market) {
        targetAccountId = market === 'TW' ? twDefaultId : usDefaultId;
      }
    } else if (!targetAccountId) {
      targetAccountId = market === 'TW' ? twDefaultId : usDefaultId;
    }

    validTrades.push({
      id: t.id || `trade-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      date: t.date,
      symbol: cleanSymbol,
      name: resolveOfficialSecurityName(cleanSymbol, t.name),
      market,
      currency: (t.currency || (market === 'TW' ? 'TWD' : 'USD')) as Currency,
      type,
      accountId: targetAccountId,
      shares: typeof t.shares === 'number' && !isNaN(t.shares) ? t.shares : 0,
      price: typeof t.price === 'number' && !isNaN(t.price) ? t.price : 0,
      fee: typeof t.fee === 'number' ? t.fee : 0,
      tax: typeof t.tax === 'number' ? t.tax : 0,
      ratio: typeof t.ratio === 'number' ? t.ratio : undefined,
      cashAmount: typeof t.cashAmount === 'number' ? t.cashAmount : undefined,
      exDate: typeof t.exDate === 'string' ? t.exDate : undefined,
      targetSymbol: typeof t.targetSymbol === 'string' ? t.targetSymbol.toUpperCase() : undefined,
      targetName: typeof t.targetName === 'string' ? t.targetName : undefined,
      allocationRatio: typeof t.allocationRatio === 'number' ? t.allocationRatio : undefined,
      conversionPrice: typeof t.conversionPrice === 'number' ? t.conversionPrice : undefined,
      tags: Array.isArray(t.tags) ? t.tags : [],
      note: t.note || '',
      createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
    });
  }

  return validTrades.length > 0 ? validTrades : null;
}

export function mergeTrades(existing: TradeRecord[], incoming: TradeRecord[]): TradeRecord[] {
  const existingIds = new Set(existing.map((t) => t.id));
  const newTrades: TradeRecord[] = [];

  for (const item of incoming) {
    let tradeToAdd = item;
    if (!tradeToAdd.id) {
      tradeToAdd = {
        ...tradeToAdd,
        id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      };
    }
    if (!existingIds.has(tradeToAdd.id)) {
      newTrades.push(tradeToAdd);
      existingIds.add(tradeToAdd.id);
    }
  }

  return [...newTrades, ...existing];
}

function parseCSVRows(csvText: string): string[][] {
  let cleaned = csvText;
  if (cleaned.charCodeAt(0) === 0xFEFF) cleaned = cleaned.slice(1);
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += char; }
    }
    result.push(current.trim());
    return result;
  });
}

export interface ParseCSVResult {
  trades: TradeRecord[];
  successCount: number;
  skippedCount: number;
}

/**
 * 解析 CSV 字串為 TradeRecord 陣列
 * 支援 Excel / 繁體中文欄位表頭自動辨識
 */
export function parseCSVToTrades(csvText: string): ParseCSVResult {
  const lines = parseCSVRows(csvText);
  if (lines.length < 2) {
    return { trades: [], successCount: 0, skippedCount: 0 };
  }

  const header = lines[0].map((h) => h.trim().toLowerCase());

  const getColIndex = (names: string[]): number => {
    for (const name of names) {
      const idx = header.indexOf(name.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idxDate = getColIndex(['日期', 'date', '交易日期']);
  const idxMarket = getColIndex(['市場', 'market']);
  const idxSymbol = getColIndex(['代碼', 'symbol', '股票代碼', '標的代碼']);
  const idxName = getColIndex(['名稱', 'name', '股票名稱', '標的名稱']);
  const idxType = getColIndex(['類別', 'type', '交易類別', '動作']);
  const idxShares = getColIndex(['股數', 'shares', '數量', '成交股數']);
  const idxPrice = getColIndex(['單價', 'price', '價格', '成交單價', '買入價格', '賣出價格']);
  const idxCurrency = getColIndex(['幣別', 'currency']);
  const idxFee = getColIndex(['手續費', 'fee']);
  const idxTax = getColIndex(['稅費', 'tax']);
  const idxRatio = getColIndex(['比例', 'ratio', '折數', '換股比率', '減資比率', '配股率']);
  const idxCashAmount = getColIndex(['退款金額', '退款/配發金額', '退款', 'cashamount', '現金金額', '金額', '退還金額']);
  const idxExDate = getColIndex(['基準日', 'exdate', '除權息日']);
  const idxTargetSymbol = getColIndex(['目標標的', 'targetsymbol', '換股目標', '分拆目標']);
  const idxAllocRatio = getColIndex(['成本分攤比例', 'allocationratio', '分拆比例']);
  const idxConvPrice = getColIndex(['轉換價', 'conversionprice', 'cb轉換價']);
  const idxTags = getColIndex(['標籤', 'tags', 'tag']);
  const idxNote = getColIndex(['備註', 'note', 'memo']);

  const trades: TradeRecord[] = [];
  let skippedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) {
      continue;
    }

    const getVal = (idx: number): string => (idx !== -1 && idx < row.length ? row[idx].trim() : '');

    const rawDate = getVal(idxDate);
    const rawMarket = getVal(idxMarket).toUpperCase();
    const rawSymbol = getVal(idxSymbol).toUpperCase();
    const rawName = getVal(idxName);
    const rawType = getVal(idxType).toUpperCase();
    const rawShares = parseFloat(getVal(idxShares));
    const rawPrice = parseFloat(getVal(idxPrice));
    const rawCurrency = getVal(idxCurrency).toUpperCase();
    const rawFee = parseFloat(getVal(idxFee)) || 0;
    const rawTax = parseFloat(getVal(idxTax)) || 0;
    const rawRatio = parseFloat(getVal(idxRatio));
    const rawCashAmount = parseFloat(getVal(idxCashAmount));
    const rawExDate = getVal(idxExDate);
    const rawTargetSymbol = getVal(idxTargetSymbol).toUpperCase();
    const rawAllocRatio = parseFloat(getVal(idxAllocRatio));
    const rawConvPrice = parseFloat(getVal(idxConvPrice));
    const rawTags = getVal(idxTags);
    const rawNote = getVal(idxNote);

    const market: MarketType = rawMarket === 'US' ? 'US' : rawMarket === 'TW' ? 'TW' : rawSymbol.length >= 4 && /^\d+$/.test(rawSymbol) ? 'TW' : 'US';

    let type: TradeType = 'BUY';
    if (rawType.includes('CONVERSION') || rawType.includes('可轉債') || rawType.includes('CB') || rawType.includes('債券轉換')) {
      type = 'CB_CONVERSION';
    } else if (rawType.includes('MERGER') || rawType.includes('換股') || rawType.includes('合併')) {
      type = 'STOCK_MERGER';
    } else if (rawType.includes('PREFERRED') || rawType.includes('特別股') || rawType.includes('贖回')) {
      type = 'PREFERRED_REDEMPTION';
    } else if (rawType.includes('SPIN') || rawType.includes('分拆')) {
      type = 'SPIN_OFF';
    } else if (rawType.includes('TENDER') || rawType.includes('收購') || rawType.includes('私有化')) {
      type = 'TENDER_OFFER';
    } else if (rawType.includes('STOCK_DIV') || rawType.includes('除權') || rawType.includes('配股')) {
      type = 'STOCK_DIVIDEND';
    } else if (rawType.includes('SPLIT') || rawType.includes('分割') || rawType.includes('拆股')) {
      type = 'STOCK_SPLIT';
    } else if (rawType.includes('REDUCTION') || rawType.includes('減資')) {
      type = 'CAPITAL_REDUCTION';
    } else if (rawType.includes('INCREASE') || rawType.includes('增資') || rawType.includes('認股')) {
      type = 'CAPITAL_INCREASE';
    } else if (rawType.includes('DIV') || rawType.includes('息')) {
      type = 'DIVIDEND';
    } else if (rawType.includes('SELL') || rawType.includes('賣')) {
      type = 'SELL';
    } else {
      type = 'BUY';
    }

    const currency: Currency = rawCurrency === 'USD' ? 'USD' : rawCurrency === 'TWD' ? 'TWD' : market === 'TW' ? 'TWD' : 'USD';

    if (!rawDate || !rawSymbol) {
      skippedCount++;
      continue;
    }

    if (
      (type === 'BUY' || type === 'SELL' || type === 'CAPITAL_INCREASE') &&
      (isNaN(rawShares) || rawShares <= 0 || isNaN(rawPrice) || rawPrice < 0)
    ) {
      skippedCount++;
      continue;
    }

    const tags = rawTags
      ? rawTags.split(/[;,]/).map((t) => t.trim()).filter((t) => t.length > 0)
      : [];

    trades.push({
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      date: rawDate,
      symbol: rawSymbol,
      name: resolveOfficialSecurityName(rawSymbol, rawName),
      market,
      currency,
      type,
      accountId: market === 'TW' ? 'broker-tw-default' : 'broker-us-default',
      shares: isNaN(rawShares) ? 0 : rawShares,
      price: isNaN(rawPrice) ? 0 : rawPrice,
      fee: isNaN(rawFee) ? 0 : rawFee,
      tax: isNaN(rawTax) ? 0 : rawTax,
      ratio: !isNaN(rawRatio) && rawRatio > 0 ? rawRatio : undefined,
      cashAmount: !isNaN(rawCashAmount) ? rawCashAmount : undefined,
      exDate: rawExDate || undefined,
      targetSymbol: rawTargetSymbol || undefined,
      allocationRatio: !isNaN(rawAllocRatio) && rawAllocRatio > 0 ? rawAllocRatio : undefined,
      conversionPrice: !isNaN(rawConvPrice) && rawConvPrice > 0 ? rawConvPrice : undefined,
      tags,
      note: rawNote,
      createdAt: Date.now() - (lines.length - i) * 1000,
    });
  }

  return {
    trades,
    successCount: trades.length,
    skippedCount,
  };
}

export function exportTradesToJSON(trades: TradeRecord[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(trades, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `stock_trades_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportTradesToCSV(trades: TradeRecord[]): void {
  const headers = [
    '日期',
    '市場',
    '代碼',
    '名稱',
    '類別',
    '股數',
    '單價',
    '幣別',
    '手續費',
    '稅費',
    '比例',
    '退款/配發金額',
    '基準日',
    '目標標的',
    '成本分攤比例',
    '轉換價',
    '標籤',
    '備註',
  ];
  const rows = trades.map((t) => [
    t.date,
    t.market,
    t.symbol,
    `"${(t.name || '').replace(/"/g, '""')}"`,
    t.type,
    t.shares,
    t.price,
    t.currency,
    t.fee,
    t.tax,
    t.ratio !== undefined ? t.ratio : '',
    t.cashAmount !== undefined ? t.cashAmount : '',
    t.exDate || '',
    t.targetSymbol || '',
    t.allocationRatio !== undefined ? t.allocationRatio : '',
    t.conversionPrice !== undefined ? t.conversionPrice : '',
    `"${(t.tags || []).join(';')}"`,
    `"${(t.note || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', `stock_trades_backup_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function getDefaultSampleTrades(): TradeRecord[] {
  return [
    {
      id: 'trade-tw-1',
      date: '2026-01-05',
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      currency: 'TWD',
      type: 'BUY',
      shares: 1000,
      price: 620,
      fee: 883,
      tax: 0,
      tags: ['核心持股', '晶圓代工'],
      note: '長線定期定額建倉',
      createdAt: Date.now() - 10000000,
    },
    {
      id: 'trade-tw-2',
      date: '2026-02-12',
      symbol: '0050',
      name: '元大台灣50',
      market: 'TW',
      currency: 'TWD',
      type: 'BUY',
      shares: 2000,
      price: 165,
      fee: 470,
      tax: 0,
      tags: ['大盤指數', '被動投資'],
      note: '大盤回檔加碼',
      createdAt: Date.now() - 8000000,
    },
    {
      id: 'trade-us-1',
      date: '2026-01-15',
      symbol: 'NVDA',
      name: 'NVIDIA Corp.',
      market: 'US',
      currency: 'USD',
      type: 'BUY',
      shares: 25,
      price: 110,
      fee: 0,
      tax: 0,
      tags: ['AI動能', '美股核心'],
      note: 'AI伺服器需求強勁',
      createdAt: Date.now() - 6000000,
    },
    {
      id: 'trade-us-2',
      date: '2026-02-01',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'US',
      currency: 'USD',
      type: 'BUY',
      shares: 15,
      price: 220,
      fee: 0,
      tax: 0,
      tags: ['護城河', '美股核心'],
      note: '蘋果生態系護城河',
      createdAt: Date.now() - 4000000,
    },
    {
      id: 'trade-us-3',
      date: '2026-02-20',
      symbol: 'NVDA',
      name: 'NVIDIA Corp.',
      market: 'US',
      currency: 'USD',
      type: 'SELL',
      shares: 5,
      price: 140,
      fee: 0.5,
      tax: 0,
      tags: ['停利', '波段'],
      note: '部分獲利入袋再平衡',
      createdAt: Date.now() - 2000000,
    }
  ];
}

export function loadApiKeysConfigFromStorage(): ApiKeysConfig {
  try {
    const raw = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ApiKeysConfig;
  } catch (err) {
    logger.error('Failed to load api keys config from storage:', err);
    return {};
  }
}

export function saveApiKeysConfigToStorage(config: ApiKeysConfig): void {
  try {
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(config));
    if (typeof indexedDB !== 'undefined') {
      dbPut('settings', { key: 'apiKeys', value: config }).catch((err) =>
        logger.error('Failed to save api keys to IndexedDB:', err)
      );
    }
  } catch (err) {
    logger.error('Failed to save api keys config to storage:', err);
  }
}

export function loadHistoricalPricesFromStorage(): HistoricalDailyPriceMap {
  try {
    const raw = localStorage.getItem(HISTORICAL_PRICES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as HistoricalDailyPriceMap;
  } catch (err) {
    logger.error('Failed to load historical prices from storage:', err);
    return {};
  }
}

export function saveHistoricalPricesToStorage(prices: HistoricalDailyPriceMap): void {
  try {
    localStorage.setItem(HISTORICAL_PRICES_STORAGE_KEY, JSON.stringify(prices));
    if (typeof indexedDB !== 'undefined' && prices && Object.keys(prices).length > 0) {
      const items = Object.entries(prices).map(([symbol, data]) => ({ symbol, prices: data }));
      dbClear('historicalPrices')
        .then(() => dbBatchPut('historicalPrices', items))
        .catch((err) => logger.error('Failed to save historical prices to IndexedDB:', err));
    }
  } catch (err) {
    logger.error('Failed to save historical prices to storage:', err);
  }
}

export function loadHistoricalFxFromStorage(): HistoricalFxRateMap {
  try {
    const raw = localStorage.getItem(HISTORICAL_FX_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as HistoricalFxRateMap;
  } catch (err) {
    logger.error('Failed to load historical fx from storage:', err);
    return {};
  }
}

export function saveHistoricalFxToStorage(fxMap: HistoricalFxRateMap): void {
  try {
    localStorage.setItem(HISTORICAL_FX_STORAGE_KEY, JSON.stringify(fxMap));
    if (typeof indexedDB !== 'undefined' && fxMap && Object.keys(fxMap).length > 0) {
      const items = Object.entries(fxMap).map(([pair, data]) => ({ pair, fxRates: data }));
      dbClear('historicalFx')
        .then(() => dbBatchPut('historicalFx', items))
        .catch((err) => logger.error('Failed to save historical fx to IndexedDB:', err));
    }
  } catch (err) {
    logger.error('Failed to save historical fx to storage:', err);
  }
}

export function loadCashTransactionsFromStorage(): CashTransaction[] {
  try {
    const raw = localStorage.getItem(CASH_TRANSACTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.error('Failed to load cash transactions from storage:', err);
    return [];
  }
}

export function saveCashTransactionsToStorage(transactions: CashTransaction[]): void {
  try {
    localStorage.setItem(CASH_TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
    if (typeof indexedDB !== 'undefined') {
      dbClear('cashTransactions')
        .then(() => dbBatchPut('cashTransactions', transactions))
        .catch((err) => logger.error('Failed to save cash transactions to IndexedDB:', err));
    }
  } catch (err) {
    logger.error('Failed to save cash transactions to storage:', err);
  }
}

export function loadLoanRecordsFromStorage(): LoanRecord[] {
  try {
    const raw = localStorage.getItem(LOAN_RECORDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.error('Failed to load loan records from storage:', err);
    return [];
  }
}

export function saveLoanRecordsToStorage(loans: LoanRecord[]): void {
  try {
    localStorage.setItem(LOAN_RECORDS_STORAGE_KEY, JSON.stringify(loans));
    if (typeof indexedDB !== 'undefined') {
      dbClear('loanRecords')
        .then(() => dbBatchPut('loanRecords', loans))
        .catch((err) => logger.error('Failed to save loan records to IndexedDB:', err));
    }
  } catch (err) {
    logger.error('Failed to save loan records to storage:', err);
  }
}

/**
 * 非同步初始化資料庫與儲存層（自動執行無損遷移與初次載入）
 */
/**
 * 自動校正美股嘉信理財歷史交易紀錄（消除歷史手動輸入之零頭差額與除息日/發放日日期差）
 * 冪等執行，僅在偵測到不符項目時校正一次
 */
export function autoReconcileSchwabRecords(
  trades: TradeRecord[],
  cashTransactions: CashTransaction[]
): { trades: TradeRecord[]; cashTransactions: CashTransaction[]; modified: boolean } {
  let modified = false;

  const updatedTrades = trades.map((t) => {
    // 1. SGOV 買進記錄校正 (01/01/26 89 股，嘉信實扣 $8,933.82)
    if (t.symbol === 'SGOV' && t.type === 'BUY' && Math.round(t.shares) === 89) {
      if (Math.abs((t.price * t.shares + t.fee) - 8933.82) > 0.01) {
        modified = true;
        return {
          ...t,
          price: 100.38,
          fee: 0,
        };
      }
    }

    // 2. SGOV 賣出記錄校正 (01/28/26 89 股，嘉信實收 $8,956.07)
    if (t.symbol === 'SGOV' && t.type === 'SELL' && Math.round(t.shares) === 89) {
      if (Math.abs((t.price * t.shares - (t.tax || 0) - (t.fee || 0)) - 8956.07) > 0.01) {
        modified = true;
        return {
          ...t,
          price: 100.63,
          fee: 0.02,
          tax: 0,
        };
      }
    }

    // 3. VT 2026-03-24 股息校正 (毛額 $26.18，稅 $7.85)
    if (t.symbol === 'VT' && t.type === 'DIVIDEND' && (t.date === '2026-03-20' || t.date === '2026-03-24')) {
      const gross = t.shares * t.price;
      if (Math.abs(gross - 26.18) > 0.01 || t.date !== '2026-03-24' || Math.abs((t.tax || 0) - 7.85) > 0.01) {
        modified = true;
        return {
          ...t,
          date: '2026-03-24',
          price: t.shares > 0 ? 26.18 / t.shares : 26.18,
          tax: 7.85,
        };
      }
    }

    // 4. VT 2026-06-23 股息校正 (毛額 $45.09，稅 $13.53)
    if (t.symbol === 'VT' && t.type === 'DIVIDEND' && (t.date === '2026-06-18' || t.date === '2026-06-23')) {
      const gross = t.shares * t.price;
      if (Math.abs(gross - 45.09) > 0.01 || t.date !== '2026-06-23' || Math.abs((t.tax || 0) - 13.53) > 0.01) {
        modified = true;
        return {
          ...t,
          date: '2026-06-23',
          price: t.shares > 0 ? 45.09 / t.shares : 45.09,
          tax: 13.53,
        };
      }
    }

    return t;
  });

  // 5. 移除手動校正 -$1.79 的流水
  const filteredCash = cashTransactions.filter((tx) => {
    if (tx.note && tx.note.includes('初始本金/交割戶真實餘額校正') && Math.abs(Math.abs(tx.amount) - 1.79) < 0.1) {
      modified = true;
      return false;
    }
    return true;
  });

  return {
    trades: updatedTrades,
    cashTransactions: filteredCash,
    modified,
  };
}

export async function initializeStorageAsync(): Promise<{
  trades: TradeRecord[];
  brokerAccounts: BrokerAccount[];
  cashTransactions: CashTransaction[];
  loanRecords: LoanRecord[];
  apiKeys: ApiKeysConfig;
  accountingView: AccountingView;
  historicalPrices: HistoricalDailyPriceMap;
  historicalFx: HistoricalFxRateMap;
}> {
  try {
    // 執行無損平滑遷移
    await migrateFromLocalStorageIfNeeded();

    const [dbTrades, dbAccounts, dbCash, dbLoans, dbHistPricesRaw, dbHistFxRaw, dbApiKeysObj, dbViewObj] =
      await Promise.all([
        dbGetAll<TradeRecord>('trades'),
        dbGetAll<BrokerAccount>('brokerAccounts'),
        dbGetAll<CashTransaction>('cashTransactions'),
        dbGetAll<LoanRecord>('loanRecords'),
        dbGetAll<{ symbol: string; prices?: any }>('historicalPrices'),
        dbGetAll<{ pair: string; fxRates?: any }>('historicalFx'),
        dbGet<{ key: string; value: ApiKeysConfig }>('settings', 'apiKeys'),
        dbGet<{ key: string; value: AccountingView }>('settings', 'accountingView'),
      ]);

    // 處理歷史日 K 結構
    const historicalPrices: HistoricalDailyPriceMap = {};
    if (dbHistPricesRaw && dbHistPricesRaw.length > 0) {
      for (const item of dbHistPricesRaw) {
        if (item.symbol && item.prices) {
          historicalPrices[item.symbol] = item.prices;
        }
      }
    }

    // 處理歷史匯率結構
    const historicalFx: HistoricalFxRateMap = {};
    if (dbHistFxRaw && dbHistFxRaw.length > 0) {
      for (const item of dbHistFxRaw) {
        if (item.pair && item.fxRates) {
          historicalFx[item.pair] = item.fxRates;
        }
      }
    }

    let rawTrades = dbTrades.length > 0 ? dbTrades : loadTradesFromStorage();
    const brokerAccounts = dbAccounts.length > 0 ? dbAccounts : loadBrokerAccountsFromStorage();
    let rawCash = dbCash.length > 0 ? dbCash : loadCashTransactionsFromStorage();
    const loanRecords = dbLoans.length > 0 ? dbLoans : loadLoanRecordsFromStorage();
    const apiKeys = dbApiKeysObj?.value || loadApiKeysConfigFromStorage();
    const accountingView = dbViewObj?.value || loadAccountingViewFromStorage();

    // 執行嘉信理財真實對帳單精準校正
    const reconciled = autoReconcileSchwabRecords(rawTrades, rawCash);
    const trades = reconciled.trades;
    const cashTransactions = reconciled.cashTransactions;

    if (reconciled.modified) {
      saveTradesToStorage(trades);
      saveCashTransactionsToStorage(cashTransactions);
    }

    return {
      trades,
      brokerAccounts,
      cashTransactions,
      loanRecords,
      apiKeys,
      accountingView,
      historicalPrices: Object.keys(historicalPrices).length > 0 ? historicalPrices : loadHistoricalPricesFromStorage(),
      historicalFx: Object.keys(historicalFx).length > 0 ? historicalFx : loadHistoricalFxFromStorage(),
    };
  } catch (err) {
    logger.error('Failed in initializeStorageAsync, falling back to localStorage:', err);
    return {
      trades: loadTradesFromStorage(),
      brokerAccounts: loadBrokerAccountsFromStorage(),
      cashTransactions: loadCashTransactionsFromStorage(),
      loanRecords: loadLoanRecordsFromStorage(),
      apiKeys: loadApiKeysConfigFromStorage(),
      accountingView: loadAccountingViewFromStorage(),
      historicalPrices: loadHistoricalPricesFromStorage(),
      historicalFx: loadHistoricalFxFromStorage(),
    };
  }
}

