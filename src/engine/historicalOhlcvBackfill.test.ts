import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  backfillSymbolOhlcvAndIndicators,
  mergeDailyCandles,
  backfillPortfolioSymbols,
} from './historicalOhlcvBackfill';
import { DailyCandle } from '../types/indicators';
import * as db from '../utils/db';
import * as priceFetcher from './priceFetcher';

describe('Historical OHLCV & Indicators Backfill Engine (回補引擎)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(db, 'saveSymbolOhlcv').mockResolvedValue();
    vi.spyOn(db, 'saveSymbolIndicators').mockResolvedValue();
    vi.spyOn(db, 'getSymbolIndicators').mockResolvedValue(null);
  });

  describe('1. mergeDailyCandles (增量 K 線合併與去重排序)', () => {
    it('應能無損合併既有 K 線與最新 K 線，同日期以最新數據覆蓋並按日期遞增排序', () => {
      const existing: DailyCandle[] = [
        { date: '2026-01-01', open: 100, high: 105, low: 98, close: 102, volume: 1000 },
        { date: '2026-01-02', open: 102, high: 106, low: 100, close: 105, volume: 1200 },
      ];

      const incoming: DailyCandle[] = [
        { date: '2026-01-02', open: 102, high: 107, low: 100, close: 106, volume: 1300 }, // 修正收盤價 106
        { date: '2026-01-03', open: 106, high: 110, low: 104, close: 108, volume: 1500 },
      ];

      const merged = mergeDailyCandles(existing, incoming);
      expect(merged.length).toBe(3);
      expect(merged[0].date).toBe('2026-01-01');
      expect(merged[1].date).toBe('2026-01-02');
      expect(merged[1].close).toBe(106); // 以最新覆蓋
      expect(merged[2].date).toBe('2026-01-03');
    });
  });

  describe('2. backfillSymbolOhlcvAndIndicators (單一標的回補流程)', () => {
    it('若本地已有快取且未過期，應直接讀取快取並返回，不重複發送網路請求', async () => {
      const mockCandles: DailyCandle[] = [
        { date: '2026-01-01', open: 100, high: 105, low: 98, close: 102, volume: 1000 },
      ];

      vi.spyOn(db, 'getSymbolOhlcv').mockResolvedValue({
        symbol: '2330',
        market: 'TW',
        candles: mockCandles,
        updatedAt: Date.now(),
      });

      const fetchSpy = vi.spyOn(priceFetcher, 'fetchWithCORSProxy');

      const result = await backfillSymbolOhlcvAndIndicators('2330', 'TW');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.candles.length).toBe(1);
      expect(result.indicators.length).toBe(1);
    });

    it('若本地無快取，應透過 fetchWithCORSProxy 拉取遠端數據、計算指標並寫入 IndexedDB', async () => {
      vi.spyOn(db, 'getSymbolOhlcv').mockResolvedValue(null);
      const saveOhlcvSpy = vi.spyOn(db, 'saveSymbolOhlcv').mockResolvedValue();
      const saveIndicatorsSpy = vi.spyOn(db, 'saveSymbolIndicators').mockResolvedValue();

      // 模擬 Yahoo Chart API 響應
      const mockApiResponse = {
        chart: {
          result: [
            {
              timestamp: [1767225600, 1767312000],
              indicators: {
                quote: [
                  {
                    open: [100, 105],
                    high: [106, 110],
                    low: [98, 104],
                    close: [105, 108],
                    volume: [5000, 6000],
                  },
                ],
              },
            },
          ],
        },
      };

      vi.spyOn(priceFetcher, 'fetchWithCORSProxy').mockResolvedValue(mockApiResponse);

      const result = await backfillSymbolOhlcvAndIndicators('2330', 'TW');

      expect(result.candles.length).toBe(2);
      expect(result.indicators.length).toBe(2);
      expect(saveOhlcvSpy).toHaveBeenCalled();
      expect(saveIndicatorsSpy).toHaveBeenCalled();
    });
  });

  describe('3. backfillPortfolioSymbols (批次進度回報)', () => {
    it('應能循序處理多檔標的並透過 onProgress 回報進度', async () => {
      vi.spyOn(db, 'getSymbolOhlcv').mockResolvedValue({
        symbol: '2330',
        market: 'TW',
        candles: [{ date: '2026-01-01', open: 100, high: 105, low: 98, close: 102, volume: 1000 }],
        updatedAt: Date.now(),
      });

      const progressHistory: Array<{ current: number; total: number; symbol: string }> = [];
      await backfillPortfolioSymbols(
        [
          { symbol: '2330', market: 'TW' },
          { symbol: 'AAPL', market: 'US' },
        ],
        (current, total, symbol) => {
          progressHistory.push({ current, total, symbol });
        }
      );

      expect(progressHistory.length).toBe(2);
      expect(progressHistory[0]).toEqual({ current: 1, total: 2, symbol: '2330' });
      expect(progressHistory[1]).toEqual({ current: 2, total: 2, symbol: 'AAPL' });
    });
  });
});
