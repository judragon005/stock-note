import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TradeRecord } from '../types/stock';
import {
  parseCSVToTrades,
  mergeTrades,
  validateTradesSchema,
  loadCustomPricesFromStorage,
  saveCustomPricesToStorage,
  getDefaultSampleTrades,
} from './storage';

// 模擬 LocalStorage 環境
const createLocalStorageMock = () => {
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
  };
};

describe('Storage & Persistence Utilities (Issue #6)', () => {
  let storageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    storageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', storageMock);
    vi.clearAllMocks();
  });

  describe('Seam 1: parseCSVToTrades (CSV 解析與容錯)', () => {
    it('應能正確解析標準繁體中文 UTF-8 BOM 之 CSV 內容', () => {
      const csvContent = '\uFEFF日期,市場,代碼,名稱,類別,股數,單價,幣別,手續費,稅費,標籤,備註\n' +
        '2026-01-05,TW,2330,"台積電",BUY,1000,620,TWD,883,0,"核心持股;晶圓代工","長線定期定額建倉"\n' +
        '2026-01-15,US,NVDA,"NVIDIA Corp.",BUY,25,110,USD,0,0,"AI動能;美股核心","AI伺服器需求強勁"';

      const result = parseCSVToTrades(csvContent);

      expect(result.successCount).toBe(2);
      expect(result.skippedCount).toBe(0);
      expect(result.trades).toHaveLength(2);

      const twTrade = result.trades[0];
      expect(twTrade.date).toBe('2026-01-05');
      expect(twTrade.market).toBe('TW');
      expect(twTrade.symbol).toBe('2330');
      expect(twTrade.name).toBe('台積電');
      expect(twTrade.type).toBe('BUY');
      expect(twTrade.shares).toBe(1000);
      expect(twTrade.price).toBe(620);
      expect(twTrade.currency).toBe('TWD');
      expect(twTrade.fee).toBe(883);
      expect(twTrade.tax).toBe(0);
      expect(twTrade.tags).toEqual(['核心持股', '晶圓代工']);
      expect(twTrade.note).toBe('長線定期定額建倉');
      expect(twTrade.id).toBeDefined();
      expect(twTrade.createdAt).toBeDefined();
    });

    it('應能處理英文表頭與小寫市場/類別', () => {
      const csvContent = 'Date,Market,Symbol,Name,Type,Shares,Price,Currency,Fee,Tax,Tags,Note\n' +
        '2026-02-01,us,AAPL,"Apple, Inc.",buy,15,220,USD,0,0,"科技;護城河","生態系優勢"';

      const result = parseCSVToTrades(csvContent);

      expect(result.successCount).toBe(1);
      expect(result.skippedCount).toBe(0);
      expect(result.trades[0].symbol).toBe('AAPL');
      expect(result.trades[0].market).toBe('US');
      expect(result.trades[0].type).toBe('BUY');
      expect(result.trades[0].name).toBe('Apple, Inc.');
      expect(result.trades[0].shares).toBe(15);
      expect(result.trades[0].price).toBe(220);
    });

    it('應能處理含雙引號脫逸之欄位內容與分號標籤', () => {
      const csvContent = '日期,市場,代碼,名稱,類別,股數,單價,幣別,手續費,稅費,標籤,備註\n' +
        '2026-03-01,TW,2454,聯發科,DIVIDEND,1000,25,TWD,0,0,"高股息;半導體","包含 ""特殊引號"" 註記"';

      const result = parseCSVToTrades(csvContent);

      expect(result.successCount).toBe(1);
      expect(result.trades[0].type).toBe('DIVIDEND');
      expect(result.trades[0].note).toBe('包含 "特殊引號" 註記');
      expect(result.trades[0].tags).toEqual(['高股息', '半導體']);
    });

    it('遇到格式不符之行數應略過並精確回報 skippedCount', () => {
      const csvContent = '日期,市場,代碼,名稱,類別,股數,單價,幣別,手續費,稅費,標籤,備註\n' +
        '2026-01-05,TW,2330,台積電,BUY,1000,620,TWD,883,0,,\n' +
        ',,INVALID_ROW,,,,,,,,,\n' +
        '2026-01-10,TW,0050,元大台灣50,BUY,abc,165,TWD,0,0,,\n' + // 非法股數
        '2026-01-15,US,NVDA,NVIDIA,BUY,10,120,USD,0,0,,\n' +
        ''; // 空行

      const result = parseCSVToTrades(csvContent);

      expect(result.successCount).toBe(2);
      expect(result.skippedCount).toBe(2); // 略過 2 筆無效行
      expect(result.trades.map(t => t.symbol)).toEqual(['2330', 'NVDA']);
    });

    it('應能正確解析除權配股、股票分割、現金減資與現金增資等公司行動 CSV', () => {
      const csvContent = '日期,市場,代碼,名稱,類別,股數,單價,幣別,手續費,稅費,比例,退款金額,基準日,標籤,備註\n' +
        '2025-08-20,TW,2884,玉山金,除權配股,50,0,TWD,0,0,0.05,0,2025-08-20,"金融;存股","配股 50 股"\n' +
        '2024-06-10,US,NVDA,NVIDIA,股票分割,0,0,USD,0,0,10,0,2024-06-10,"AI","1拆10"\n' +
        '2024-09-15,TW,2303,聯電,現金減資,200,2,TWD,0,0,0.2,2000,2024-09-15,"晶圓","減資退款 2000"\n' +
        '2025-04-10,TW,2886,兆豐金,現金增資,200,33,TWD,15,0,0,0,2025-04-10,"官股","認股"';

      const result = parseCSVToTrades(csvContent);

      expect(result.successCount).toBe(4);
      expect(result.skippedCount).toBe(0);

      expect(result.trades[0].type).toBe('STOCK_DIVIDEND');
      expect(result.trades[0].shares).toBe(50);
      expect(result.trades[0].ratio).toBe(0.05);

      expect(result.trades[1].type).toBe('STOCK_SPLIT');
      expect(result.trades[1].ratio).toBe(10);

      expect(result.trades[2].type).toBe('CAPITAL_REDUCTION');
      expect(result.trades[2].shares).toBe(200);
      expect(result.trades[2].cashAmount).toBe(2000);

      expect(result.trades[3].type).toBe('CAPITAL_INCREASE');
      expect(result.trades[3].shares).toBe(200);
      expect(result.trades[3].price).toBe(33);
    });
  });

  describe('Seam 2: mergeTrades (交易追加與去重)', () => {
    it('應能將新交易追加至既有交易中，並過濾相同 ID 之重複紀錄', () => {
      const existing: TradeRecord[] = [
        {
          id: 'trade-1',
          date: '2026-01-01',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 1000,
          price: 600,
          fee: 0,
          tax: 0,
          createdAt: 1000,
        },
      ];

      const incoming: TradeRecord[] = [
        {
          id: 'trade-1', // 重複 ID
          date: '2026-01-01',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 1000,
          price: 600,
          fee: 0,
          tax: 0,
          createdAt: 1000,
        },
        {
          id: 'trade-2', // 新 ID
          date: '2026-01-02',
          symbol: 'NVDA',
          market: 'US',
          currency: 'USD',
          type: 'BUY',
          shares: 10,
          price: 120,
          fee: 0,
          tax: 0,
          createdAt: 2000,
        },
      ];

      const merged = mergeTrades(existing, incoming);

      expect(merged).toHaveLength(2);
      expect(merged.map(t => t.id)).toEqual(['trade-2', 'trade-1']);
    });
  });

  describe('Seam 3: validateTradesSchema (JSON 結構防呆校驗)', () => {
    it('合法 TradeRecord 陣列應校驗通過', () => {
      const sample = getDefaultSampleTrades();
      const validated = validateTradesSchema(sample);
      expect(validated).not.toBeNull();
      expect(validated?.length).toBe(sample.length);
    });

    it('非陣列或包含損毀欄位之資料應回傳 null', () => {
      expect(validateTradesSchema(null)).toBeNull();
      expect(validateTradesSchema('not-an-array')).toBeNull();
      expect(validateTradesSchema({})).toBeNull();
      expect(validateTradesSchema([{ symbol: '2330' }])).toBeNull(); // 缺少必填欄位
      expect(validateTradesSchema([{ date: '2026-01-01', market: 'INVALID', symbol: '2330', type: 'BUY', shares: 10, price: 100 }])).toBeNull();
    });
  });

  describe('Seam 4: loadCustomPricesFromStorage & saveCustomPricesToStorage (市價持久化)', () => {
    it('應能正確儲存並讀取自訂市價字典', () => {
      expect(loadCustomPricesFromStorage()).toEqual({});

      const prices = { '2330': 700, 'NVDA': 130 };
      saveCustomPricesToStorage(prices);

      expect(loadCustomPricesFromStorage()).toEqual(prices);
    });

    it('LocalStorage 損毀或異常時應優雅降級為空物件', () => {
      localStorage.setItem('STOCK_TRACKER_CUSTOM_PRICES_V1', 'invalid-json');
      expect(loadCustomPricesFromStorage()).toEqual({});
    });
  });
});
