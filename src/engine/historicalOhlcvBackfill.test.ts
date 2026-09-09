import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  backfillSymbolOhlcvAndIndicators,
  mergeDailyCandles,
  backfillPortfolioSymbols,
  calculateIncrementalPeriod1,
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

    it('當台股首選 .TW 遭遇 404 失敗時，應自動嘗試 .TWO 備援並成功回傳上櫃日 K', async () => {
      vi.spyOn(db, 'getSymbolOhlcv').mockResolvedValue(null);

      // 第一次調用 (6204.TW) 拋出 404 異常，第二次調用 (6204.TWO) 成功回傳
      const mockSuccessResponse = {
        chart: {
          result: [
            {
              timestamp: [1767225600],
              indicators: {
                quote: [
                  {
                    open: [85],
                    high: [88],
                    low: [84],
                    close: [87.3],
                    volume: [1200],
                  },
                ],
              },
            },
          ],
        },
      };

      const fetchSpy = vi.spyOn(priceFetcher, 'fetchWithCORSProxy')
        .mockRejectedValueOnce(new Error('HTTP 404 Not Found'))
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await backfillSymbolOhlcvAndIndicators('6204', 'TW');

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.candles.length).toBe(1);
      expect(result.candles[0].close).toBe(87.3);
      expect(result.indicators.length).toBe(1);
    });

    it('當查詢美股點號代碼 (如 BRK.B) 時，應首選轉換為 BRK-B 成功拉取', async () => {
      vi.spyOn(db, 'getSymbolOhlcv').mockResolvedValue(null);

      const mockBrkResponse = {
        chart: {
          result: [
            {
              timestamp: [1767225600],
              indicators: {
                quote: [
                  {
                    open: [450],
                    high: [455],
                    low: [448],
                    close: [452],
                    volume: [8000],
                  },
                ],
              },
            },
          ],
        },
      };

      const fetchSpy = vi.spyOn(priceFetcher, 'fetchWithCORSProxy').mockResolvedValue(mockBrkResponse);

      const result = await backfillSymbolOhlcvAndIndicators('BRK.B', 'US');

      expect(fetchSpy).toHaveBeenCalled();
      const calledUrl = fetchSpy.mock.calls[0][0];
      expect(calledUrl).toContain('BRK-B');
      expect(result.candles.length).toBe(1);
      expect(result.candles[0].close).toBe(452);
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

  describe('4. calculateIncrementalPeriod1 (增量請求時間戳計算)', () => {
    it('本地無日 K 時，預設請求過去 180 天 (~6 個月)', () => {
      const nowSec = 1750000000;
      const period1 = calculateIncrementalPeriod1(undefined, nowSec);
      expect(period1).toBe(nowSec - 180 * 86400);
    });

    it('本地已有日 K 時，應以最後一根日期往前倒推 7 天作為緩衝增量拉取', () => {
      const existing: DailyCandle[] = [
        { date: '2026-06-01', open: 100, high: 105, low: 98, close: 102, volume: 1000 },
        { date: '2026-06-15', open: 102, high: 106, low: 100, close: 105, volume: 1200 },
      ];
      const lastSec = Math.floor(new Date('2026-06-15').getTime() / 1000);
      const period1 = calculateIncrementalPeriod1(existing, 1780000000);
      expect(period1).toBe(lastSec - 7 * 86400);
    });
  });
});
