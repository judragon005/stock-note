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

  it('當本地快取存在時，應能迅速讀取並解析快取數據 (0 網路延遲秒讀)', async () => {
    const mockSummary: MarketCacheSummary = {
      date: '2026-09-15',
      updatedAt: 1789450000000,
      market: 'TW',
      totalSymbols: 2,
      durationMs: 1500,
      stocks: {
        '2330': {
          symbol: '2330',
          name: '台積電',
          date: '2026-09-15',
          quote: { date: '2026-09-15', open: 1000, high: 1020, low: 995, close: 1015, volume: 45000000 },
          chips: { foreignNetShares: 5000, trustNetShares: 1500, dealerNetShares: -500, totalNetShares: 6000 },
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

    // 模擬 fetch 回傳成功
    // @ts-ignore
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSummary,
    });

    const result = await loadMarketCacheSummary('TW');
    expect(result).toBeDefined();
    expect(result?.totalSymbols).toBe(2);
    expect(result?.stocks['2330'].quote?.close).toBe(1015);
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

  describe('Ticket 01: loadSymbolCompactHistory & getLatestSummaryQuote (本地緊湊日 K 載入)', () => {
    it('應能從 compact JSON 中精準提取指定標的歷史日 K 並格式化為 DailyCandle[]', async () => {
      // @ts-ignore
      const { loadSymbolCompactHistory, resetCompactHistoryCache } = await import('./marketCacheLoader');
      if (resetCompactHistoryCache) resetCompactHistoryCache();

      const mockCompactData = {
        '00403A': [
          { d: '2026-09-14', o: 10.17, h: 10.17, l: 10.17, c: 10.17, v: 0 },
          { d: '2026-09-15', o: 10.04, h: 10.13, l: 10.02, c: 10.03, v: 44852439 },
        ],
      };

      // @ts-ignore
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockCompactData,
      });

      const candles = await loadSymbolCompactHistory('00403A');
      expect(candles).toBeDefined();
      expect(candles?.length).toBe(2);
      expect(candles?.[0]).toEqual({
        date: '2026-09-14',
        open: 10.17,
        high: 10.17,
        low: 10.17,
        close: 10.17,
        volume: 0,
      });
      expect(candles?.[1]).toEqual({
        date: '2026-09-15',
        open: 10.04,
        high: 10.13,
        low: 10.02,
        close: 10.03,
        volume: 44852439,
      });
    });

    it('連續調用時應走單例記憶體快取，不重複發送 fetch 請求', async () => {
      // @ts-ignore
      const { loadSymbolCompactHistory, resetCompactHistoryCache } = await import('./marketCacheLoader');
      if (resetCompactHistoryCache) resetCompactHistoryCache();

      const mockCompactData = {
        '2330': [{ d: '2026-09-15', o: 1000, h: 1020, l: 995, c: 1015, v: 45000 }],
        '0050': [{ d: '2026-09-15', o: 190, h: 192, l: 189, c: 191, v: 12000 }],
      };

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockCompactData,
      });
      // @ts-ignore
      global.fetch = fetchSpy;

      const c1 = await loadSymbolCompactHistory('2330');
      const c2 = await loadSymbolCompactHistory('0050');

      expect(c1?.[0].close).toBe(1015);
      expect(c2?.[0].close).toBe(191);
      // 確保只調用了一次 fetch 取得整份 compact 表
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('若標的不在 compact 快取中，應安全回傳 null', async () => {
      // @ts-ignore
      const { loadSymbolCompactHistory, resetCompactHistoryCache } = await import('./marketCacheLoader');
      if (resetCompactHistoryCache) resetCompactHistoryCache();

      // @ts-ignore
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ '2330': [] }),
      });

      const candles = await loadSymbolCompactHistory('999999');
      expect(candles).toBeNull();
    });

    it('getLatestSummaryQuote 應能從當日 summary 快取提取該標的最新日 K', async () => {
      // @ts-ignore
      const { getLatestSummaryQuote } = await import('./marketCacheLoader');

      const mockSummary: MarketCacheSummary = {
        date: '2026-09-30',
        updatedAt: Date.now(),
        market: 'TW',
        totalSymbols: 1,
        durationMs: 100,
        stocks: {
          '00403A': {
            symbol: '00403A',
            name: '統一升級50',
            date: '2026-09-30',
            quote: { date: '2026-09-30', open: 10.83, high: 10.9, low: 10.78, close: 10.79, volume: 144635371 },
          },
        },
      };

      // @ts-ignore
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSummary,
      });

      const quote = await getLatestSummaryQuote('00403A');
      expect(quote).toEqual({
        date: '2026-09-30',
        open: 10.83,
        high: 10.9,
        low: 10.78,
        close: 10.79,
        volume: 144635371,
      });
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

    it('當本地 API 離線 (404/Network Error) 時，應平滑降級為 compact 快取', async () => {
      // @ts-ignore
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/market/history/')) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        if (url.includes('tw_market_ohlcv_compact.json')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              '2330': [{ d: '2026-09-30', o: 980, h: 995, l: 978, c: 990, v: 35000 }],
            }),
          });
        }
        return Promise.reject(new Error('Unknown url'));
      });

      const { loadSymbolHistoryFromLakehouse, resetCompactHistoryCache } = await import('./marketCacheLoader');
      resetCompactHistoryCache();

      const result = await loadSymbolHistoryFromLakehouse('2330', 'TW');
      expect(result).toHaveLength(1);
      expect(result?.[0].close).toBe(990);
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


