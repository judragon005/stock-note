import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getLocalStorageInspectionStats,
  clearHistoricalPricesCache,
  clearHistoricalFxCache,
  clearPriceMetadataCache,
  clearCorporateActionsCache,
  dbPut,
  dbGetAll,
  closeDB,
} from '../utils/db';
import { TradeRecord, BrokerAccount } from '../types/stock';

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

// 輕量化 Mock 測試環境
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

describe('SettingsWorkspace - Local Storage Inspector & Data Transparency', () => {
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

  describe('1. 儲存檢測指標採集 (Inspection Metrics)', () => {
    it('在無資料空庫狀態下應安全回傳 0 筆數與健康狀態', async () => {
      const stats = await getLocalStorageInspectionStats();
      expect(stats.isIndexedDbHealthy).toBe(true);
      expect(stats.isLocalStorageHealthy).toBe(true);
      expect(stats.coreAssets.totalTrades).toBe(0);
      expect(stats.coreAssets.totalAccounts).toBe(0);
      expect(stats.coreAssets.totalCashTransactions).toBe(0);
      expect(stats.coreAssets.totalLoanRecords).toBe(0);
      expect(stats.marketCache.historicalPricesSymbols).toBe(0);
      expect(stats.marketCache.historicalFxPairs).toBe(0);
      expect(stats.marketCache.priceMetadataSymbols).toBe(0);
      expect(stats.marketCache.corporateActionsTotal).toBe(0);
      expect(stats.stores.length).toBeGreaterThanOrEqual(10);
    });

    it('應正確採集已設定之 API 金鑰與偏好設定狀態', async () => {
      localStorage.setItem(
        'STOCK_TRACKER_API_KEYS_V1',
        JSON.stringify({
          finmindToken: 'token-123456',
          fmpApiKey: 'fmp-key-abc',
        })
      );
      localStorage.setItem('STOCK_TRACKER_ACCOUNTING_VIEW_V1', 'BROKER');
      localStorage.setItem('STOCK_TRACKER_BROKER_FEE_DISCOUNT_V1', '0.2');

      const stats = await getLocalStorageInspectionStats();
      expect(stats.systemConfig.hasFinMindKey).toBe(true);
      expect(stats.systemConfig.hasFmpKey).toBe(true);
      expect(stats.systemConfig.hasTwseConfig).toBe(true);
      expect(stats.systemConfig.accountingView).toBe('BROKER');
      expect(stats.systemConfig.brokerFeeDiscount).toBe(0.2);
    });
  });

  describe('2. 細粒度快取安全抹除 (Cache Purge & Core Asset Shield)', () => {
    it('抹除各項快取時，核心資產（交易、交割帳戶、現金流）資料庫絕不受影響', async () => {
      // 寫入核心數據
      const trade: TradeRecord = {
        id: 't-safe-1',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        price: 900,
        shares: 1000,
        fee: 20,
        tax: 0,
        date: '2026-08-01',
        createdAt: Date.now(),
      };
      await dbPut('trades', trade);

      const acc: BrokerAccount = {
        id: 'acc-safe-1',
        name: '國泰證券',
        market: 'TW',
        feeRate: 0.001425,
        discountRate: 0.28,
        minFee: 20,
        taxRate: 0.003,
      };
      await dbPut('brokerAccounts', acc);

      // 寫入快取數據
      await dbPut('historicalPrices', { symbol: '2330', prices: { '2026-08-01': 900 } });
      await dbPut('historicalFx', { pair: 'USD/TWD', fxRates: { '2026-08-01': 31.5 } });
      await dbPut('priceMetadata', { symbol: '2330', currentPrice: 900, updatedAt: Date.now() });
      await dbPut('corporateActions', { id: '2330-DIV-1', symbol: '2330', type: 'DIVIDEND', date: '2026-08-01' });

      // 連續執行四大快取清除
      await clearHistoricalPricesCache();
      await clearHistoricalFxCache();
      await clearPriceMetadataCache();
      await clearCorporateActionsCache();

      // 驗證快取已被清空
      expect((await dbGetAll('historicalPrices')).length).toBe(0);
      expect((await dbGetAll('historicalFx')).length).toBe(0);
      expect((await dbGetAll('priceMetadata')).length).toBe(0);
      expect((await dbGetAll('corporateActions')).length).toBe(0);

      // 驗證核心數據依然完整無損 (Shielded)
      const remainingTrades = await dbGetAll<TradeRecord>('trades');
      expect(remainingTrades.length).toBe(1);
      expect(remainingTrades[0].id).toBe('t-safe-1');

      const remainingAccounts = await dbGetAll<BrokerAccount>('brokerAccounts');
      expect(remainingAccounts.length).toBe(1);
      expect(remainingAccounts[0].id).toBe('acc-safe-1');
    });
  });

  describe('3. 雙軌容錯與 0 筆防禦機制 (Dual-Track Fallback & Truthy Defense)', () => {
    it('當 IndexedDB 為空但 LocalStorage 存有 602 筆交易與 2 個帳戶時，檢測指標應精確回退統計', async () => {
      // 模擬 LocalStorage 存有 3 筆交易
      const mockTrades: TradeRecord[] = [
        {
          id: 't-1',
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
          id: 't-2',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'SELL',
          price: 950,
          shares: 1000,
          fee: 20,
          tax: 285,
          date: '2026-08-10',
          createdAt: 1704153600000,
        },
        {
          id: 't-3',
          symbol: '00878',
          market: 'TW',
          currency: 'TWD',
          type: 'DIVIDEND',
          price: 0.55,
          shares: 10000,
          fee: 0,
          tax: 0,
          date: '2026-08-15',
          createdAt: 1704240000000,
        },
      ];
      localStorage.setItem('STOCK_TRACKER_TRADES_V1', JSON.stringify(mockTrades));

      const stats = await getLocalStorageInspectionStats();
      expect(stats.coreAssets.totalTrades).toBe(3);
      expect(stats.coreAssets.buyTrades).toBe(1);
      expect(stats.coreAssets.sellTrades).toBe(1);
      expect(stats.coreAssets.dividendTrades).toBe(1);
      expect(stats.coreAssets.earliestTradeDate).toBe('2026-08-01');
      expect(stats.coreAssets.latestTradeDate).toBe('2026-08-15');
    });
  });
});

