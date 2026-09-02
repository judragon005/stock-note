import { describe, it, expect } from 'vitest';
import {
  parseYahooHistoricalChartResponse,
  findMissingDateRanges,
  mergeHistoricalPrices,
} from './historicalPriceFetcher';

describe('歷史日 K 與匯率解析 (Historical Price Fetcher Engine)', () => {
  it('應能正確解析 Yahoo Chart 歷史日 K 陣列並轉化為 YYYY-MM-DD 價格字典', () => {
    const mockYahooResponse = {
      chart: {
        result: [
          {
            meta: { symbol: '2330.TW' },
            timestamp: [1767225600, 1767312000], // 2026-01-01, 2026-01-02
            indicators: {
              quote: [
                {
                  close: [600.5, 615.0],
                },
              ],
            },
          },
        ],
      },
    };

    const priceMap = parseYahooHistoricalChartResponse(mockYahooResponse);
    expect(Object.keys(priceMap).length).toBe(2);
    // 價格應為有效數值
    expect(Object.values(priceMap)).toEqual([600.5, 615]);
  });

  it('增量更新演算法：已快取資料不應重複抓取，僅回傳缺漏日期區間', () => {
    const cachedPrices: Record<string, number> = {
      '2026-01-01': 600,
      '2026-01-02': 605,
      '2026-01-03': 610,
    };

    // 欲查詢 2026-01-01 到 2026-01-05
    const missing = findMissingDateRanges(
      '2026-01-01',
      '2026-01-05',
      cachedPrices
    );

    expect(missing).toEqual({
      startDate: '2026-01-04',
      endDate: '2026-01-05',
    });
  });

  it('若本地快取完全覆蓋目標區間，應回傳 null 避免不必要的網路請求', () => {
    const cachedPrices: Record<string, number> = {
      '2026-01-01': 600,
      '2026-01-02': 605,
      '2026-01-03': 610,
    };

    const missing = findMissingDateRanges(
      '2026-01-01',
      '2026-01-03',
      cachedPrices
    );

    expect(missing).toBeNull();
  });

  it('合併新舊歷史行情時，新數據應無損覆蓋或追加進字典', () => {
    const existing = { '2026-01-01': 600, '2026-01-02': 605 };
    const incoming = { '2026-01-02': 608, '2026-01-03': 612 };

    const merged = mergeHistoricalPrices(existing, incoming);
    expect(merged).toEqual({
      '2026-01-01': 600,
      '2026-01-02': 608,
      '2026-01-03': 612,
    });
  });
});
