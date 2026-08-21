import { describe, it, expect, vi } from 'vitest';
import {
  normalizeYahooSymbol,
  parseYahooQuoteResponse,
  parseTWSEDayAllResponse,
  fetchStockQuote,
  fetchBatchStockQuotes,
} from './priceFetcher';
import { MarketType } from '../types/stock';

describe('PriceFetcher Engine (TDD Seam)', () => {
  describe('1. normalizeYahooSymbol (標的代碼正規化)', () => {
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
});
