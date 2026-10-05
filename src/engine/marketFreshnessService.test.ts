import { describe, it, expect } from 'vitest';

describe('Ticket 01 (Seam 1): 市場新鮮度領域服務 marketFreshnessService', () => {
  it('1. 應正確計算台股 (TW) 平日盤中、盤後與週末之錨定交易日', async () => {
    // @ts-expect-error cjs import
    const { getMarketAnchorDate } = await import('../../scripts/market-sync/market-freshness-service.cjs');

    // 2026-10-02 (週五) 14:00 台北時間 (尚未 15:00 結算，回傳前一日 2026-10-01)
    const twBeforeClose = new Date('2026-10-02T14:00:00+08:00');
    expect(getMarketAnchorDate('TW', twBeforeClose)).toBe('2026-10-01');

    // 2026-10-02 (週五) 15:30 台北時間 (已過 15:00 結算，回傳當日 2026-10-02)
    const twAfterClose = new Date('2026-10-02T15:30:00+08:00');
    expect(getMarketAnchorDate('TW', twAfterClose)).toBe('2026-10-02');

    // 2026-10-03 (週六) 10:00 台北時間 (週末，應回退至週五 2026-10-02)
    const twSaturday = new Date('2026-10-03T10:00:00+08:00');
    expect(getMarketAnchorDate('TW', twSaturday)).toBe('2026-10-02');

    // 2026-10-04 (週日) 20:00 台北時間 (週末，應回退至週五 2026-10-02)
    const twSunday = new Date('2026-10-04T20:00:00+08:00');
    expect(getMarketAnchorDate('TW', twSunday)).toBe('2026-10-02');

    // 2026-10-05 (週一) 10:00 台北時間 (尚未 15:00 結算，應回退 3 天至上週五 2026-10-02，Spec 0165)
    const twMondayBeforeClose = new Date('2026-10-05T10:00:00+08:00');
    expect(getMarketAnchorDate('TW', twMondayBeforeClose)).toBe('2026-10-02');

    // 2026-10-05 (週一) 15:30 台北時間 (已過 15:00 結算，應回傳當日 2026-10-05)
    const twMondayAfterClose = new Date('2026-10-05T15:30:00+08:00');
    expect(getMarketAnchorDate('TW', twMondayAfterClose)).toBe('2026-10-05');
  });

  it('2. 應正確計算美股 (US) 平日盤中、盤後與週末之錨定交易日', async () => {
    // @ts-expect-error cjs import
    const { getMarketAnchorDate } = await import('../../scripts/market-sync/market-freshness-service.cjs');

    // 2026-10-02 (週五) 12:00 紐約時間 (尚未 17:00 結算，回傳前一日 2026-10-01)
    const usBeforeClose = new Date('2026-10-02T12:00:00-04:00');
    expect(getMarketAnchorDate('US', usBeforeClose)).toBe('2026-10-01');

    // 2026-10-02 (週五) 18:00 紐約時間 (已結算，回傳當日 2026-10-02)
    const usAfterClose = new Date('2026-10-02T18:00:00-04:00');
    expect(getMarketAnchorDate('US', usAfterClose)).toBe('2026-10-02');

    // 2026-10-04 (週日) 14:00 紐約時間 (週末，應回退至週五 2026-10-02)
    const usSunday = new Date('2026-10-04T14:00:00-04:00');
    expect(getMarketAnchorDate('US', usSunday)).toBe('2026-10-02');

    // 2026-10-05 (週一) 12:00 紐約時間 (尚未 17:00 結算，應回退 3 天至上週五 2026-10-02，Spec 0165)
    const usMondayBeforeClose = new Date('2026-10-05T12:00:00-04:00');
    expect(getMarketAnchorDate('US', usMondayBeforeClose)).toBe('2026-10-02');

    // 2026-10-05 (週一) 18:00 紐約時間 (已結算，應回傳當日 2026-10-05)
    const usMondayAfterClose = new Date('2026-10-05T18:00:00-04:00');
    expect(getMarketAnchorDate('US', usMondayAfterClose)).toBe('2026-10-05');
  });

  it('3. 應能檢驗資料庫陳舊度並回傳標準結構化狀態', async () => {
    // @ts-expect-error cjs import
    const { checkMarketFreshness } = await import('../../scripts/market-sync/market-freshness-service.cjs');

    // 建立 Mock Database 模擬查詢
    const mockDb = {
      prepare: (sql: string) => ({
        get: () => {
          if (sql.includes('0050')) {
            return { maxDate: '2026-10-01' };
          }
          if (sql.includes('SPY')) {
            return { maxDate: '2026-10-02' };
          }
          return null;
        },
      }),
    };

    // 假設基準時間是 2026-10-02 盤後
    const now = new Date('2026-10-02T16:00:00+08:00');
    const result = checkMarketFreshness(mockDb, now);

    expect(result).toBeDefined();
    expect(result.tw).toBeDefined();
    expect(result.tw.latestDate).toBe('2026-10-01');
    expect(result.tw.anchorDate).toBe('2026-10-02');
    expect(result.tw.isStale).toBe(true);

    expect(result.us).toBeDefined();
    expect(result.us.latestDate).toBe('2026-10-02');
  });

  it('4. 當資料庫為空庫或查無資料時，isStale 應為 false 且容錯處理', async () => {
    // @ts-expect-error cjs import
    const { checkMarketFreshness } = await import('../../scripts/market-sync/market-freshness-service.cjs');

    const emptyDb = {
      prepare: () => ({
        get: () => null,
      }),
    };

    const now = new Date('2026-10-02T16:00:00+08:00');
    const result = checkMarketFreshness(emptyDb, now);

    expect(result.tw.latestDate).toBeNull();
    expect(result.tw.isStale).toBe(false);
    expect(result.us.latestDate).toBeNull();
    expect(result.us.isStale).toBe(false);
  });
});
