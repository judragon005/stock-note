import { describe, it, expect } from 'vitest';
import {
  buildTdccDistribution,
  buildMonthlyRevenue,
  buildInstitutionalFlow,
} from './aiForceMarketAssembly';

describe('T10: aiForceMarketAssembly — 雙市場與美股微觀結構組裝子模組', () => {
  it('美股 buildInstitutionalFlow 應回傳 isUsMarket=true 與微觀量價動能評分且零法人偽數據', () => {
    const candles = Array.from({ length: 25 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      open: 100 + i,
      high: 102 + i,
      low: 99 + i,
      close: 101 + i,
      volume: 1_000_000 + i * 50_000,
    }));

    const flow = buildInstitutionalFlow(candles, undefined, 'US');
    expect(flow.isUsMarket).toBe(true);
    expect(flow.history).toEqual([]);
    expect(flow.usMicrostructure?.score).toBeGreaterThanOrEqual(0);
    expect(flow.usMicrostructure?.score).toBeLessThanOrEqual(100);
  });

  it('美股 buildTdccDistribution 有 13F 數據時應標記軋空警戒或機構控盤', () => {
    const tdcc = buildTdccDistribution(undefined, 'US', 'GME', {
      institutionalRatio: 72,
      shortFloatRatio: 18,
      asOfQuarterText: '2026 Q3',
    });
    expect(tdcc.isUsMarket).toBe(true);
    expect(tdcc.isEmpty).toBe(false);
    expect(tdcc.concentrationBadge).toContain('軋空警戒');
  });

  it('美股 buildMonthlyRevenue 有 10-Q/10-K 季報時應產出 USD 季營收序列', () => {
    const rev = buildMonthlyRevenue('NVDA', 'NVIDIA', 'US', undefined, undefined, {
      quarterlyFinancials: [
        { year: 2025, quarter: 2, revenue: 30_000_000_000 },
        { year: 2026, quarter: 2, revenue: 45_000_000_000 },
      ],
    });
    expect(rev.isUsMarket).toBe(true);
    expect(rev.isQuarterly).toBe(true);
    expect(rev.currency).toBe('USD');
    expect(rev.latestRevenueText).toBe('$45.00B');
  });
});
