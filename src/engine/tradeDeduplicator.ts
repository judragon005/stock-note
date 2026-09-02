import { TradeRecord } from '../types/stock';

export type DeduplicationStatus = 'NEW' | 'DUPLICATE' | 'INVALID';

export interface DeduplicationAnalysisRow {
  trade: Partial<TradeRecord>;
  status: DeduplicationStatus;
  fingerprint: string;
  reason?: string;
}

export interface DeduplicationSummary {
  total: number;
  newCount: number;
  duplicateCount: number;
  invalidCount: number;
}

export interface DeduplicationResult {
  rows: DeduplicationAnalysisRow[];
  summary: DeduplicationSummary;
}

export type ImportDeduplicationMode = 'SMART_MERGE' | 'OVERWRITE' | 'APPEND_ALL';

/**
 * 產生單筆交易的核心特徵指紋 (Fingerprint)
 * 指紋公式：date_market_symbol_type_shares_price
 */
export function getTradeFingerprint(trade: Partial<TradeRecord>): string {
  const date = (trade.date || '').trim();
  const market = (trade.market || 'TW').trim().toUpperCase();
  const symbol = (trade.symbol || '').trim().toUpperCase();
  const type = (trade.type || 'BUY').trim().toUpperCase();
  const shares = Math.abs(Number(trade.shares) || 0);
  const price = Math.abs(Number(trade.price) || 0);

  return `${date}_${market}_${symbol}_${type}_${shares}_${price}`;
}

/**
 * 批次分析匯入交易記錄與現有資料庫的比對狀態
 */
export function analyzeTradesDeduplication(
  incoming: Partial<TradeRecord>[],
  existing: TradeRecord[]
): DeduplicationResult {
  const existingFingerprints = new Set(existing.map(getTradeFingerprint));
  const seenIncomingFingerprints = new Set<string>();

  const rows: DeduplicationAnalysisRow[] = [];
  let newCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  for (const item of incoming) {
    const isDateValid = Boolean(item.date && item.date.trim().length >= 8);
    const isSymbolValid = Boolean(item.symbol && item.symbol.trim().length > 0);
    const isSharesValid = typeof item.shares === 'number' && !isNaN(item.shares) && item.shares > 0;
    const isPriceValid = typeof item.price === 'number' && !isNaN(item.price) && item.price >= 0;

    // 除權息/減資可能股數或價格為 0/未定義，買賣則必須合法
    const isTypeNonTrading =
      item.type === 'DIVIDEND' ||
      item.type === 'CAPITAL_REDUCTION' ||
      item.type === 'STOCK_DIVIDEND' ||
      item.type === 'STOCK_SPLIT';

    const isValid = isDateValid && isSymbolValid && (isTypeNonTrading || (isSharesValid && isPriceValid));

    if (!isValid) {
      rows.push({
        trade: item,
        status: 'INVALID',
        fingerprint: '',
        reason: '缺少必要欄位 (日期/代碼/股數/單價)',
      });
      invalidCount++;
      continue;
    }

    const fp = getTradeFingerprint(item);
    if (existingFingerprints.has(fp) || seenIncomingFingerprints.has(fp)) {
      rows.push({
        trade: item,
        status: 'DUPLICATE',
        fingerprint: fp,
        reason: '與系統既有紀錄或同批次前項重複',
      });
      duplicateCount++;
    } else {
      rows.push({
        trade: item,
        status: 'NEW',
        fingerprint: fp,
      });
      seenIncomingFingerprints.add(fp);
      newCount++;
    }
  }

  return {
    rows,
    summary: {
      total: incoming.length,
      newCount,
      duplicateCount,
      invalidCount,
    },
  };
}

/**
 * 依據使用者選擇之匯入模式套用去重並回傳最終入庫之 TradeRecord 陣列
 */
export function applyImportDeduplication(
  mode: ImportDeduplicationMode,
  incoming: Partial<TradeRecord>[],
  existing: TradeRecord[]
): TradeRecord[] {
  const analysis = analyzeTradesDeduplication(incoming, existing);

  // 輔助函式：確保 Partial<TradeRecord> 轉為完整合法 TradeRecord
  const ensureFullTrade = (t: Partial<TradeRecord>): TradeRecord => {
    return {
      id: t.id || `trade-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      date: t.date || '',
      symbol: t.symbol || '',
      name: t.name || t.symbol || '',
      market: t.market || 'TW',
      currency: t.currency || (t.market === 'US' ? 'USD' : 'TWD'),
      type: t.type || 'BUY',
      accountId: t.accountId || (t.market === 'US' ? 'broker-us-default' : 'broker-tw-default'),
      shares: t.shares || 0,
      price: t.price || 0,
      fee: t.fee || 0,
      tax: t.tax || 0,
      note: t.note,
      ratio: t.ratio,
      cashAmount: t.cashAmount,
      exDate: t.exDate,
      targetSymbol: t.targetSymbol,
      allocationRatio: t.allocationRatio,
      conversionPrice: t.conversionPrice,
      tags: t.tags || [],
      createdAt: t.createdAt || Date.now(),
    };
  };

  if (mode === 'OVERWRITE') {
    return analysis.rows
      .filter((r) => r.status !== 'INVALID')
      .map((r) => ensureFullTrade(r.trade));
  }

  if (mode === 'SMART_MERGE') {
    const newItems = analysis.rows
      .filter((r) => r.status === 'NEW')
      .map((r) => ensureFullTrade(r.trade));
    return [...existing, ...newItems];
  }

  if (mode === 'APPEND_ALL') {
    const validItems = analysis.rows
      .filter((r) => r.status !== 'INVALID')
      .map((r) => ensureFullTrade(r.trade));
    return [...existing, ...validItems];
  }

  return existing;
}
