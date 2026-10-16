// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
const {
  getBackfillGlobalStatus,
  resetBackfillStateForTest,
} = require('../../scripts/market-sync/backfill-full-market-history.cjs');
const {
  runTwDateDrivenBackfill,
} = require('../../scripts/market-sync/backfill-tw-history-web.cjs');

describe('Ticket 06: 雙軌回補 UI 進度分離與看門狗尾盤自動補漏', () => {
  it('全域回補狀態應清晰分離 tw.progressPct、us.progressPct 與 globalProgressPct', () => {
    resetBackfillStateForTest();
    const status = getBackfillGlobalStatus();

    // 驗證存在分離的進度百分比屬性
    expect(status).toHaveProperty('globalProgressPct');
    expect(status.tw).toHaveProperty('progressPct');
    expect(status.us).toHaveProperty('progressPct');
    expect(typeof status.globalProgressPct).toBe('number');
  });

  it('台股回補在 250 天主循環若有少數天數失敗 (<=5 天) 應自動觸發尾盤補漏機制', async () => {
    // 驗證 runTwDateDrivenBackfill 支援自動尾盤重試
    let callCount = 0;
    const customFetchDayQuotes = vi.fn().mockImplementation(async (date: string) => {
      callCount++;
      // 第一次嘗試時 2026-01-05 模擬網路異常，尾盤重試時成功
      if (date === '2026-01-05' && callCount <= 3) {
        return { isTradingDay: true, cached: false, hasError: true, errorReason: 'Network Timeout' };
      }
      return {
        isTradingDay: true,
        cached: false,
        hasError: false,
        quotesCount: 100,
        chipsCount: 100,
        twseQuotesCount: 50,
        tpexQuotesCount: 50,
      };
    });

    const res = await runTwDateDrivenBackfill({
      days: 3,
      throttleMs: 0,
      datesOverride: ['2026-01-05', '2026-01-06', '2026-01-07'],
      customFetchDayQuotes,
      enableAutoCatchupRetry: true, // 尾盤補漏標誌
    });

    // 驗證尾盤重試後，原失敗的 2026-01-05 成功修復且 failedDates 被清空
    expect(res.failedDates.length).toBe(0);
    expect(customFetchDayQuotes).toHaveBeenCalledTimes(4); // 3天 + 1次尾盤重試
  });
});
