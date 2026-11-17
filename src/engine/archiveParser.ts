import { StockTrackerUnifiedArchiveV2, TradeRecord, BrokerAccount } from '../types/stock';
import { validateTradesSchema } from '../utils/storage';

export type ArchiveFormat = 'V2_UNIFIED' | 'V1_TRADES_ARRAY' | 'INVALID';

/**
 * 識別匯入檔案之格式
 */
export function detectArchiveFormat(content: unknown): ArchiveFormat {
  if (!content || typeof content !== 'object') {
    return 'INVALID';
  }

  // 1. 判定是否為 V2 全態封包
  if (
    !Array.isArray(content) &&
    (('schemaVersion' in content && (content as any).schemaVersion === '2.0.0') ||
      ('payload' in content && typeof (content as any).payload === 'object') ||
      ('generator' in content && (content as any).generator === 'StockTracker-Core'))
  ) {
    return 'V2_UNIFIED';
  }

  // 2. 判定是否為 V1 純交易陣列
  if (Array.isArray(content)) {
    const validated = validateTradesSchema(content);
    if (validated && validated.length > 0) {
      return 'V1_TRADES_ARRAY';
    }
  }

  return 'INVALID';
}

/**
 * 解析並修復 V2 全態封包 (外鍵健全性檢查與對齊)
 */
export function parseUnifiedArchiveV2(raw: unknown): StockTrackerUnifiedArchiveV2 | null {
  if (detectArchiveFormat(raw) !== 'V2_UNIFIED') {
    return null;
  }

  const obj = raw as any;
  const payload = obj.payload || obj.data;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const rawTrades: TradeRecord[] = Array.isArray(payload.trades) ? payload.trades : [];
  const rawAccounts: BrokerAccount[] = Array.isArray(payload.brokerAccounts) ? payload.brokerAccounts : [];
  const rawCash = Array.isArray(payload.cashTransactions) ? payload.cashTransactions : [];
  const rawLoans = Array.isArray(payload.loanRecords) ? payload.loanRecords : [];
  const rawCA = Array.isArray(payload.corporateActions) ? payload.corporateActions : [];
  const rawSettings = payload.settings || {};

  // 外鍵健全性檢查：若交易中之 accountId / brokerAccountId 不在 accounts 清單內，修復至首個有效帳戶
  const validAccountIds = new Set(rawAccounts.map((a) => a.id));
  const fallbackAccountId = rawAccounts[0]?.id || 'broker-tw-default';

  const fixedTrades = rawTrades.map((t) => {
    const currentAcc = t.accountId || (t as any).brokerAccountId;
    if (currentAcc && validAccountIds.has(currentAcc)) {
      return t;
    }
    return {
      ...t,
      accountId: fallbackAccountId,
    };
  });

  const fixedCash = rawCash.map((c: any) => {
    if (c.accountId && validAccountIds.has(c.accountId)) {
      return c;
    }
    return {
      ...c,
      accountId: fallbackAccountId,
    };
  });

  return {
    schemaVersion: '2.0.0',
    generator: 'StockTracker-Core',
    version: typeof obj.version === 'number' ? obj.version : 4,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    isRedacted: Boolean(obj.isRedacted),
    payload: {
      trades: fixedTrades,
      brokerAccounts: rawAccounts,
      cashTransactions: fixedCash,
      loanRecords: rawLoans,
      corporateActions: rawCA,
      settings: rawSettings,
      snapshots: payload.snapshots,
      marketSnapshot: payload.marketSnapshot,
    },
    metrics: {
      totalTrades: fixedTrades.length,
      totalAccounts: rawAccounts.length,
      totalCashTransactions: fixedCash.length,
      totalLoans: rawLoans.length,
      totalCorporateActions: rawCA.length,
    },
    data: {
      trades: fixedTrades,
      brokerAccounts: rawAccounts,
      cashTransactions: fixedCash,
      loanRecords: rawLoans,
      corporateActions: rawCA,
      snapshots: payload.snapshots,
      settings: Array.isArray(payload.settings) ? payload.settings : [],
    },
  };
}
