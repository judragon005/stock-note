import {
  TradeRecord,
  BrokerAccount,
  CashTransaction,
  LoanRecord,
  HistoricalDailyPriceMap,
  HistoricalFxRateMap,
  PriceMetadataStore,
  ApiKeysConfig,
  AccountingView,
  StoredCorporateAction,
  LocalStorageInspectionStats,
  StorageObjectStoreStat,
} from '../types/stock';
import { logger } from './logger';
import { getStockDictionaryStats } from '../engine/stockNameResolver';
import { SymbolOhlcvStore, SymbolIndicatorsStore } from '../types/indicators';

export const DB_NAME = 'StockTrackerDB';
export const DB_VERSION = 3;

export type StoreName =
  | 'trades'
  | 'brokerAccounts'
  | 'cashTransactions'
  | 'loanRecords'
  | 'historicalPrices'
  | 'historicalFx'
  | 'priceMetadata'
  | 'snapshots'
  | 'settings'
  | 'corporateActions'
  | 'historicalOhlcv'
  | 'technicalIndicators';


export interface SystemSnapshotPayload {
  trades: TradeRecord[];
  brokerAccounts: BrokerAccount[];
  cashTransactions: CashTransaction[];
  loanRecords: LoanRecord[];
  historicalPrices: HistoricalDailyPriceMap;
  historicalFx: HistoricalFxRateMap;
  priceMetadata: PriceMetadataStore;
  apiKeys: ApiKeysConfig;
  accountingView: AccountingView;
}

export interface SystemSnapshotMetrics {
  totalTrades: number;
  totalCashTransactions: number;
  totalAccounts: number;
  totalNavTwd: number;
}

export interface SystemSnapshot {
  id: string;
  name: string;
  reason: 'AUTO_BEFORE_IMPORT' | 'AUTO_BEFORE_RESET' | 'AUTO_BEFORE_CORP_ACTION' | 'MANUAL';
  createdAt: string;
  isLocked?: boolean;
  metricsSummary: SystemSnapshotMetrics;
  payload: SystemSnapshotPayload;
}

let dbInstance: IDBDatabase | null = null;

/**
 * 開啟並取得 IndexedDB 實例
 */
export function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('trades')) {
        db.createObjectStore('trades', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('brokerAccounts')) {
        db.createObjectStore('brokerAccounts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cashTransactions')) {
        db.createObjectStore('cashTransactions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('loanRecords')) {
        db.createObjectStore('loanRecords', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('historicalPrices')) {
        db.createObjectStore('historicalPrices', { keyPath: 'symbol' });
      }
      if (!db.objectStoreNames.contains('historicalFx')) {
        db.createObjectStore('historicalFx', { keyPath: 'pair' });
      }
      if (!db.objectStoreNames.contains('priceMetadata')) {
        db.createObjectStore('priceMetadata', { keyPath: 'symbol' });
      }
      if (!db.objectStoreNames.contains('snapshots')) {
        const snapStore = db.createObjectStore('snapshots', { keyPath: 'id' });
        snapStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('corporateActions')) {
        const caStore = db.createObjectStore('corporateActions', { keyPath: 'id' });
        caStore.createIndex('by_symbol', 'symbol', { unique: false });
        caStore.createIndex('by_date', 'date', { unique: false });
        caStore.createIndex('by_type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains('historicalOhlcv')) {
        db.createObjectStore('historicalOhlcv', { keyPath: 'symbol' });
      }
      if (!db.objectStoreNames.contains('technicalIndicators')) {
        db.createObjectStore('technicalIndicators', { keyPath: 'symbol' });
      }
    };


    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      logger.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

/**
 * 關閉資料庫連線
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * 刪除資料庫
 */
export function deleteDB(): Promise<void> {
  closeDB();
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve();
      return;
    }
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 讀取單筆資料
 */
export async function dbGet<T>(storeName: StoreName, key: any): Promise<T | undefined> {
  const db = await openDB();
  if (!db.objectStoreNames.contains(storeName)) {
    return undefined;
  }
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 讀取 Store 全量清單
 */
export async function dbGetAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  if (!db.objectStoreNames.contains(storeName)) {
    return [];
  }
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []) as T[]);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 寫入單筆資料
 */
export async function dbPut<T>(storeName: StoreName, value: T): Promise<void> {
  const db = await openDB();
  if (!db.objectStoreNames.contains(storeName)) {
    return;
  }
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 批量寫入多筆資料 (批次事務)
 */
export async function dbBatchPut<T>(storeName: StoreName, values: T[]): Promise<void> {
  if (!values || values.length === 0) return;
  const db = await openDB();
  if (!db.objectStoreNames.contains(storeName)) {
    return;
  }
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      for (const val of values) {
        store.put(val);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Transaction aborted'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 刪除單筆資料
 */
export async function dbDelete(storeName: StoreName, key: any): Promise<void> {
  const db = await openDB();
  if (!db.objectStoreNames.contains(storeName)) {
    return;
  }
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 清空指定 Store
 */
export async function dbClear(storeName: StoreName): Promise<void> {
  const db = await openDB();
  if (!db.objectStoreNames.contains(storeName)) {
    return;
  }
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 跨多表原子性事務
 */
export async function dbTransaction<T>(
  storeNames: StoreName[],
  mode: 'readonly' | 'readwrite',
  callback: (stores: Record<StoreName, IDBObjectStore>, tx: IDBTransaction) => Promise<T>
): Promise<T> {
  const db = await openDB();
  const tx = db.transaction(storeNames, mode);
  const storeMap = {} as Record<StoreName, IDBObjectStore>;
  for (const name of storeNames) {
    storeMap[name] = tx.objectStore(name);
  }
  return callback(storeMap, tx);
}

// -------------------------------------------------------------
// 時光機快照體系 (Time-Machine Snapshots)
// -------------------------------------------------------------

const MAX_AUTO_SNAPSHOTS = 10;

/**
 * 建立全量系統快照
 */
export async function createSystemSnapshot(
  name: string,
  reason: SystemSnapshot['reason'],
  payload: SystemSnapshotPayload,
  isLocked: boolean = false
): Promise<SystemSnapshot> {
  const snapshot: SystemSnapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    reason,
    createdAt: new Date().toISOString(),
    isLocked,
    metricsSummary: {
      totalTrades: payload.trades?.length || 0,
      totalCashTransactions: payload.cashTransactions?.length || 0,
      totalAccounts: payload.brokerAccounts?.length || 0,
      totalNavTwd: 0,
    },
    payload,
  };

  await dbPut<SystemSnapshot>('snapshots', snapshot);

  // 執行自動輪替清理（限制自動快照 <= MAX_AUTO_SNAPSHOTS 份）
  await rotateSnapshots();

  return snapshot;
}

/**
 * 取得所有快照列表（依建立時間降冪排序）
 */
export async function getSystemSnapshots(): Promise<SystemSnapshot[]> {
  const all = await dbGetAll<SystemSnapshot>('snapshots');
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * 自動輪替淘汰超過上限的未鎖定自動快照
 */
async function rotateSnapshots(): Promise<void> {
  const all = await getSystemSnapshots();
  const autoSnaps = all.filter((s) => !s.isLocked && s.reason !== 'MANUAL');

  if (autoSnaps.length > MAX_AUTO_SNAPSHOTS) {
    // 依時間由舊到新排序，將超出上限的多餘舊快照刪除
    const toDelete = autoSnaps
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, autoSnaps.length - MAX_AUTO_SNAPSHOTS);

    for (const snap of toDelete) {
      await dbDelete('snapshots', snap.id);
    }
  }
}

/**
 * 自快照一鍵還原資料庫
 */
export async function restoreSystemSnapshot(snapshotId: string): Promise<SystemSnapshot> {
  const snapshot = await dbGet<SystemSnapshot>('snapshots', snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot with id ${snapshotId} not found`);
  }

  const { payload } = snapshot;

  // 清空並覆寫所有核心 Store
  await dbClear('trades');
  if (payload.trades?.length) {
    await dbBatchPut('trades', payload.trades);
  }

  await dbClear('brokerAccounts');
  if (payload.brokerAccounts?.length) {
    await dbBatchPut('brokerAccounts', payload.brokerAccounts);
  }

  await dbClear('cashTransactions');
  if (payload.cashTransactions?.length) {
    await dbBatchPut('cashTransactions', payload.cashTransactions);
  }

  await dbClear('loanRecords');
  if (payload.loanRecords?.length) {
    await dbBatchPut('loanRecords', payload.loanRecords);
  }

  await dbClear('historicalPrices');
  if (payload.historicalPrices && Object.keys(payload.historicalPrices).length > 0) {
    const priceItems = Object.entries(payload.historicalPrices).map(([symbol, data]) => ({ symbol, prices: data }));
    await dbBatchPut('historicalPrices', priceItems);
  }

  await dbClear('historicalFx');
  if (payload.historicalFx && Object.keys(payload.historicalFx).length > 0) {
    const fxItems = Object.entries(payload.historicalFx).map(([pair, data]) => ({ pair, fxRates: data }));
    await dbBatchPut('historicalFx', fxItems);
  }

  await dbClear('priceMetadata');
  if (payload.priceMetadata) {
    await dbPut('settings', { key: 'priceMetadata', value: payload.priceMetadata });
  }

  if (payload.apiKeys) {
    await dbPut('settings', { key: 'apiKeys', value: payload.apiKeys });
  }

  if (payload.accountingView) {
    await dbPut('settings', { key: 'accountingView', value: payload.accountingView });
  }

  return snapshot;
}

/**
 * 刪除特定快照
 */
export async function deleteSystemSnapshot(snapshotId: string): Promise<void> {
  const snapshot = await dbGet<SystemSnapshot>('snapshots', snapshotId);
  if (!snapshot) return;

  if (snapshot.isLocked) {
    throw new Error('Cannot delete a locked snapshot');
  }

  await dbDelete('snapshots', snapshotId);
}

/**
 * 切換快照鎖定狀態
 */
export async function toggleLockSystemSnapshot(snapshotId: string): Promise<boolean> {
  const snapshot = await dbGet<SystemSnapshot>('snapshots', snapshotId);
  if (!snapshot) throw new Error('Snapshot not found');

  snapshot.isLocked = !snapshot.isLocked;
  await dbPut('snapshots', snapshot);
  return snapshot.isLocked;
}

// -------------------------------------------------------------
// 無損遷移演算法 (Non-Destructive Migration)
// -------------------------------------------------------------

const STORAGE_KEYS = {
  TRADES: 'STOCK_TRACKER_TRADES_V1',
  ACCOUNTS: 'STOCK_TRACKER_BROKER_ACCOUNTS_V1',
  CASH: 'STOCK_TRACKER_CASH_TRANSACTIONS_V1',
  LOANS: 'STOCK_TRACKER_LOAN_RECORDS_V1',
  PRICES: 'STOCK_TRACKER_CUSTOM_PRICES_V1',
  PRICE_META: 'STOCK_TRACKER_PRICE_METADATA_V1',
  RATE: 'STOCK_TRACKER_USD_TWD_RATE',
  VIEW: 'STOCK_TRACKER_ACCOUNTING_VIEW_V1',
  API_KEYS: 'STOCK_TRACKER_API_KEYS_V1',
  HIST_PRICES: 'STOCK_TRACKER_HISTORICAL_PRICES_V1',
  HIST_FX: 'STOCK_TRACKER_HISTORICAL_FX_V1',
};

/**
 * 檢查是否已完成 LocalStorage ➔ IndexedDB 遷移
 */
export async function isMigrated(): Promise<boolean> {
  const setting = await dbGet<{ key: string; value: boolean }>('settings', 'migration_completed');
  return !!setting?.value;
}

/**
 * 執行無損平滑遷移（若尚未遷移且 localStorage 存在舊資料）
 */
export async function migrateFromLocalStorageIfNeeded(): Promise<boolean> {
  const alreadyMigrated = await isMigrated();
  if (alreadyMigrated) {
    return false;
  }

  if (typeof localStorage === 'undefined') {
    await dbPut('settings', { key: 'migration_completed', value: true });
    return false;
  }

  try {
    const rawTrades = localStorage.getItem(STORAGE_KEYS.TRADES);
    const rawAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    const rawCash = localStorage.getItem(STORAGE_KEYS.CASH);
    const rawLoans = localStorage.getItem(STORAGE_KEYS.LOANS);
    const rawPriceMeta = localStorage.getItem(STORAGE_KEYS.PRICE_META);
    const rawApiKeys = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    const rawView = localStorage.getItem(STORAGE_KEYS.VIEW);
    const rawHistPrices = localStorage.getItem(STORAGE_KEYS.HIST_PRICES);
    const rawHistFx = localStorage.getItem(STORAGE_KEYS.HIST_FX);

    if (rawTrades) {
      const trades: TradeRecord[] = JSON.parse(rawTrades);
      await dbBatchPut('trades', trades);
    }

    if (rawAccounts) {
      const accounts: BrokerAccount[] = JSON.parse(rawAccounts);
      await dbBatchPut('brokerAccounts', accounts);
    }

    if (rawCash) {
      const cash: CashTransaction[] = JSON.parse(rawCash);
      await dbBatchPut('cashTransactions', cash);
    }

    if (rawLoans) {
      const loans: LoanRecord[] = JSON.parse(rawLoans);
      await dbBatchPut('loanRecords', loans);
    }

    if (rawPriceMeta) {
      const meta: PriceMetadataStore = JSON.parse(rawPriceMeta);
      const items = Object.entries(meta).map(([symbol, m]) => ({ symbol, ...m }));
      await dbBatchPut('priceMetadata', items);
    }

    if (rawApiKeys) {
      const apiKeys: ApiKeysConfig = JSON.parse(rawApiKeys);
      await dbPut('settings', { key: 'apiKeys', value: apiKeys });
    }

    if (rawView) {
      await dbPut('settings', { key: 'accountingView', value: rawView });
    }

    if (rawHistPrices) {
      const histPrices: HistoricalDailyPriceMap = JSON.parse(rawHistPrices);
      const items = Object.entries(histPrices).map(([symbol, p]) => ({ symbol, prices: p }));
      await dbBatchPut('historicalPrices', items);
    }

    if (rawHistFx) {
      const histFx: HistoricalFxRateMap = JSON.parse(rawHistFx);
      const items = Object.entries(histFx).map(([pair, f]) => ({ pair, fxRates: f }));
      await dbBatchPut('historicalFx', items);
    }

    // 標記遷移完成
    await dbPut('settings', { key: 'migration_completed', value: true });
    logger.info('Successfully migrated localStorage data to IndexedDB non-destructively.');
    return true;
  } catch (err) {
    logger.error('Failed to migrate data from localStorage:', err);
    return false;
  }
}

/**
 * 導出全量資料庫 JSON
 */
export async function exportFullDatabaseJSON(): Promise<string> {
  const trades = await dbGetAll<TradeRecord>('trades');
  const brokerAccounts = await dbGetAll<BrokerAccount>('brokerAccounts');
  const cashTransactions = await dbGetAll<CashTransaction>('cashTransactions');
  const loanRecords = await dbGetAll<LoanRecord>('loanRecords');
  const snapshots = await dbGetAll<SystemSnapshot>('snapshots');
  const settings = await dbGetAll<{ key: string; value: any }>('settings');

  const exportObj = {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      trades,
      brokerAccounts,
      cashTransactions,
      loanRecords,
      snapshots,
      settings,
    },
  };

  return JSON.stringify(exportObj, null, 2);
}

/**
 * 匯入全量資料庫 JSON
 */
export async function importFullDatabaseJSON(jsonStr: string): Promise<void> {
  const parsed = JSON.parse(jsonStr);
  if (!parsed || !parsed.data) {
    throw new Error('Invalid database backup format');
  }

  const { trades, brokerAccounts, cashTransactions, loanRecords, snapshots, settings, corporateActions } = parsed.data;

  if (trades) {
    await dbClear('trades');
    await dbBatchPut('trades', trades);
  }
  if (brokerAccounts) {
    await dbClear('brokerAccounts');
    await dbBatchPut('brokerAccounts', brokerAccounts);
  }
  if (cashTransactions) {
    await dbClear('cashTransactions');
    await dbBatchPut('cashTransactions', cashTransactions);
  }
  if (loanRecords) {
    await dbClear('loanRecords');
    await dbBatchPut('loanRecords', loanRecords);
  }
  if (snapshots) {
    await dbClear('snapshots');
    await dbBatchPut('snapshots', snapshots);
  }
  if (settings) {
    await dbClear('settings');
    await dbBatchPut('settings', settings);
  }
  if (corporateActions) {
    await dbClear('corporateActions');
    await dbBatchPut('corporateActions', corporateActions);
  }
}

/**
 * 讀取本機已儲存之所有公司行動
 */
export async function getCorporateActionsFromDB(): Promise<StoredCorporateAction[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    return await dbGetAll<StoredCorporateAction>('corporateActions');
  } catch (err) {
    logger.warn('Failed to load corporate actions from DB:', err);
    return [];
  }
}

/**
 * 依標的代碼檢索本機公司行動清單
 */
export async function getCorporateActionsBySymbolFromDB(symbol: string): Promise<StoredCorporateAction[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const symUpper = symbol.trim().toUpperCase();
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('corporateActions', 'readonly');
      const store = tx.objectStore('corporateActions');
      if (store.indexNames.contains('by_symbol')) {
        const index = store.index('by_symbol');
        const req = index.getAll(symUpper);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } else {
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as StoredCorporateAction[];
          resolve(list.filter((a) => a.symbol.toUpperCase() === symUpper));
        };
        req.onerror = () => reject(req.error);
      }
    });
  } catch (err) {
    logger.warn(`Failed to load corporate actions for ${symbol} from DB:`, err);
    return [];
  }
}

/**
 * 增量儲存公司行動清單 (以 id: symbol-type-date 進行冪等 Upsert)
 */
export async function saveCorporateActionsToDB(actions: StoredCorporateAction[]): Promise<void> {
  if (!actions || actions.length === 0 || typeof indexedDB === 'undefined') return;
  try {
    const now = Date.now();
    const normalized = actions.map((act) => ({
      ...act,
      id: act.id || `${act.symbol.toUpperCase()}-${act.type}-${act.date}`,
      symbol: act.symbol.toUpperCase(),
      updatedAt: act.updatedAt || now,
    }));
    await dbBatchPut<StoredCorporateAction>('corporateActions', normalized);
  } catch (err) {
    logger.warn('Failed to save corporate actions to DB:', err);
  }
}

/**
 * 取得本地資料庫與儲存空間檢測指標 (Local Storage Inspection Stats)
 */
export async function getLocalStorageInspectionStats(): Promise<LocalStorageInspectionStats> {
  let isIndexedDbHealthy = false;
  let trades: TradeRecord[] = [];
  let brokerAccounts: BrokerAccount[] = [];
  let cashTransactions: CashTransaction[] = [];
  let loanRecords: LoanRecord[] = [];
  let historicalPrices: any[] = [];
  let historicalFx: any[] = [];
  let priceMetadata: any[] = [];
  let corporateActions: StoredCorporateAction[] = [];
  let snapshots: SystemSnapshot[] = [];
  let settings: any[] = [];

  const safeGetAll = async <T>(storeName: StoreName): Promise<T[]> => {
    try {
      if (typeof indexedDB === 'undefined') return [];
      return await dbGetAll<T>(storeName);
    } catch (err) {
      logger.warn(`Inspection query fallback for store '${storeName}':`, err);
      return [];
    }
  };

  try {
    if (typeof indexedDB !== 'undefined') {
      [
        trades,
        brokerAccounts,
        cashTransactions,
        loanRecords,
        historicalPrices,
        historicalFx,
        priceMetadata,
        corporateActions,
        snapshots,
        settings,
      ] = await Promise.all([
        safeGetAll<TradeRecord>('trades'),
        safeGetAll<BrokerAccount>('brokerAccounts'),
        safeGetAll<CashTransaction>('cashTransactions'),
        safeGetAll<LoanRecord>('loanRecords'),
        safeGetAll<any>('historicalPrices'),
        safeGetAll<any>('historicalFx'),
        safeGetAll<any>('priceMetadata'),
        safeGetAll<StoredCorporateAction>('corporateActions'),
        safeGetAll<SystemSnapshot>('snapshots'),
        safeGetAll<any>('settings'),
      ]);
      isIndexedDbHealthy = true;
    }
  } catch (err) {
    logger.error('Failed to query IndexedDB inspection stats:', err);
  }

  // 雙軌自動回退 (LocalStorage Fallback Reconciliation)
  if (typeof localStorage !== 'undefined') {
    if (trades.length === 0) {
      try {
        const raw = localStorage.getItem('STOCK_TRACKER_TRADES_V1');
        if (raw) trades = JSON.parse(raw) || [];
      } catch {}
    }
    if (brokerAccounts.length === 0) {
      try {
        const raw = localStorage.getItem('STOCK_TRACKER_BROKER_ACCOUNTS_V1');
        if (raw) brokerAccounts = JSON.parse(raw) || [];
      } catch {}
    }
    if (cashTransactions.length === 0) {
      try {
        const raw = localStorage.getItem('STOCK_TRACKER_CASH_TRANSACTIONS_V1');
        if (raw) cashTransactions = JSON.parse(raw) || [];
      } catch {}
    }
    if (loanRecords.length === 0) {
      try {
        const raw = localStorage.getItem('STOCK_TRACKER_LOAN_RECORDS_V1');
        if (raw) loanRecords = JSON.parse(raw) || [];
      } catch {}
    }
    if (historicalPrices.length === 0) {
      try {
        const raw = localStorage.getItem('STOCK_TRACKER_HISTORICAL_PRICES_V1');
        if (raw) {
          const parsed = JSON.parse(raw);
          historicalPrices = Object.entries(parsed || {}).map(([symbol, prices]) => ({ symbol, prices }));
        }
      } catch {}
    }
    if (historicalFx.length === 0) {
      try {
        const raw = localStorage.getItem('STOCK_TRACKER_HISTORICAL_FX_V1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const firstVal = Object.values(parsed)[0];
            if (typeof firstVal === 'number') {
              // 格式為 Record<string, number> ('YYYY-MM-DD' -> rate)
              historicalFx = [{ pair: 'USD/TWD', fxRates: parsed }];
            } else {
              // 格式為 Record<string, Record<string, number>> ('USD/TWD' -> { ... })
              historicalFx = Object.entries(parsed).map(([pair, fxRates]) => ({ pair, fxRates }));
            }
          }
        }
      } catch {}
    }
    if (priceMetadata.length === 0) {
      try {
        const raw = localStorage.getItem('STOCK_TRACKER_PRICE_METADATA_V1');
        if (raw) {
          const parsed = JSON.parse(raw);
          priceMetadata = Object.entries(parsed?.quotes || {}).map(([symbol, meta]) => ({ symbol, meta }));
        }
      } catch {}
    }
    if (corporateActions.length === 0) {
      try {
        const raw = localStorage.getItem('STOCK_TRACKER_CA_CACHE_V1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            corporateActions = parsed;
          } else if (parsed && typeof parsed === 'object') {
            // LocalStorage 實體快取結構為 { [symbol]: { events: RawCorporateEvent[], timestamp: number } }
            const normalizedActions: StoredCorporateAction[] = [];
            for (const [sym, entry] of Object.entries(parsed)) {
              const rawEvents = (entry as any)?.events || [];
              if (Array.isArray(rawEvents)) {
                for (const ev of rawEvents) {
                  normalizedActions.push({
                    id: `${sym}-${ev.type || 'DIVIDEND'}-${ev.date}`,
                    symbol: sym,
                    market: (ev.market || (sym.length === 4 && /^\d+$/.test(sym) ? 'TW' : 'US')) as any,
                    currency: (ev.currency || (sym.length === 4 && /^\d+$/.test(sym) ? 'TWD' : 'USD')) as any,
                    type: ev.type || 'DIVIDEND',
                    date: ev.date,
                    cashAmount: ev.cashAmount,
                    sourceType: 'CACHE',
                  });
                }
              }
            }
            corporateActions = normalizedActions;
          }
        }
      } catch {}
    }
  }

  // 1. 核心資產統計
  const buyTrades = trades.filter((t) => t.type === 'BUY' || t.type === 'MARGIN_BUY').length;
  const sellTrades = trades.filter((t) => t.type === 'SELL' || t.type === 'MARGIN_SELL').length;
  const dividendTrades = trades.filter((t) => t.type === 'DIVIDEND' || t.type === 'STOCK_DIVIDEND').length;

  const validDates = trades
    .map((t) => t.date)
    .filter((d): d is string => typeof d === 'string' && d.length > 0)
    .sort();
  const earliestTradeDate = validDates.length > 0 ? validDates[0] : undefined;
  const latestTradeDate = validDates.length > 0 ? validDates[validDates.length - 1] : undefined;

  // 2. 行情與快取統計
  const historicalPricesDataPoints = historicalPrices.reduce((sum, item) => {
    if (item && item.prices && typeof item.prices === 'object') {
      return sum + Object.keys(item.prices).length;
    }
    return sum;
  }, 0);

  const historicalFxDataPoints = historicalFx.reduce((sum, item) => {
    if (item && item.fxRates && typeof item.fxRates === 'object') {
      return sum + Object.keys(item.fxRates).length;
    }
    if (typeof item?.fxRates === 'number') {
      return sum + 1;
    }
    return sum;
  }, 0);

  const historicalFxPairs = historicalFx.length > 0 ? (
    // 防禦性：若舊快取每個日期被存成一筆，則幣別對數依然為 1
    historicalFx.some(item => item.pair === 'USD/TWD' || (typeof item.pair === 'string' && item.pair.includes('/')))
      ? historicalFx.filter(item => typeof item.pair === 'string' && item.pair.includes('/')).length || 1
      : 1
  ) : 0;

  const corporateActionsSymbols = new Set(
    corporateActions.map((a) => (a.symbol || '').toUpperCase()).filter(Boolean)
  ).size;

  let stockDictionaryTotalCount = 0;
  let stockDictionaryOfficialCount = 0;
  let stockDictionaryCustomCount = 0;
  try {
    const dictStats = getStockDictionaryStats();
    stockDictionaryTotalCount = dictStats.totalCount;
    stockDictionaryCustomCount = dictStats.customCount;
    stockDictionaryOfficialCount = Math.max(0, dictStats.totalCount - dictStats.customCount);
  } catch {
    // ignore
  }

  // 3. 系統配置與快照
  const lockedSnapshots = snapshots.filter((s) => s.isLocked).length;

  let apiKeysConfig: ApiKeysConfig = {};
  let accountingView = 'DUAL';
  let brokerFeeDiscount = 0.28;

  try {
    if (typeof localStorage !== 'undefined') {
      const rawApi = localStorage.getItem('STOCK_TRACKER_API_KEYS_V1');
      if (rawApi) apiKeysConfig = JSON.parse(rawApi);
      const rawView = localStorage.getItem('STOCK_TRACKER_ACCOUNTING_VIEW_V1');
      if (rawView) accountingView = rawView;
      const rawDiscount = localStorage.getItem('STOCK_TRACKER_BROKER_FEE_DISCOUNT_V1');
      if (rawDiscount) brokerFeeDiscount = parseFloat(rawDiscount);
    }
  } catch {
    // ignore
  }

  // 4. 磁碟儲存配額估算 (navigator.storage.estimate)
  let storageUsageBytes = 0;
  let storageQuotaBytes = 0;
  let usagePercentage = 0;
  let isStorageEstimateSupported = false;

  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.estimate === 'function'
    ) {
      const estimate = await navigator.storage.estimate();
      storageUsageBytes = estimate?.usage || 0;
      storageQuotaBytes = estimate?.quota || 0;
      usagePercentage = storageQuotaBytes > 0 ? (storageUsageBytes / storageQuotaBytes) * 100 : 0;
      isStorageEstimateSupported = true;
    }
  } catch (err) {
    logger.warn('navigator.storage.estimate failed or not permitted:', err);
  }

  const stores: StorageObjectStoreStat[] = [
    {
      name: 'trades',
      count: trades.length,
      description: '買進/賣出/配息歷史交易紀錄',
      category: 'CORE_ASSETS',
      details: { 買進: buyTrades, 賣出: sellTrades, 配息: dividendTrades },
    },
    {
      name: 'brokerAccounts',
      count: brokerAccounts.length,
      description: '證券商交割帳戶與手續費率',
      category: 'CORE_ASSETS',
    },
    {
      name: 'cashTransactions',
      count: cashTransactions.length,
      description: '現金存提、利息與金流帳本',
      category: 'CORE_ASSETS',
    },
    {
      name: 'loanRecords',
      count: loanRecords.length,
      description: '質押貸款與信貸負債紀錄',
      category: 'CORE_ASSETS',
    },
    {
      name: 'historicalPrices',
      count: historicalPrices.length,
      description: '歷史收盤價快取 (依標的)',
      category: 'MARKET_CACHE',
      details: { 歷史資料點: historicalPricesDataPoints },
    },
    {
      name: 'historicalFx',
      count: historicalFxPairs,
      description: '歷史匯率快取 (USD/TWD)',
      category: 'MARKET_CACHE',
      details: { 匯率資料點: historicalFxDataPoints },
    },
    {
      name: 'priceMetadata',
      count: priceMetadata.length,
      description: '即時即期行情與報價快取',
      category: 'MARKET_CACHE',
    },
    {
      name: 'corporateActions',
      count: corporateActions.length,
      description: '除權息與減資官方行動庫',
      category: 'MARKET_CACHE',
      details: { 涵蓋標的數: corporateActionsSymbols },
    },
    {
      name: 'snapshots',
      count: snapshots.length,
      description: '資料庫時光機快照備份',
      category: 'SYSTEM_CONFIG',
      details: { 已鎖定快照: lockedSnapshots },
    },
    {
      name: 'settings',
      count: settings.length,
      description: '系統設定與自訂偏好',
      category: 'SYSTEM_CONFIG',
    },
  ];

  // 統計三大法人籌碼日報快取 (存於 settings 表中，key 以 TWSE_TPEX_CHIPS_ 開頭)
  const chipsSettings = settings.filter((s: any) => typeof s.key === 'string' && s.key.startsWith('TWSE_TPEX_CHIPS_'));
  const institutionalChipsDays = chipsSettings.length;
  let institutionalChipsTotalRecords = 0;
  for (const item of chipsSettings) {
    if (item.data && typeof item.data === 'object') {
      institutionalChipsTotalRecords += Object.keys(item.data).length;
    }
  }

  return {
    storageUsageBytes,
    storageQuotaBytes,
    usagePercentage,
    isStorageEstimateSupported,
    isIndexedDbHealthy,
    isLocalStorageHealthy: typeof localStorage !== 'undefined',
    indexedDbName: DB_NAME,
    indexedDbVersion: DB_VERSION,
    coreAssets: {
      totalTrades: trades.length,
      buyTrades,
      sellTrades,
      dividendTrades,
      earliestTradeDate,
      latestTradeDate,
      totalAccounts: brokerAccounts.length,
      totalCashTransactions: cashTransactions.length,
      totalLoanRecords: loanRecords.length,
    },
    marketCache: {
      historicalPricesSymbols: historicalPrices.length,
      historicalPricesDataPoints,
      historicalFxPairs,
      historicalFxDataPoints,
      priceMetadataSymbols: priceMetadata.length,
      corporateActionsTotal: corporateActions.length,
      corporateActionsSymbols,
      stockDictionaryTotalCount,
      stockDictionaryOfficialCount,
      stockDictionaryCustomCount,
      institutionalChipsDays,
      institutionalChipsTotalRecords,
    },
    systemConfig: {
      totalSnapshots: snapshots.length,
      lockedSnapshots,
      hasFinMindKey: !!apiKeysConfig.finmindToken,
      hasFmpKey: !!apiKeysConfig.fmpApiKey,
      hasTwseConfig: true,
      accountingView,
      brokerFeeDiscount,
    },
    stores,
  };
}

/**
 * 安全清除歷史股價快取 (不影響交易與交割紀錄)
 */
export async function clearHistoricalPricesCache(): Promise<void> {
  if (typeof indexedDB !== 'undefined') {
    await dbClear('historicalPrices');
  }
  if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
    localStorage.removeItem('STOCK_TRACKER_HISTORICAL_PRICES_V1');
  }
}

/**
 * 安全清除歷史匯率快取 (不影響交易與交割紀錄)
 */
export async function clearHistoricalFxCache(): Promise<void> {
  if (typeof indexedDB !== 'undefined') {
    await dbClear('historicalFx');
  }
  if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
    localStorage.removeItem('STOCK_TRACKER_HISTORICAL_FX_V1');
  }
}

/**
 * 安全清除即時行情快取 (不影響交易與交割紀錄)
 */
export async function clearPriceMetadataCache(): Promise<void> {
  if (typeof indexedDB !== 'undefined') {
    await dbClear('priceMetadata');
  }
  if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
    localStorage.removeItem('STOCK_TRACKER_PRICE_METADATA_V1');
    localStorage.removeItem('STOCK_TRACKER_CUSTOM_PRICES_V1');
  }
}

/**
 * 安全清除公司行動資料庫快取 (不影響交易與交割紀錄)
 */
export async function clearCorporateActionsCache(): Promise<void> {
  if (typeof indexedDB !== 'undefined') {
    await dbClear('corporateActions');
  }
}

/**
 * 安全清除三大法人籌碼日報快取 (不影響交易與交割紀錄)
 */
export async function clearInstitutionalChipsCache(): Promise<void> {
  if (typeof indexedDB !== 'undefined') {
    const allSettings = await dbGetAll<any>('settings');
    for (const s of allSettings) {
      if (typeof s.key === 'string' && s.key.startsWith('TWSE_TPEX_CHIPS_')) {
        await dbDelete('settings', s.key);
      }
    }
  }
}

/**
 * 儲存標的全量歷史日 K 數列
 */
export async function saveSymbolOhlcv(data: SymbolOhlcvStore): Promise<void> {
  return dbPut('historicalOhlcv', data);
}

/**
 * 讀取標的全量歷史日 K 數列
 */
export async function getSymbolOhlcv(symbol: string): Promise<SymbolOhlcvStore | null> {
  const res = await dbGet<SymbolOhlcvStore>('historicalOhlcv', symbol);
  return res || null;
}

/**
 * 儲存標的肌肉書僮技術指標數列
 */
export async function saveSymbolIndicators(data: SymbolIndicatorsStore): Promise<void> {
  return dbPut('technicalIndicators', data);
}

/**
 * 讀取標的肌肉書僮技術指標數列
 */
export async function getSymbolIndicators(symbol: string): Promise<SymbolIndicatorsStore | null> {
  const res = await dbGet<SymbolIndicatorsStore>('technicalIndicators', symbol);
  return res || null;
}

/**
 * 安全清除全量歷史日 K 與技術指標快取
 */
export async function clearOhlcvAndIndicatorsCache(): Promise<void> {
  if (typeof indexedDB !== 'undefined') {
    await dbClear('historicalOhlcv');
    await dbClear('technicalIndicators');
  }
}



