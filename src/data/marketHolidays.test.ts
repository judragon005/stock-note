import { describe, it, expect } from 'vitest';
import data from './market-holidays.json';

describe('Ticket 01: market-holidays.json SSOT 字典架構驗證', () => {
  it('1. market-holidays.json 必須為合法資料物件且含有 TW 與 US', () => {
    expect(data).toHaveProperty('TW');
    expect(data).toHaveProperty('US');
  });

  it('2. TW 必須包含修法恢復節日與歷史颱風停市日', () => {
    const tw = data.TW as Record<string, string>;

    expect(tw['2025-10-24']).toBe('光復節補假');
    expect(tw['2025-12-25']).toBe('行憲紀念日');
    expect(tw['2026-07-10']).toBe('巴威颱風停市');
    expect(tw['2026-09-28']).toBe('教師節');
  });

  it('3. 所有日期鍵必須為標準 YYYY-MM-DD 格式，且原因不得為空', () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    for (const market of ['TW', 'US'] as const) {
      const holidays = data[market] as Record<string, string>;
      expect(Object.keys(holidays).length).toBeGreaterThan(50);
      for (const [dateStr, reason] of Object.entries(holidays)) {
        expect(dateStr).toMatch(dateRegex);
        expect(typeof reason).toBe('string');
        expect(reason.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('4. US 必須包含感恩節，且 EARLY_CLOSE 包含黑色星期五半日市', () => {
    const us = data.US as Record<string, string>;
    const earlyClose = data.EARLY_CLOSE.US as Record<string, string>;

    expect(us['2026-06-19']).toContain('六月節');
    expect(us['2026-11-26']).toContain('感恩節');
    expect(earlyClose['2026-11-27']).toContain('半日市');
  });
});
