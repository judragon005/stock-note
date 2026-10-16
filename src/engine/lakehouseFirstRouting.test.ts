import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSymbolHistoricalPrices } from './historicalPriceFetcher';
import { fetchCompanyDividendHistory, resetDividendCacheForTesting } from './dividendService';

describe('Ticket 05: 歷史淨值回推與除權息 Lakehouse-First 本地優先', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetDividendCacheForTesting();
  });

  describe('historicalPriceFetcher Lakehouse-First 路由', () => {
    it('當本地 SQLite 湖倉已有日 K 數據且覆蓋查詢區間時，應直接返回且完全不發起外部 Yahoo 請求', async () => {
      // 模擬 /api/market/history/2330 回傳完整歷史
      const mockLakehouseResponse = {
        symbol: '2330',
        candles: [
          { date: '2026-01-01', open: 600, high: 605, low: 595, close: 600, volume: 1000 },
          { date: '2026-01-02', open: 601, high: 608, low: 600, close: 605, volume: 1200 },
          { date: '2026-01-03', open: 606, high: 615, low: 605, close: 610, volume: 1500 },
        ],
      };

      const customFetch = vi.fn();
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockLakehouseResponse,
      } as Response);

      const prices = await fetchSymbolHistoricalPrices(
        '2330',
        'TW',
        '2026-01-01',
        '2026-01-03',
        {},
        customFetch
      );

      // 驗證命中本地湖倉
      expect(prices).toEqual({
        '2026-01-01': 600,
        '2026-01-02': 605,
        '2026-01-03': 610,
      });

      // 驗證外部 Yahoo customFetch 根本沒有被呼叫
      expect(customFetch).not.toHaveBeenCalled();
    });

    it('當本地湖倉未命中或無資料時，應優雅降級發起外部 Yahoo 請求補齊', async () => {
      // 本地湖倉回傳 404 或空資料
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const mockYahooData = {
        chart: {
          result: [
            {
              timestamp: [1767225600], // 2026-01-01
              indicators: {
                quote: [{ close: [600] }],
              },
            },
          ],
        },
      };

      const customFetch = vi.fn().mockResolvedValueOnce(mockYahooData);

      const prices = await fetchSymbolHistoricalPrices(
        '2330',
        'TW',
        '2026-01-01',
        '2026-01-01',
        {},
        customFetch
      );

      expect(prices).toEqual({
        '2026-01-01': 600,
      });
      expect(customFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('dividendService Lakehouse-First 路由', () => {
    it('當本地除權息日曆已有該標的配息紀錄時，應直接返回且不發起 FinMind 外部請求', async () => {
      const mockLakehouseCa = {
        symbol: '2330',
        actions: [
          {
            year: 2023,
            cashDividend: 11.0,
            stockDividend: 0,
            totalDividend: 11.0,
            exDividendDate: '2023-06-15',
            payDate: '2023-07-13',
          },
        ],
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
        const url = String(input);
        if (url.includes('/api/market/corporate-actions/')) {
          return {
            ok: true,
            json: async () => mockLakehouseCa,
          } as Response;
        }
        // 如果打了 finmind 則拋錯以示測試未命中優先
        throw new Error(`Unexpected external call: ${url}`);
      });

      const records = await fetchCompanyDividendHistory('2330', 'TW');

      expect(records.length).toBe(1);
      expect(records[0].cashDividend).toBe(11.0);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/market/corporate-actions/2330');
    });

    it('當本地除權息日曆未命中時，應優雅降級請求 FinMind 外部 API', async () => {
      const mockFinMindData = {
        data: [
          {
            date: '2022-07-01',
            CashEarningsDistribution: 10.0,
            StockEarningsDistribution: 0,
            CashExDividendTradingDate: '2022-07-15',
            CashDividendPaymentDate: '2022-08-15',
          },
        ],
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
        const url = String(input);
        if (url.includes('/api/market/corporate-actions/')) {
          return {
            ok: false,
            status: 404,
            json: async () => ({ actions: [] }),
          } as Response;
        }
        if (url.includes('api.finmindtrade.com')) {
          return {
            ok: true,
            json: async () => mockFinMindData,
          } as Response;
        }
        return { ok: false } as Response;
      });

      const records = await fetchCompanyDividendHistory('2330', 'TW');

      expect(records.length).toBe(1);
      expect(records[0].cashDividend).toBe(10.0);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
