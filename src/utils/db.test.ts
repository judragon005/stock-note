import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  closeDB,
  dbGet,
  dbGetAll,
  dbPut,
  dbBatchPut,
  dbDelete,
  dbClear,
  createSystemSnapshot,
  getSystemSnapshots,
  restoreSystemSnapshot,
  deleteSystemSnapshot,
  toggleLockSystemSnapshot,
  migrateFromLocalStorageIfNeeded,
  exportFullDatabaseJSON,
  importFullDatabaseJSON,
  getCorporateActionsFromDB,
  getCorporateActionsBySymbolFromDB,
  saveCorporateActionsToDB,
  getLocalStorageInspectionStats,
  clearHistoricalPricesCache,
  clearHistoricalFxCache,
  clearPriceMetadataCache,
  clearCorporateActionsCache,
} from './db';
import { TradeRecord, StoredCorporateAction, BrokerAccount, CashTransaction, LoanRecord } from '../types/stock';


// 建立輕量化 Memory-based IDB Mock
class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;
}

class MockIDBOpenDBRequest extends MockIDBRequest {
  onupgradeneeded: ((ev: any) => void) | null = null;
  onblocked: ((ev: any) => void) | null = null;
}

class MockIDBObjectStore {
  constructor(public name: string, public memoryStore: Map<any, any>, public keyPath: string = 'id') {}

  get(key: any) {
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.result = this.memoryStore.get(key);
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req as any;
  }

  getAll() {
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.result = Array.from(this.memoryStore.values());
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req as any;
  }

  count() {
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.result = this.memoryStore.size;
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req as any;
  }

  put(value: any) {
    const req = new MockIDBRequest();
    const key = this.keyPath ? value[this.keyPath] : value.id;
    this.memoryStore.set(key, value);
    setTimeout(() => {
      req.result = key;
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req as any;
  }

  delete(key: any) {
    const req = new MockIDBRequest();
    this.memoryStore.delete(key);
    setTimeout(() => {
      req.result = undefined;
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req as any;
  }

  clear() {
    const req = new MockIDBRequest();
    this.memoryStore.clear();
    setTimeout(() => {
      req.result = undefined;
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req as any;
  }

  indexNames = {
    contains: (_name: string) => true,
  };

  createIndex() {
    return {} as any;
  }

  index(name: string) {
    return {
      getAll: (query: any) => {
        const req = new MockIDBRequest();
        setTimeout(() => {
          const all = Array.from(this.memoryStore.values());
          if (name === 'by_symbol' && query) {
            req.result = all.filter((item: any) => item.symbol?.toUpperCase() === query?.toUpperCase());
          } else {
            req.result = all;
          }
          if (req.onsuccess) req.onsuccess({ target: req });
        }, 0);
        return req as any;
      },
    };
  }
}


class MockIDBTransaction {
  oncomplete: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;
  onabort: ((ev: any) => void) | null = null;

  constructor(public db: MockIDBDatabase, public storeNames: string[], public mode: string) {
    setTimeout(() => {
      if (this.oncomplete) this.oncomplete({ target: this });
    }, 5);
  }

  objectStore(name: string) {
    return this.db.getMockStore(name);
  }

  abort() {
    if (this.onabort) this.onabort({ target: this });
  }
}

class MockIDBDatabase {
  public stores = new Map<string, Map<any, any>>();
  public keyPathMap = new Map<string, string>();
  public objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };

  createObjectStore(name: string, options?: { keyPath?: string }) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new Map());
    }
    const keyPath = options?.keyPath || 'id';
    this.keyPathMap.set(name, keyPath);
    return new MockIDBObjectStore(name, this.stores.get(name)!, keyPath);
  }

  getMockStore(name: string) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new Map());
    }
    const keyPath = this.keyPathMap.get(name) || 'id';
    return new MockIDBObjectStore(name, this.stores.get(name)!, keyPath);
  }

  transaction(storeNames: string | string[], mode: string = 'readonly') {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MockIDBTransaction(this, names, mode) as any;
  }

  close() {}
}

const mockGlobalIDB = {
  databases: new Map<string, MockIDBDatabase>(),
  open(name: string, version: number) {
    const req = new MockIDBOpenDBRequest();
    setTimeout(() => {
      let db = this.databases.get(name);
      const isNew = !db;
      if (!db) {
        db = new MockIDBDatabase();
        this.databases.set(name, db);
      }
      req.result = db;
      if (isNew && req.onupgradeneeded) {
        req.onupgradeneeded({ target: req, oldVersion: 0, newVersion: version });
      }
      if (req.onsuccess) {
        req.onsuccess({ target: req });
      }
    }, 0);
    return req as any;
  },
  deleteDatabase(name: string) {
    const req = new MockIDBRequest();
    this.databases.delete(name);
    setTimeout(() => {
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req as any;
  },
};

const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

describe('IndexedDB Core Engine & Snapshots (db.ts)', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', mockGlobalIDB);
    vi.stubGlobal('localStorage', createMockLocalStorage());
    mockGlobalIDB.databases.clear();
    closeDB();
  });

  afterEach(() => {
    closeDB();
    vi.restoreAllMocks();
  });

  describe('1. CRUD 基本運作 (Basic CRUD Operations)', () => {
    it('應能正常建立 Object Stores 並寫入/讀取單筆資料', async () => {
      const sampleTrade: TradeRecord = {
        id: 'trade-1',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        price: 950,
        shares: 1000,
        fee: 1353,
        tax: 0,
        date: '2026-08-01',
        createdAt: 1722470400000,
      };

      await dbPut('trades', sampleTrade);
      const loaded = await dbGet<TradeRecord>('trades', 'trade-1');
      expect(loaded).toEqual(sampleTrade);
    });

    it('應能批量寫入與讀取全量清單 (batchPut & getAll)', async () => {
      const trades: TradeRecord[] = [
        { id: 't1', symbol: '0050', market: 'TW', currency: 'TWD', type: 'BUY', price: 180, shares: 1000, fee: 256, tax: 0, date: '2026-08-01', createdAt: 1 },
        { id: 't2', symbol: 'VT', market: 'US', currency: 'USD', type: 'BUY', price: 120, shares: 50, fee: 0, tax: 0, date: '2026-08-02', createdAt: 2 },
      ];

      await dbBatchPut('trades', trades);
      const allTrades = await dbGetAll<TradeRecord>('trades');
      expect(allTrades.length).toBe(2);
      expect(allTrades.map((t) => t.symbol)).toContain('0050');
      expect(allTrades.map((t) => t.symbol)).toContain('VT');
    });

    it('應能刪除單筆資料與清空特定 Store (delete & clear)', async () => {
      await dbPut('trades', { id: 't-del', symbol: '2330', market: 'TW', currency: 'TWD', type: 'BUY', price: 900, shares: 100, fee: 0, tax: 0, date: '2026-08-01', createdAt: 1 });
      expect(await dbGet('trades', 't-del')).toBeDefined();

      await dbDelete('trades', 't-del');
      expect(await dbGet('trades', 't-del')).toBeUndefined();

      await dbPut('trades', { id: 't-keep1', symbol: '2330', market: 'TW', currency: 'TWD', type: 'BUY', price: 900, shares: 100, fee: 0, tax: 0, date: '2026-08-01', createdAt: 2 });
      await dbClear('trades');
      const remaining = await dbGetAll('trades');
      expect(remaining.length).toBe(0);
    });
  });

  describe('2. 時光機快照體系 (Time-Machine Snapshots)', () => {
    it('應能建立快照並計算正確的彙總統計指標', async () => {
      const snapshot = await createSystemSnapshot('測試備份', 'MANUAL', {
        trades: [{ id: 't1', symbol: '2330', market: 'TW', currency: 'TWD', type: 'BUY', price: 1000, shares: 1000, fee: 0, tax: 0, date: '2026-08-01', createdAt: 1 }],
        brokerAccounts: [{ id: 'acc-1', name: '國泰', market: 'TW', feeRate: 0.001425, discountRate: 0.28, minFee: 1, taxRate: 0.003, color: '#000' }],
        cashTransactions: [{ id: 'c1', accountId: 'acc-1', date: '2026-08-01', type: 'DEPOSIT', amount: 1000000, currency: 'TWD', note: '入金', createdAt: 1722470400000 }],
        loanRecords: [],
        historicalPrices: {},
        historicalFx: {},
        priceMetadata: { quotes: {}, lockedSymbols: [] },
        apiKeys: { finmindToken: '', fmpApiKey: '' },
        accountingView: 'BROKER',
      });

      expect(snapshot.id).toBeDefined();
      expect(snapshot.name).toBe('測試備份');
      expect(snapshot.metricsSummary.totalTrades).toBe(1);
      expect(snapshot.metricsSummary.totalAccounts).toBe(1);
      expect(snapshot.metricsSummary.totalCashTransactions).toBe(1);

      const snapshots = await getSystemSnapshots();
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].id).toBe(snapshot.id);
    });

    it('應支援鎖定快照，且自動快照超過 10 份時自動輪替淘汰最舊之未鎖定快照', async () => {
      // 建立 1 份鎖定的手動快照
      const lockedSnap = await createSystemSnapshot('鎖定重要備份', 'MANUAL', {
        trades: [],
        brokerAccounts: [],
        cashTransactions: [],
        loanRecords: [],
        historicalPrices: {},
        historicalFx: {},
        priceMetadata: { quotes: {}, lockedSymbols: [] },
        apiKeys: {},
        accountingView: 'BROKER',
      }, true);

      // 建立 11 份自動快照
      for (let i = 1; i <= 11; i++) {
        await createSystemSnapshot(`自動備份 ${i}`, 'AUTO_BEFORE_IMPORT', {
          trades: [],
          brokerAccounts: [],
          cashTransactions: [],
          loanRecords: [],
          historicalPrices: {},
          historicalFx: {},
          priceMetadata: { quotes: {}, lockedSymbols: [] },
          apiKeys: {},
          accountingView: 'BROKER',
        });
      }

      const snapshots = await getSystemSnapshots();
      // 鎖定的不會被刪除，且自動快照受限於 10 份以內
      expect(snapshots.some((s) => s.id === lockedSnap.id)).toBe(true);
      expect(snapshots.length).toBeLessThanOrEqual(11);
    });

    it('應支援自快照一鍵還原資料庫 (restoreSystemSnapshot)', async () => {
      const oldTrade: TradeRecord = { id: 'old-1', symbol: '2330', market: 'TW', currency: 'TWD', type: 'BUY', price: 500, shares: 1000, fee: 0, tax: 0, date: '2020-01-01', createdAt: 1 };
      const snap = await createSystemSnapshot('歷史快照', 'MANUAL', {
        trades: [oldTrade],
        brokerAccounts: [],
        cashTransactions: [],
        loanRecords: [],
        historicalPrices: {},
        historicalFx: {},
        priceMetadata: { quotes: {}, lockedSymbols: [] },
        apiKeys: {},
        accountingView: 'BROKER',
      });

      // 模擬覆寫資料
      await dbPut('trades', { id: 'new-1', symbol: 'VT', market: 'US', currency: 'USD', type: 'BUY', price: 100, shares: 10, fee: 0, tax: 0, date: '2026-08-01', createdAt: 2 });
      await dbDelete('trades', 'old-1');

      // 執行還原
      await restoreSystemSnapshot(snap.id);

      const restoredTrades = await dbGetAll<TradeRecord>('trades');
      expect(restoredTrades.length).toBe(1);
      expect(restoredTrades[0].symbol).toBe('2330');
    });

    it('應能切換快照鎖定狀態與刪除快照', async () => {
      const snap = await createSystemSnapshot('刪除測試', 'MANUAL', {
        trades: [],
        brokerAccounts: [],
        cashTransactions: [],
        loanRecords: [],
        historicalPrices: {},
        historicalFx: {},
        priceMetadata: { quotes: {}, lockedSymbols: [] },
        apiKeys: {},
        accountingView: 'BROKER',
      });

      // 鎖定
      const isLocked = await toggleLockSystemSnapshot(snap.id);
      expect(isLocked).toBe(true);

      // 嘗試刪除鎖定快照應被阻止
      await expect(deleteSystemSnapshot(snap.id)).rejects.toThrow();

      // 解鎖
      await toggleLockSystemSnapshot(snap.id);
      await deleteSystemSnapshot(snap.id);

      const all = await getSystemSnapshots();
      expect(all.find((s) => s.id === snap.id)).toBeUndefined();
    });
  });

  describe('3. 無損遷移與冷備份 (Non-Destructive Migration)', () => {
    it('若 localStorage 有資料，應自動無損遷移入 IndexedDB 並保留 localStorage', async () => {
      const localTrades = JSON.stringify([
        { id: 'lt-1', symbol: '00878', market: 'TW', currency: 'TWD', type: 'BUY', price: 22, shares: 10000, fee: 300, tax: 0, date: '2026-01-01', createdAt: 1 },
      ]);
      const mockStorage = {
        getItem: (key: string) => {
          if (key === 'STOCK_TRACKER_TRADES_V1') return localTrades;
          return null;
        },
        setItem: vi.fn(),
      };
      vi.stubGlobal('localStorage', mockStorage);

      const migrated = await migrateFromLocalStorageIfNeeded();
      expect(migrated).toBe(true);

      const dbTrades = await dbGetAll<TradeRecord>('trades');
      expect(dbTrades.length).toBe(1);
      expect(dbTrades[0].symbol).toBe('00878');

      // 重複呼叫應不再重複遷移
      const secondCall = await migrateFromLocalStorageIfNeeded();
      expect(secondCall).toBe(false);
    });
  });

  describe('4. 全庫 JSON 匯出與匯入 (Full Database Export & Import)', () => {
    it('應能導出完整的資料庫 JSON 並無損匯入', async () => {
      await dbPut('trades', { id: 'exp-1', symbol: '2454', market: 'TW', type: 'BUY', price: 1200, shares: 1000, fee: 0, tax: 0, date: '2026-08-01' });
      const exportedJson = await exportFullDatabaseJSON();
      expect(exportedJson).toContain('2454');

      await dbClear('trades');
      expect((await dbGetAll('trades')).length).toBe(0);

      await importFullDatabaseJSON(exportedJson);
      const imported = await dbGetAll<TradeRecord>('trades');
      expect(imported.length).toBe(1);
      expect(imported[0].symbol).toBe('2454');
    });
  });

  describe('5. 公司行動持久化與增量更新 (Corporate Actions DB Persistence & Incremental Upsert)', () => {
    it('應能將公司行動寫入 IndexedDB 並能全量或依代碼檢索', async () => {
      const actions: StoredCorporateAction[] = [
        {
          id: '9927-CAPITAL_REDUCTION-2025-09-15',
          symbol: '9927',
          name: '泰銘',
          market: 'TW',
          currency: 'TWD',
          type: 'CAPITAL_REDUCTION',
          date: '2025-09-15',
          ratio: 0.2828,
          price: 2.828,
          description: '現金減資（減資比率 28.28%）',
          sourceType: 'OFFICIAL_DATA',
        },
        {
          id: '2330-DIVIDEND-2026-09-16',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'DIVIDEND',
          date: '2026-09-16',
          payDate: '2026-10-08',
          price: 4.0,
          description: '季度現金股利 4.0 元',
          sourceType: 'OFFICIAL_DATA',
        },
      ];

      await saveCorporateActionsToDB(actions);

      const all = await getCorporateActionsFromDB();
      expect(all.length).toBe(2);

      const tmActions = await getCorporateActionsBySymbolFromDB('9927');
      expect(tmActions.length).toBe(1);
      expect(tmActions[0].symbol).toBe('9927');
      expect(tmActions[0].type).toBe('CAPITAL_REDUCTION');
      expect(tmActions[0].ratio).toBe(0.2828);

      const tsmcActions = await getCorporateActionsBySymbolFromDB('2330');
      expect(tsmcActions.length).toBe(1);
      expect(tsmcActions[0].symbol).toBe('2330');
      expect(tsmcActions[0].payDate).toBe('2026-10-08');
    });

    it('同主鍵 (symbol-type-date) 重複寫入時應進行冪等覆蓋更新 (Upsert)', async () => {
      const initial: StoredCorporateAction[] = [
        {
          id: '9927-DIVIDEND-2026-10-01',
          symbol: '9927',
          market: 'TW',
          currency: 'TWD',
          type: 'DIVIDEND',
          date: '2026-10-01',
          price: 5.0,
          sourceType: 'LIVE_API',
        },
      ];
      await saveCorporateActionsToDB(initial);

      // 更新發放日與官方標記
      const updated: StoredCorporateAction[] = [
        {
          id: '9927-DIVIDEND-2026-10-01',
          symbol: '9927',
          market: 'TW',
          currency: 'TWD',
          type: 'DIVIDEND',
          date: '2026-10-01',
          payDate: '2026-10-29',
          price: 5.0,
          sourceType: 'OFFICIAL_DATA',
          verifiedSources: ['TWSE_OPENAPI'],
        },
      ];
      await saveCorporateActionsToDB(updated);

      const tmActions = await getCorporateActionsBySymbolFromDB('9927');
      expect(tmActions.length).toBe(1);
      expect(tmActions[0].payDate).toBe('2026-10-29');
      expect(tmActions[0].sourceType).toBe('OFFICIAL_DATA');
    });
  });

  describe('本地數據與儲存空間總覽 (Local Storage Inspector)', () => {
    it('應正確彙總核心資產、快取與系統配置之統計指標與時間跨度', async () => {
      // 設置交易資料
      const trades: TradeRecord[] = [
        {
          id: 'trade-1',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 1000,
          price: 900,
          fee: 20,
          tax: 0,
          date: '2024-01-15',
          createdAt: 1705276800000,
        },
        {
          id: 'trade-2',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'SELL',
          shares: 500,
          price: 1000,
          fee: 20,
          tax: 15,
          date: '2024-06-20',
          createdAt: 1718841600000,
        },
        {
          id: 'trade-3',
          symbol: 'AAPL',
          market: 'US',
          currency: 'USD',
          type: 'DIVIDEND',
          shares: 100,
          price: 0.25,
          fee: 0,
          tax: 0,
          date: '2024-08-10',
          createdAt: 1723248000000,
        },
      ];
      await dbBatchPut('trades', trades);

      // 設置帳戶、現金與借貸
      const account: BrokerAccount = {
        id: 'broker-1',
        name: '國泰證券',
        market: 'TW',
        feeRate: 0.001425,
        discountRate: 0.28,
        minFee: 20,
        taxRate: 0.003,
      };
      await dbPut('brokerAccounts', account);

      const cash: CashTransaction = {
        id: 'cash-1',
        accountId: 'broker-1',
        type: 'DEPOSIT',
        amount: 500000,
        currency: 'TWD',
        date: '2024-01-01',
        createdAt: 1704067200000,
      };
      await dbPut('cashTransactions', cash);

      const loan: LoanRecord = {
        id: 'loan-1',
        name: '質押借款',
        principal: 100000,
        annualInterestRate: 0.025,
        startDate: '2024-02-01',
        currency: 'TWD',
        createdAt: 1706745600000,
      };
      await dbPut('loanRecords', loan);

      // 設置歷史收盤價快取
      await dbPut('historicalPrices', {
        symbol: '2330',
        prices: { '2024-01-15': 900, '2024-01-16': 910 },
      });
      await dbPut('historicalPrices', {
        symbol: 'AAPL',
        prices: { '2024-01-15': 180, '2024-01-16': 182, '2024-01-17': 185 },
      });

      // 設置歷史匯率快取
      await dbPut('historicalFx', {
        pair: 'USD/TWD',
        fxRates: { '2024-01-15': 31.2, '2024-01-16': 31.3 },
      });

      // 設置即時行情中繼資料
      await dbPut('priceMetadata', {
        symbol: '2330',
        currentPrice: 950,
        updatedAt: Date.now(),
        source: 'LIVE_API',
      });

      // 設置公司行動
      await dbPut('corporateActions', {
        id: '2330-DIVIDEND-2024-03-18',
        symbol: '2330',
        type: 'DIVIDEND',
        date: '2024-03-18',
        price: 3.5,
        sourceType: 'OFFICIAL_DATA',
      });

      // 模擬 navigator.storage.estimate
      const originalNavigator = globalThis.navigator;
      vi.stubGlobal('navigator', {
        ...originalNavigator,
        storage: {
          estimate: vi.fn().mockResolvedValue({
            usage: 12582912, // ~12 MB
            quota: 10737418240, // 10 GB
          }),
        },
      });

      const stats = await getLocalStorageInspectionStats();

      expect(stats.isIndexedDbHealthy).toBe(true);
      expect(stats.coreAssets.totalTrades).toBe(3);
      expect(stats.coreAssets.buyTrades).toBe(1);
      expect(stats.coreAssets.sellTrades).toBe(1);
      expect(stats.coreAssets.dividendTrades).toBe(1);
      expect(stats.coreAssets.earliestTradeDate).toBe('2024-01-15');
      expect(stats.coreAssets.latestTradeDate).toBe('2024-08-10');
      expect(stats.coreAssets.totalAccounts).toBe(1);
      expect(stats.coreAssets.totalCashTransactions).toBe(1);
      expect(stats.coreAssets.totalLoanRecords).toBe(1);

      expect(stats.marketCache.historicalPricesSymbols).toBe(2);
      expect(stats.marketCache.historicalPricesDataPoints).toBe(5);
      expect(stats.marketCache.historicalFxPairs).toBe(1);
      expect(stats.marketCache.historicalFxDataPoints).toBe(2);
      expect(stats.marketCache.priceMetadataSymbols).toBe(1);
      expect(stats.marketCache.corporateActionsTotal).toBe(1);
      expect(stats.marketCache.corporateActionsSymbols).toBe(1);

      expect(stats.storageUsageBytes).toBe(12582912);
      expect(stats.storageQuotaBytes).toBe(10737418240);
      expect(stats.usagePercentage).toBeCloseTo(0.117, 2);
    });

    it('單獨清除歷史股價快取時，不應影響交易與交割記錄', async () => {
      await dbPut('trades', {
        id: 't-keep',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 900,
        fee: 20,
        tax: 0,
        date: '2024-01-01',
        createdAt: 1704067200000,
      });
      await dbPut('historicalPrices', {
        symbol: '2330',
        prices: { '2024-01-01': 900 },
      });

      await clearHistoricalPricesCache();

      const histPrices = await dbGetAll('historicalPrices');
      expect(histPrices.length).toBe(0);

      const trades = await dbGetAll<TradeRecord>('trades');
      expect(trades.length).toBe(1);
      expect(trades[0].id).toBe('t-keep');
    });

    it('單獨清除匯率快取、即時報價快取與公司行動快取應獨立生效', async () => {
      await dbPut('historicalFx', { pair: 'USD/TWD', fxRates: { '2024-01-01': 31.0 } });
      await dbPut('priceMetadata', { symbol: '2330', currentPrice: 900, updatedAt: Date.now() });
      await dbPut('corporateActions', { id: '2330-DIV-1', symbol: '2330', type: 'DIVIDEND', date: '2024-01-01' });

      await clearHistoricalFxCache();
      expect((await dbGetAll('historicalFx')).length).toBe(0);
      expect((await dbGetAll('priceMetadata')).length).toBe(1);

      await clearPriceMetadataCache();
      expect((await dbGetAll('priceMetadata')).length).toBe(0);

      await clearCorporateActionsCache();
      expect((await dbGetAll('corporateActions')).length).toBe(0);
    });

    it('當 IndexedDB 為空但 LocalStorage 有資料時，getLocalStorageInspectionStats 應自動雙軌回退讀取正確筆數', async () => {
      // 模擬 LocalStorage 存有 2 筆交易與 1 個帳戶
      localStorage.setItem(
        'STOCK_TRACKER_TRADES_V1',
        JSON.stringify([
          {
            id: 't-ls-1',
            symbol: '2330',
            market: 'TW',
            currency: 'TWD',
            type: 'BUY',
            price: 900,
            shares: 1000,
            fee: 20,
            tax: 0,
            date: '2026-08-01',
            createdAt: 1704067200000,
          },
          {
            id: 't-ls-2',
            symbol: 'AAPL',
            market: 'US',
            currency: 'USD',
            type: 'SELL',
            price: 200,
            shares: 10,
            fee: 1,
            tax: 0,
            date: '2026-08-02',
            createdAt: 1704153600000,
          },
        ])
      );
      localStorage.setItem(
        'STOCK_TRACKER_BROKER_ACCOUNTS_V1',
        JSON.stringify([
          {
            id: 'acc-1',
            name: '國泰證券',
            market: 'TW',
            feeRate: 0.001425,
            discountRate: 0.28,
            minFee: 1,
            taxRate: 0.003,
            color: '#10b981',
          },
        ])
      );

      const stats = await getLocalStorageInspectionStats();

      expect(stats.coreAssets.totalTrades).toBe(2);
      expect(stats.coreAssets.buyTrades).toBe(1);
      expect(stats.coreAssets.sellTrades).toBe(1);
      expect(stats.coreAssets.totalAccounts).toBe(1);
    });

    it('當 LocalStorage 存有真實公司行動與歷史外匯快取時，應正確解析標的數與資料點數', async () => {
      // 模擬真實 LocalStorage 中的公司行動快取結構 (以 symbol 為鍵，值為 { events, timestamp })
      localStorage.setItem(
        'STOCK_TRACKER_CA_CACHE_V1',
        JSON.stringify({
          '2330': {
            events: [
              { symbol: '2330', type: 'DIVIDEND', date: '2024-03-18', cashAmount: 3.5 },
              { symbol: '2330', type: 'DIVIDEND', date: '2024-06-13', cashAmount: 4.0 },
            ],
            timestamp: Date.now(),
          },
          '0050': {
            events: [
              { symbol: '0050', type: 'DIVIDEND', date: '2024-01-17', cashAmount: 3.0 },
            ],
            timestamp: Date.now(),
          },
        })
      );

      // 模擬真實 LocalStorage 中的歷史外匯快取結構 (以日期為鍵，值為匯率數字)
      localStorage.setItem(
        'STOCK_TRACKER_HISTORICAL_FX_V1',
        JSON.stringify({
          '2024-01-01': 31.0,
          '2024-01-02': 31.2,
          '2024-01-03': 31.5,
        })
      );

      const stats = await getLocalStorageInspectionStats();

      // 公司行動：應為 2 檔標的，共 3 筆事件
      expect(stats.marketCache.corporateActionsSymbols).toBe(2);
      expect(stats.marketCache.corporateActionsTotal).toBe(3);

      // 歷史外匯：應為 1 對幣別 (USD/TWD)，共 3 點歷史資料
      expect(stats.marketCache.historicalFxPairs).toBe(1);
      expect(stats.marketCache.historicalFxDataPoints).toBe(3);

      // 股票字典：應具備總收錄數
      expect(stats.marketCache.stockDictionaryTotalCount).toBeGreaterThanOrEqual(600);
    });
  });
});


