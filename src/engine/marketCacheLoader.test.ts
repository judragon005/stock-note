import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadMarketCacheSummary,
  syncMarketCacheToIndexedDB,
  MarketCacheSummary,
} from './marketCacheLoader';
import * as db from '../utils/db';

describe('MarketCacheLoader (前端快取秒讀與 IndexedDB 沉澱引擎)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Spec 0247 T09: 靜態 JSON 市場快取總表已退役，loadMarketCacheSummary 不發起網路抓取並回傳 null', async () => {
    const fetchSpy = vi.fn();
    // @ts-ignore
    global.fetch = fetchSpy;

    const result = await loadMarketCacheSummary('TW');
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('若快取檔案不存在 (404)，應安全返回 null 而不中斷應用', async () => {
    // @ts-ignore
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await loadMarketCacheSummary('TW');
    expect(result).toBeNull();
  });

  it('syncMarketCacheToIndexedDB 應能將快取中的日 K 與指標批量沉澱至 IndexedDB', async () => {
    const saveOhlcvSpy = vi.spyOn(db, 'saveSymbolOhlcv').mockResolvedValue();
    const saveIndicatorsSpy = vi.spyOn(db, 'saveSymbolIndicators').mockResolvedValue();

    const mockSummary: MarketCacheSummary = {
      date: '2026-09-15',
      updatedAt: Date.now(),
      market: 'TW',
      totalSymbols: 1,
      durationMs: 100,
      stocks: {
        '2330': {
          symbol: '2330',
          name: '台積電',
          date: '2026-09-15',
          quote: { date: '2026-09-15', open: 1000, high: 1020, low: 995, close: 1015, volume: 45000000 },
          indicator: {
            date: '2026-09-15',
            close: 1015,
            ma: { ma5: 1010, ma20: 990, ma60: 950 },
            maDeduction: { ma20Slope: 'UP', isBottomPenetrationRebound: false },
            box: { boxStatus: 'INSIDE_BOX' },
            bbands: { upper: 1050, mid: 1000, lower: 950, bandwidth: 10, isSqueeze: false },
            atr: { atr14: 15, trailingDefensePrice: 975 },
            momentum: { rs10Score: 70, rsRank: 'STRONG' },
          },
        },
      },
    };

    await syncMarketCacheToIndexedDB(mockSummary);
    expect(saveOhlcvSpy).toHaveBeenCalledWith(expect.objectContaining({ symbol: '2330', market: 'TW' }));
    expect(saveIndicatorsSpy).toHaveBeenCalledWith(expect.objectContaining({ symbol: '2330', market: 'TW' }));
  });

  it('當快取資料缺少 date 欄位或 totalSymbols 為 0 時，應具備防禦性保護', async () => {
    const saveOhlcvSpy = vi.spyOn(db, 'saveSymbolOhlcv').mockResolvedValue();

    const emptySummary: MarketCacheSummary = {
      date: '',
      updatedAt: Date.now(),
      market: 'TW',
      totalSymbols: 0,
      durationMs: 0,
      stocks: {},
    };

    await syncMarketCacheToIndexedDB(emptySummary);
    expect(saveOhlcvSpy).not.toHaveBeenCalled();
  });

  describe('Ticket 01 (Spec 0247 T09 退役驗證): loadSymbolCompactHistory & getLatestSummaryQuote 已退役不發起靜態 JSON 抓取', () => {
    it('loadSymbolCompactHistory 與 getLatestSummaryQuote 一律回傳 null 且不觸碰 /market-cache/*.json', async () => {
      const { loadSymbolCompactHistory, getLatestSummaryQuote, resetCompactHistoryCache } = await import('./marketCacheLoader');
      resetCompactHistoryCache();

      const fetchSpy = vi.fn();
      // @ts-ignore
      global.fetch = fetchSpy;

      expect(await loadSymbolCompactHistory('00403A')).toBeNull();
      expect(await loadSymbolCompactHistory('2330')).toBeNull();
      expect(await getLatestSummaryQuote('00403A')).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('loadSymbolHistoryFromLakehouse (Ticket 11)', () => {
    it('優先從本地 API /api/market/history/:symbol 獲取日 K 並沉澱至 IndexedDB', async () => {
      const mockApiResponse = {
        symbol: '2330',
        candles: [
          { date: '2026-09-29', open: 980, high: 990, low: 975, close: 985, volume: 30000 },
          { date: '2026-09-30', open: 985, high: 995, low: 980, close: 990, volume: 35000 },
        ],
        chips: {},
      };

      const saveOhlcvSpy = vi.spyOn(db, 'saveSymbolOhlcv').mockResolvedValue(undefined as any);

      // @ts-ignore
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const { loadSymbolHistoryFromLakehouse } = await import('./marketCacheLoader');
      const result = await loadSymbolHistoryFromLakehouse('2330', 'TW');

      expect(result).toHaveLength(2);
      expect(result?.[1].close).toBe(990);
      expect(saveOhlcvSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: '2330',
          market: 'TW',
        })
      );
    });

    it('應完整映射 chips 中的 trust_net、foreign_net 與 dealer_net 至 DailyCandle (Spec 0218 Ticket 02)', async () => {
      const mockApiResponse = {
        symbol: '2330',
        candles: [
          { date: '2026-11-04', open: 1000, high: 1020, low: 995, close: 1015, volume: 30000000, transactions: 18000 },
        ],
        chips: {
          '2026-11-04': {
            symbol: '2330',
            date: '2026-11-04',
            foreign_net: -21604,
            trust_net: 3715,
            dealer_net: 5967,
          },
        },
      };

      // @ts-ignore
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const { loadSymbolHistoryFromLakehouse } = await import('./marketCacheLoader');
      const result = await loadSymbolHistoryFromLakehouse('2330', 'TW');

      expect(result).toHaveLength(1);
      expect(result?.[0].trustNetBuy).toBe(3715);
      expect(result?.[0].foreignNetBuy).toBe(-21604);
      expect(result?.[0].dealerNetBuy).toBe(5967);
      expect(result?.[0].transactions).toBe(18000);
    });

    it('Spec 0247 T09: 當本地 SQLite API 離線 (404) 時，應誠實回傳 null，不再降級抓取退役靜態 compact JSON', async () => {
      const fetchSpy = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/market/history/')) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error(`Unexpected static cache fetch: ${url}`));
      });
      // @ts-ignore
      global.fetch = fetchSpy;

      const { loadSymbolHistoryFromLakehouse, resetCompactHistoryCache } = await import('./marketCacheLoader');
      resetCompactHistoryCache();

      const result = await loadSymbolHistoryFromLakehouse('2330', 'TW');
      expect(result).toBeNull();
      const staticCalls = fetchSpy.mock.calls.filter(([u]) => String(u).includes('/market-cache/'));
      expect(staticCalls).toEqual([]);
    });

    it('Ticket 03: loadSymbolDispositionStatus 能正確解析處置與注意狀態，並在美股或異常時安全回退 NORMAL', async () => {
      // @ts-ignore
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/market/quote/2330')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              symbol: '2330',
              meta: { status: 'DISPOSITION' },
            }),
          });
        }
        if (url.includes('/api/market/quote/2603')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              symbol: '2603',
              meta: { status: 'ATTENTION' },
            }),
          });
        }
        return Promise.resolve({ ok: false, status: 500 });
      });

      const { loadSymbolDispositionStatus } = await import('./marketCacheLoader');

      // 1. 處置股票
      const status2330 = await loadSymbolDispositionStatus('2330', 'TW');
      expect(status2330).toBe('DISPOSITION');

      // 2. 注意股票
      const status2603 = await loadSymbolDispositionStatus('2603', 'TW');
      expect(status2603).toBe('ATTENTION');

      // 3. 美股直接回退 NORMAL
      const statusNvda = await loadSymbolDispositionStatus('NVDA', 'US');
      expect(statusNvda).toBe('NORMAL');

      // 4. API 失敗時平滑回退 NORMAL
      const statusErr = await loadSymbolDispositionStatus('9999', 'TW');
      expect(statusErr).toBe('NORMAL');
    });
  });

  describe('Spec 0168 / Ticket 03: getOtcAliasCandidates 與湖倉別名回退探測', () => {
    it('getOtcAliasCandidates 應為台股產生標準與 O 尾綴雙向候選，美股則維持原樣', async () => {
      const { getOtcAliasCandidates } = await import('./marketCacheLoader');
      expect(getOtcAliasCandidates('00411A', 'TW')).toEqual(['00411A', '00411AO']);
      expect(getOtcAliasCandidates('00411AO', 'TW')).toEqual(['00411AO', '00411A']);
      expect(getOtcAliasCandidates('3293', 'TW')).toEqual(['3293', '3293O']);
      expect(getOtcAliasCandidates('AAPL', 'US')).toEqual(['AAPL']);
    });

    it('loadSymbolHistoryFromLakehouse 查詢 00411A 查無資料時，應自動探測 00411AO 並成功載入日 K', async () => {
      // @ts-ignore
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/market/history/00411A?')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ candles: [] }),
          });
        }
        if (url.includes('/api/market/history/00411AO?')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              candles: [
                { date: '2026-10-02', open: 10.79, high: 10.79, low: 10.68, close: 10.71, volume: 9935014 },
              ],
            }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const { loadSymbolHistoryFromLakehouse } = await import('./marketCacheLoader');
      const candles = await loadSymbolHistoryFromLakehouse('00411A', 'TW');
      expect(candles).toHaveLength(1);
      expect(candles?.[0].close).toBe(10.71);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/market/history/00411A?limit=250');
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/market/history/00411AO?limit=250');
    });
  });
});


