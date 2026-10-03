import { describe, it, expect } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

describe('Ticket 05 - 歷史籌碼斷層回補引擎 (Spec 0163)', () => {
  it('1. generateTradingDaysList 應精確排除週末與國定假日', () => {
    const { generateTradingDaysList } = require('../../scripts/market-sync/backfill-historical-chips-gap.cjs');
    expect(typeof generateTradingDaysList).toBe('function');

    // 測試 2026-09-21 (週一) 至 2026-09-27 (週日)，其中 2026-09-25 為中秋節
    const days = generateTradingDaysList('2026-09-21', '2026-09-27');
    expect(days).toContain('2026-09-21');
    expect(days).toContain('2026-09-22');
    expect(days).toContain('2026-09-23');
    expect(days).toContain('2026-09-24');
    // 國定假日與週末排除
    expect(days).not.toContain('2026-09-25'); // 中秋節
    expect(days).not.toContain('2026-09-26'); // 週六
    expect(days).not.toContain('2026-09-27'); // 週日
  });
});
