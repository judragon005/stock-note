import { TradeRecord } from '../types/stock';

export interface DatabaseBackupExport {
  version: number;
  exportedAt: string;
  isRedacted?: boolean;
  data: {
    trades?: TradeRecord[];
    brokerAccounts?: unknown[];
    cashTransactions?: unknown[];
    loanRecords?: unknown[];
    snapshots?: unknown[];
    settings?: unknown[];
    corporateActions?: unknown[];
  };
}

/**
 * 遞迴過濾並剔除所有原型污染保留鍵名 (__proto__, constructor, prototype)
 */
export function safeSanitizeObject<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => safeSanitizeObject(item)) as unknown as T;
  }

  const cleanObj: Record<string, unknown> = Object.create(null);
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    cleanObj[key] = safeSanitizeObject(value);
  }

  return cleanObj as T;
}

const SYMBOL_REGEX = /^[A-Za-z0-9.-]{1,12}$/;
const MAX_SHARES = 1e9;
const MAX_PRICE = 1e7;
const MAX_FEE_OR_TAX = 1e8;
const MAX_NOTE_LENGTH = 2000;
const MAX_TAGS_COUNT = 20;
const MAX_TAG_LENGTH = 50;

/**
 * 單筆交易紀錄合法性與數值邊界硬性熔斷守門員
 */
export function sanitizeTradeRecord(trade: unknown): TradeRecord | null {
  if (!trade || typeof trade !== 'object') {
    return null;
  }

  const t = safeSanitizeObject(trade) as Partial<TradeRecord>;

  // 1. 必填識別欄位檢驗
  if (!t.symbol || typeof t.symbol !== 'string') return null;
  const cleanSymbol = t.symbol.trim().toUpperCase();
  if (!SYMBOL_REGEX.test(cleanSymbol)) return null;

  if (!t.date || typeof t.date !== 'string') return null;

  // 2. 數值邊界檢驗 (shares)
  const shares = typeof t.shares === 'number' ? t.shares : Number(t.shares);
  if (!Number.isFinite(shares) || shares <= 0 || shares > MAX_SHARES) {
    return null;
  }

  // 3. 數值邊界檢驗 (price)
  const price = typeof t.price === 'number' ? t.price : Number(t.price);
  if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) {
    return null;
  }

  // 4. 手續費與稅費
  const fee = typeof t.fee === 'number' && Number.isFinite(t.fee) && t.fee >= 0 ? Math.min(t.fee, MAX_FEE_OR_TAX) : 0;
  const tax = typeof t.tax === 'number' && Number.isFinite(t.tax) && t.tax >= 0 ? Math.min(t.tax, MAX_FEE_OR_TAX) : 0;

  // 5. 備忘長度截斷防 DoS
  let note = '';
  if (typeof t.note === 'string') {
    note = t.note.slice(0, MAX_NOTE_LENGTH);
  }

  // 6. 標籤數量與長度熔斷
  let tags: string[] = [];
  if (Array.isArray(t.tags)) {
    tags = t.tags
      .filter((tag): tag is string => typeof tag === 'string')
      .slice(0, MAX_TAGS_COUNT)
      .map((tag) => tag.slice(0, MAX_TAG_LENGTH));
  }

  return {
    ...t,
    id: t.id || `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: t.date,
    symbol: cleanSymbol,
    name: t.name || cleanSymbol,
    market: t.market === 'US' ? 'US' : 'TW',
    currency: t.currency || (t.market === 'US' ? 'USD' : 'TWD'),
    type: t.type || 'BUY',
    accountId: t.accountId || 'broker-tw-default',
    shares,
    price,
    fee,
    tax,
    note,
    tags,
    createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
  } as TradeRecord;
}

/**
 * 全庫備份反序列化前置安全檢核
 */
export function validateFullDatabaseBackup(parsed: unknown): DatabaseBackupExport | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const cleanPayload = safeSanitizeObject(parsed) as any;
  if (!cleanPayload.data || typeof cleanPayload.data !== 'object') {
    return null;
  }

  const cleanData = cleanPayload.data;
  const sanitizedTrades: TradeRecord[] = [];

  if (Array.isArray(cleanData.trades)) {
    for (const rawTrade of cleanData.trades) {
      const sanitized = sanitizeTradeRecord(rawTrade);
      if (sanitized) {
        sanitizedTrades.push(sanitized);
      }
    }
  }

  return {
    version: typeof cleanPayload.version === 'number' ? cleanPayload.version : 1,
    exportedAt: typeof cleanPayload.exportedAt === 'string' ? cleanPayload.exportedAt : new Date().toISOString(),
    isRedacted: Boolean(cleanPayload.isRedacted),
    data: {
      ...cleanData,
      trades: sanitizedTrades,
    },
  };
}
