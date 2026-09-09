import { describe, it, expect, vi } from 'vitest';
import {
  normalizeYahooSymbol,
  getYahooCandidateSymbols,
  inferMarketFromSymbol,
  parseYahooQuoteResponse,
  parseTWSEDayAllResponse,
  fetchStockQuote,
  fetchBatchStockQuotes,
  parseYahooExchangeRateResponse,
  fetchExchangeRate,
  fetchWithCORSProxy,
} from './priceFetcher';
import { MarketType } from '../types/stock';

describe('PriceFetcher Engine (TDD Seam)', () => {
  describe('0. inferMarketFromSymbol (市場智能推斷)', () => {
    it('純數字代碼應推斷為 TW', () => {
      expect(inferMarketFromSymbol('2330')).toBe('TW');
      expect(inferMarketFromSymbol('6204')).toBe('TW');
      expect(inferMarketFromSymbol('0050')).toBe('TW');
    });

    it('台股主動型 ETF 與英數混合代碼應正確推斷為 TW', () => {
      expect(inferMarketFromSymbol('00403A')).toBe('TW');
      expect(inferMarketFromSymbol('00981A')).toBe('TW');
      expect(inferMarketFromSymbol('009826')).toBe('TW');
    });

    it('帶有台股後綴 .TW 或 .TWO 應正確推斷為 TW', () => {
      expect(inferMarketFromSymbol('6204.TWO')).toBe('TW');
      expect(inferMarketFromSymbol('2330.TW')).toBe('TW');
      expect(inferMarketFromSymbol('8299.two')).toBe('TW');
    });

    it('美股純英文字母與特殊點號代碼應推斷為 US', () => {
      expect(inferMarketFromSymbol('AAPL')).toBe('US');
      expect(inferMarketFromSymbol('NVDA')).toBe('US');
      expect(inferMarketFromSymbol('TSLA')).toBe('US');
      expect(inferMarketFromSymbol('BRK.B')).toBe('US');
      expect(inferMarketFromSymbol('BRK-B')).toBe('US');
      expect(inferMarketFromSymbol('AAPL.US')).toBe('US');
    });
  });

  describe('1. normalizeYahooSymbol & getYahooCandidateSymbols (標的代碼正規化與候選)', () => {
    it('應正確為台股上市加上 .TW 後綴', () => {
      expect(normalizeYahooSymbol('2330', 'TW')).toBe('2330.TW');
      expect(normalizeYahooSymbol('0050', 'TW')).toBe('0050.TW');
      expect(normalizeYahooSymbol('2330.TW', 'TW')).toBe('2330.TW');
    });

    it('應保留台股已指定之 .TWO 上櫃後綴', () => {
      expect(normalizeYahooSymbol('6547.TWO', 'TW')).toBe('6547.TWO');
    });

    it('應正確處理美股代碼大寫與特殊字元轉換', () => {
      expect(normalizeYahooSymbol('aapl', 'US')).toBe('AAPL');
      expect(normalizeYahooSymbol('NVDA', 'US')).toBe('NVDA');
      expect(normalizeYahooSymbol('BRK.B', 'US')).toBe('BRK-B');
    });

    it('getYahooCandidateSymbols 應為台股產生上市與上櫃雙軌備援候選代碼', () => {
      const candidates6204 = getYahooCandidateSymbols('6204', 'TW');
      expect(candidates6204).toContain('6204.TWO');
      expect(candidates6204).toContain('6204.TW');

      const candidates2330 = getYahooCandidateSymbols('2330', 'TW');
      expect(candidates2330[0]).toBe('2330.TW');
      expect(candidates2330).toContain('2330.TWO');
    });

    it('getYahooCandidateSymbols 應為美股特殊代碼產生連字號與去點備援', () => {
      const candidatesBrk = getYahooCandidateSymbols('BRK.B', 'US');
      expect(candidatesBrk[0]).toBe('BRK-B');

      const candidatesBrkb = getYahooCandidateSymbols('BRKB', 'US');
      expect(candidatesBrkb).toContain('BRKB');
      expect(candidatesBrkb).toContain('BRK-B');

      const candidatesUs = getYahooCandidateSymbols('AAPL.US', 'US');
      expect(candidatesUs[0]).toBe('AAPL');
    });
  });


  describe('2. parseYahooQuoteResponse (Yahoo 響應資料解析)', () => {
    it('應正確解析 Yahoo Finance Chart v8 格式數據', () => {
      const mockYahooChartData = {
        chart: {
          result: [
            {
              meta: {
                currency: 'TWD',
                symbol: '2330.TW',
                regularMarketPrice: 1050,
                chartPreviousClose: 1040,
                previousClose: 1040,
                regularMarketTime: 1724217000,
              },
            },
          ],
        },
      };

      const quote = parseYahooQuoteResponse(mockYahooChartData, '2330', 'TW');
      expect(quote).not.toBeNull();
      expect(quote?.symbol).toBe('2330');
      expect(quote?.price).toBe(1050);
      expect(quote?.previousClose).toBe(1040);
      expect(quote?.change).toBe(10);
      expect(quote?.changePercent).toBeCloseTo(0.96, 1);
      expect(quote?.currency).toBe('TWD');
      expect(quote?.status).toBe('DELAYED');
      expect(quote?.source).toBe('YAHOO');
    });

    it('若響應資料不完整或報價為 0 應回傳 null', () => {
      expect(parseYahooQuoteResponse({}, '2330', 'TW')).toBeNull();
      expect(parseYahooQuoteResponse({ chart: { result: [] } }, '2330', 'TW')).toBeNull();
      expect(parseYahooQuoteResponse({ chart: { result: [{ meta: { regularMarketPrice: 0 } }] } }, '2330', 'TW')).toBeNull();
    });
  });

  describe('3. parseTWSEDayAllResponse (台灣證交所官方 OpenAPI 備援解析)', () => {
    it('應正確自 TWSE STOCK_DAY_ALL 陣列解析指定標的收盤價與漲跌', () => {
      const mockTwseData = [
        {
          Code: '2330',
          Name: '台積電',
          ClosingPrice: '1050.00',
          Change: '+10.00',
          MonthlyAveragePrice: '1030.00',
        },
        {
          Code: '2317',
          Name: '鴻海',
          ClosingPrice: '185.50',
          Change: '-2.00',
          MonthlyAveragePrice: '180.00',
        },
      ];

      const quote = parseTWSEDayAllResponse(mockTwseData, '2330');
      expect(quote).not.toBeNull();
      expect(quote?.symbol).toBe('2330');
      expect(quote?.price).toBe(1050);
      expect(quote?.change).toBe(10);
      expect(quote?.previousClose).toBe(1040);
      expect(quote?.changePercent).toBeCloseTo(0.96, 1);
      expect(quote?.currency).toBe('TWD');
      expect(quote?.status).toBe('PREVIOUS_CLOSE');
      expect(quote?.source).toBe('TWSE');
    });

    it('若查無該標的或價格非數值應回傳 null', () => {
      const mockTwseData = [{ Code: '9999', ClosingPrice: '--' }];
      expect(parseTWSEDayAllResponse(mockTwseData, '2330')).toBeNull();
    });
  });

  describe('4. fetchStockQuote (多源降級與容錯獲取)', () => {
    it('當主來源 Yahoo 成功時應直接返回 Yahoo 報價', async () => {
      const mockProxy = vi.fn().mockResolvedValue({
        chart: {
          result: [
            {
              meta: {
                currency: 'USD',
                symbol: 'NVDA',
                regularMarketPrice: 130.5,
                chartPreviousClose: 125.0,
              },
            },
          ],
        },
      });

      const quote = await fetchStockQuote('NVDA', 'US', mockProxy);
      expect(quote).not.toBeNull();
      expect(quote?.price).toBe(130.5);
      expect(quote?.change).toBe(5.5);
      expect(quote?.source).toBe('YAHOO');
      expect(mockProxy).toHaveBeenCalledTimes(1);
    });

    it('當台股主來源 Yahoo 失敗且上櫃失敗時，應自動降級請求 TWSE OpenAPI', async () => {
      const mockProxy = vi.fn().mockImplementation((url: string) => {
        if (url.includes('yahoo.com')) {
          return Promise.reject(new Error('Yahoo Rate Limited'));
        }
        if (url.includes('openapi.twse.com.tw')) {
          return Promise.resolve([
            {
              Code: '2330',
              Name: '台積電',
              ClosingPrice: '1050.00',
              Change: '+10.00',
            },
          ]);
        }
        return Promise.reject(new Error('Unknown url'));
      });

      const quote = await fetchStockQuote('2330', 'TW', mockProxy);
      expect(quote).not.toBeNull();
      expect(quote?.price).toBe(1050);
      expect(quote?.source).toBe('TWSE');
      expect(quote?.status).toBe('PREVIOUS_CLOSE');
    });

    it('當所有來源均失敗時應回傳 null', async () => {
      const mockProxy = vi.fn().mockRejectedValue(new Error('Network Offline'));
      const quote = await fetchStockQuote('2330', 'TW', mockProxy);
      expect(quote).toBeNull();
    });
  });

  describe('5. fetchBatchStockQuotes (批次並行抓取)', () => {
    it('應正確並行抓取多檔標的並組裝成 Record 字典', async () => {
      const mockSingleFetcher = vi.fn().mockImplementation(async (symbol: string, market: MarketType) => {
        return {
          symbol,
          market,
          price: symbol === '2330' ? 1050 : 130,
          currency: market === 'TW' ? 'TWD' : 'USD',
          status: 'DELAYED',
          updatedAt: Date.now(),
          source: 'YAHOO',
        };
      });

      const symbols = [
        { symbol: '2330', market: 'TW' as MarketType },
        { symbol: 'NVDA', market: 'US' as MarketType },
      ];

      const result = await fetchBatchStockQuotes(symbols, mockSingleFetcher);
      expect(result['2330']?.price).toBe(1050);
      expect(result['NVDA']?.price).toBe(130);
      expect(mockSingleFetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('6. parseYahooExchangeRateResponse (美金台幣匯率解析)', () => {
    it('應正確解析 Yahoo Finance Chart v8 匯率數據 (盤中即時/延遲)', () => {
      const mockYahooRateData = {
        chart: {
          result: [
            {
              meta: {
                currency: 'TWD',
                symbol: 'USDTWD=X',
                regularMarketPrice: 32.456,
                chartPreviousClose: 32.35,
                previousClose: 32.35,
              },
            },
          ],
        },
      };

      const quote = parseYahooExchangeRateResponse(mockYahooRateData);
      expect(quote).not.toBeNull();
      expect(quote?.rate).toBe(32.456);
      expect(quote?.prevClose).toBe(32.35);
      expect(quote?.change).toBeCloseTo(0.106, 3);
      expect(quote?.changePercent).toBeCloseTo((0.106 / 32.35) * 100, 2);
      expect(quote?.status).toBe('REALTIME');
      expect(quote?.source).toBe('YAHOO');
    });

    it('當 regularMarketPrice 缺失或為 0 時，應平滑降級至前日收盤價 (PREVIOUS_CLOSE)', () => {
      const mockFallbackRateData = {
        chart: {
          result: [
            {
              meta: {
                symbol: 'USDTWD=X',
                regularMarketPrice: 0,
                chartPreviousClose: 32.4,
              },
            },
          ],
        },
      };

      const quote = parseYahooExchangeRateResponse(mockFallbackRateData);
      expect(quote).not.toBeNull();
      expect(quote?.rate).toBe(32.4);
      expect(quote?.status).toBe('PREVIOUS_CLOSE');
      expect(quote?.source).toBe('YAHOO');
    });

    it('當格式錯誤或無任何有效價格時應回傳 null', () => {
      expect(parseYahooExchangeRateResponse({})).toBeNull();
      expect(parseYahooExchangeRateResponse({ chart: { result: [] } })).toBeNull();
      expect(parseYahooExchangeRateResponse({ chart: { result: [{ meta: { regularMarketPrice: 0, chartPreviousClose: 0 } }] } })).toBeNull();
    });
  });

  describe('7. fetchExchangeRate (匯率多源抓取與容錯)', () => {
    it('當 Yahoo 成功時應返回解析後之匯率報價', async () => {
      const mockProxy = vi.fn().mockResolvedValue({
        chart: {
          result: [
            {
              meta: {
                symbol: 'USDTWD=X',
                regularMarketPrice: 32.5,
                chartPreviousClose: 32.4,
              },
            },
          ],
        },
      });

      const quote = await fetchExchangeRate(mockProxy);
      expect(quote).not.toBeNull();
      expect(quote?.rate).toBe(32.5);
      expect(quote?.status).toBe('REALTIME');
      expect(mockProxy).toHaveBeenCalledWith(expect.stringContaining('USDTWD=X'), expect.any(Number));
    });

    it('當代理請求全數失敗時應返回 null 以利呼叫端回退快取', async () => {
      const mockProxy = vi.fn().mockRejectedValue(new Error('Proxy Timeout'));
      const quote = await fetchExchangeRate(mockProxy);
      expect(quote).toBeNull();
    });
  });

  describe('8. fetchWithCORSProxy (本地代理路由轉換)', () => {
    it('在瀏覽器環境下應將 www.twse.com.tw 映射至 /api/twse-www 代理路由', async () => {
      const originalWindow = (globalThis as any).window;
      const originalFetch = globalThis.fetch;

      try {
        // 模擬瀏覽器環境
        (globalThis as any).window = {};
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve('{"stat":"OK"}'),
        });
        globalThis.fetch = mockFetch;

        const res = await fetchWithCORSProxy('https://www.twse.com.tw/rwd/zh/fund/T86?response=json');
        expect(res).toEqual({ stat: 'OK' });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/twse-www/rwd/zh/fund/T86'),
          expect.any(Object)
        );
      } finally {
        (globalThis as any).window = originalWindow;
        globalThis.fetch = originalFetch;
      }
    });
  });
});

